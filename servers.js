const express = require('express')
const chalk = require('chalk')
const http = require('http')
const { WebSocketServer } = require('ws')
const { db } = require('./lib/database')

const app = express()
const PORT = global.serverPort || process.env.PORT || 3000
const server = http.createServer(app)

// =============================================
//  WebSocket for QR / Pairing / Status
// =============================================
const wss = new WebSocketServer({ server })
global.webClients = new Set()

wss.on('connection', (ws) => {
  global.webClients.add(ws)
  console.log(chalk.gray(`[WS] Client connected (${global.webClients.size} total)`))

  // Send current status immediately
  const botConnected = !!(global.conn && global.conn.user)
  ws.send(JSON.stringify({
    type: botConnected ? 'connected' : 'waiting',
    user: botConnected ? { name: global.conn.user.name, jid: global.conn.user.id } : null,
  }))

  // Send last QR image if available
  if (global.lastQRImage) ws.send(JSON.stringify({ type: 'qr', qr: global.lastQRImage }))

  // Handle pairing code request from web
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data)

      // === Main bot pairing ===
      if (msg.type === 'pairing' && msg.phone) {
        const cleanNumber = msg.phone.replace(/\D/g, '')
        if (!cleanNumber || cleanNumber.length < 10) {
          ws.send(JSON.stringify({ type: 'error', message: 'Nomor tidak valid' }))
          return
        }
        try {
          const pairingName = process.env.PAIRING_NAME || 'HUTAOBOT'
          let code = await global.conn.requestPairingCode(cleanNumber, pairingName)
          code = code?.match(/.{1,4}/g)?.join('-') || code
          ws.send(JSON.stringify({ type: 'pairing_code', code, name: pairingName }))
          console.log(chalk.green(`[WEB] Pairing code generated for ${cleanNumber}: ${code}`))
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: 'Gagal generate pairing code: ' + e.message }))
        }
      }

      // === Jadibot: check existing session on page load ===
      if (msg.type === 'jadibot_check' && msg.token) {
        const session = global.jadibotSessions?.[msg.token]
        if (session && session.conn?.user) {
          // Session exists and connected — send status
          session.ws = ws  // re-attach WS
          ws.send(JSON.stringify({
            type: 'jadibot_connected',
            user: { name: session.conn.user?.name, jid: session.conn.user?.id },
          }))
        } else if (session && !session.conn?.user) {
          session.ws = ws
          ws.send(JSON.stringify({ type: 'jadibot_status', status: 'connecting' }))
        }
        // If no session, token page handles it normally
      }

      // === Jadibot: start sub-bot via pairing ===
      if (msg.type === 'jadibot_start' && msg.token) {
        const tokenData = global.jadibotTokens?.[msg.token]
        if (!tokenData) {
          ws.send(JSON.stringify({ type: 'error', message: 'Token expired atau tidak valid' }))
          return
        }

        const phone = msg.phone?.replace(/\D/g, '')
        const useQR = msg.mode === 'qr'

        if (!useQR && (!phone || phone.length < 10)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Nomor tidak valid' }))
          return
        }

        // Check if number already connected
        if (phone && global.conns?.find(c => c.user?.id?.split('@')[0] === phone)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Nomor sudah terhubung sebagai bot. Ketik .stopbot untuk stop dulu.' }))
          return
        }

        try {
          await startJadibot(ws, msg.token, phone, useQR, tokenData)
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: 'Gagal memulai jadibot: ' + e.message }))
        }
      }
    } catch { }
  })

  ws.on('close', () => {
    global.webClients.delete(ws)
  })
})

// =============================================
//  Jadibot Session Map  (token -> { conn, ws, ... })
// =============================================
if (!global.jadibotSessions) global.jadibotSessions = {}

// =============================================
//  Jadibot Sub-Bot Creator
// =============================================
async function startJadibot(ws, token, phone, useQR, tokenData) {
  const path = require('path')
  const fs = require('fs')

  // Dynamic import wbssocket (ESM)
  const {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    Browsers
  } = await import('wbssocket')

  const NodeCache = require('node-cache')
  const pino = require('pino')
  const QRCode = require('qrcode')

  const sessionId = phone || ('qr_' + Date.now())
  const jadibotDir = path.join(__dirname, 'jadibot', sessionId)
  if (!fs.existsSync(jadibotDir)) fs.mkdirSync(jadibotDir, { recursive: true })

  const logger = pino({ level: 'silent' })
  const msgRetryCounterCache = new NodeCache()

  // Helper: send to current WS client (may change on refresh)
  function sendWS(data) {
    const session = global.jadibotSessions[token]
    const sock = session?.ws
    try { sock?.send(JSON.stringify(data)) } catch { }
  }

  // Create or reconnect sub-bot
  async function createConnection() {
    const { state, saveCreds } = await useMultiFileAuthState(jadibotDir)
    const {
      version
    } = await fetchLatestBaileysVersion();
    console.log(chalk.bgGreen.black(' Version: '), chalk.white.bold(version))

    const socketOpts = {
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      generateHighQualityLinkPreview: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.ubuntu('Chrome'),
      version,
      logger,
      msgRetryCounterCache,
      getMessage: async () => undefined,
    }

    const subConn = global.makeWASocketExtended(socketOpts)
    let qrAttempts = 0
    const maxQR = 3

    // Save session reference
    global.jadibotSessions[token] = {
      conn: subConn,
      ws,
      token,
      phone,
      sessionId,
      jadibotDir,
      tokenData,
      useQR,
    }

    sendWS({ type: 'jadibot_status', status: 'connecting' })

    subConn.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // QR mode
      if (qr && useQR) {
        qrAttempts++
        if (qrAttempts > maxQR) {
          sendWS({ type: 'error', message: 'QR expired! Waktu habis.' })
          try { subConn.ws.close() } catch { }
          return
        }
        try {
          const qrImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
          sendWS({ type: 'jadibot_qr', qr: qrImage, attempt: qrAttempts, max: maxQR })
        } catch { }
      }

      // Pairing code mode
      if (qr && !useQR && phone && !subConn._pairingRequested) {
        subConn._pairingRequested = true
        try {
          const pairingName = process.env.PAIRING_NAME || 'HUTAOBOT'
          let code = await subConn.requestPairingCode(phone, pairingName)
          code = code?.match(/.{1,4}/g)?.join('-') || code
          sendWS({ type: 'jadibot_pairing', code, name: pairingName })
        } catch (e) {
          sendWS({ type: 'error', message: 'Gagal generate pairing code: ' + e.message })
        }
      }

      if (connection === 'open') {
        // Delete token from pending — used successfully
        delete global.jadibotTokens[token]

        // Bind handlers
        const handler = require('./handler')

        // Remove old handlers if any (for reconnect)
        if (subConn.handler) subConn.ev.off('messages.upsert', subConn.handler)
        if (subConn.participantsUpdate) subConn.ev.off('group-participants.update', subConn.participantsUpdate)
        if (subConn.rejectOnCall) subConn.ev.off('call', subConn.rejectOnCall)
        if (subConn.onDelete) subConn.ev.off('message.delete', subConn.onDelete)

        subConn.handler = handler.handler.bind(subConn)
        subConn.participantsUpdate = handler.participantsUpdate.bind(subConn)
        subConn.rejectOnCall = handler.rejectOnCall.bind(subConn)
        subConn.onDelete = handler.delete.bind(subConn)
        subConn.prefix = global.prefix
        subConn.requester = tokenData.requester

        subConn.ev.on('messages.upsert', subConn.handler)
        subConn.ev.on('group-participants.update', subConn.participantsUpdate)
        subConn.ev.on('call', subConn.rejectOnCall)
        subConn.ev.on('message.delete', subConn.onDelete)

        // Add to global connections
        const existIdx = global.conns.findIndex(c => c.user?.id?.split('@')[0] === subConn.user?.id?.split('@')[0])
        if (existIdx >= 0) global.conns[existIdx] = subConn
        else global.conns.push(subConn)

        // Update session
        if (global.jadibotSessions[token]) {
          global.jadibotSessions[token].conn = subConn
        }

        sendWS({
          type: 'jadibot_connected',
          user: { name: subConn.user?.name, jid: subConn.user?.id },
        })

        console.log(chalk.green(`[JADIBOT] ✅ ${subConn.user?.name} (${subConn.user?.id}) connected — requested by ${tokenData.requester}`))

        // Notify requester in WA
        try {
          const botJid = subConn.user?.id || subConn.user?.id
          const botNumber = botJid?.split('@')[0] || phone || sessionId
          const botName = subConn.user?.name || 'Bot'
          const mentionList = botJid ? [botJid] : []
          await global.conn.sendMessage(tokenData.chat || tokenData.requester, {
            text: `✅ *Jadibot berhasil terhubung!*\n\n📱 Nomor: @${botNumber}\n👤 Nama: ${botName}\n\nKetik *.stopbot* pada nomor bot untuk mematikan.`,
            mentions: mentionList,
          })
        } catch (e) {
          console.log(chalk.yellow('[JADIBOT] Notify error:', e.message))
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut &&
          statusCode !== DisconnectReason.badSession &&
          !subConn.isStopped

        if (shouldReconnect) {
          console.log(chalk.yellow(`[JADIBOT] 🔄 ${sessionId} reconnecting... (${statusCode})`))
          sendWS({ type: 'jadibot_status', status: 'reconnecting' })
          // Auto-restart: create new connection with same session
          setTimeout(() => createConnection(), 2000)
        } else {
          // Remove from conns
          const subJid = subConn.user?.id?.split('@')[0]
          const idx = global.conns.findIndex(c => c.user?.id?.split('@')[0] === subJid)
          if (idx >= 0) global.conns.splice(idx, 1)

          // Auto-delete session ONLY on real logout (401)
          if (statusCode === DisconnectReason.loggedOut) {
            console.log(chalk.red(`[JADIBOT] Menghapus session ${sessionId}...`))
            try { fs.rmSync(jadibotDir, { recursive: true, force: true }) } catch { }
            console.log(chalk.green(`[JADIBOT] ✅ Session ${sessionId} dihapus`))
          }

          delete global.jadibotSessions[token]
          sendWS({ type: 'jadibot_disconnected', reason: statusCode })
          console.log(chalk.yellow(`[JADIBOT] ❌ ${subJid || sessionId} disconnected (${statusCode})`))

          // Notify requester in WA
          try {
            await global.conn.sendMessage(tokenData.chat || tokenData.requester, {
              text: `❌ *Jadibot terputus!*\n\nNomor: ${subJid || sessionId}\nAlasan: ${statusCode === 401 ? 'Logged out' : 'Bad session'}\n\nKirim *.jadibot* untuk connect ulang.`,
            })
          } catch { }
        }
      }
    })

    subConn.ev.on('creds.update', saveCreds)
    return subConn
  }

  await createConnection()
}

// Broadcast to all web clients
global.broadcastWS = (data) => {
  const payload = JSON.stringify(data)
  for (const ws of global.webClients) {
    try { ws.send(payload) } catch { }
  }
}

app.use(express.json())

// =============================================
//  Jadibot Web Page
// =============================================
app.get('/jadibot/:token', (req, res) => {
  const token = req.params.token
  const tokenData = global.jadibotTokens?.[token]
  if (!tokenData) {
    return res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Token Expired</title>
<style>body{font-family:Inter,sans-serif;background:#0a0a0f;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#13131a;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:40px;text-align:center;max-width:400px}
h2{color:#f87171;margin-bottom:8px}p{color:#888}</style></head>
<body><div class="card"><h2>❌ Token Expired</h2><p>Link sudah expired atau tidak valid.<br>Kirim <code>.jadibot</code> lagi untuk mendapatkan link baru.</p></div></body></html>`)
  }

  const html = require('fs').readFileSync(require('path').join(__dirname, 'views', 'jadibot.html'), 'utf-8')
  res.send(html.replace('%%TOKEN%%', token))
})

// =============================================
//  Web QR / Pairing Page (Main Bot)
// =============================================
app.get('/scan', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'views', 'scan.html'))
})

// =============================================
//  Web Dashboard
// =============================================
app.get('/dashboard', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'views', 'dashboard.html'))
})

app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await db.user.count()
    const registeredUsers = await db.user.count({ where: { registered: true } })
    const bannedUsers = await db.user.count({ where: { banned: true } })
    const premiumUsers = await db.user.count({ where: { premium: true } })
    
    const botConnected = !!(global.conn && global.conn.user)
    const uptime = process.uptime()
    const memory = process.memoryUsage()
    
    res.json({
      botStatus: botConnected ? 'Online' : 'Offline',
      botName: botConnected ? global.conn.user.name : '-',
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.floor(memory.rss / 1024 / 1024),
        heapUsed: Math.floor(memory.heapUsed / 1024 / 1024)
      },
      users: {
        total: totalUsers,
        registered: registeredUsers,
        banned: bannedUsers,
        premium: premiumUsers
      },
      plugins: Object.keys(global.plugins || {}).length
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// =============================================
//  Health & Status Endpoints
// =============================================

app.get('/', (req, res) => {
  const botConnected = !!(global.conn && global.conn.user)
  const uptime = process.uptime()

  res.json({
    status: botConnected ? 'active' : 'error',
    bot: botConnected
      ? {
        name: global.conn.user.name || '',
        jid: global.conn.user.id || '',
        uptime: Math.floor(uptime),
      }
      : null,
    message: botConnected
      ? 'Bot is running'
      : 'Bot is not connected',
    plugins: Object.keys(global.plugins || {}).length,
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (req, res) => {
  const botConnected = !!(global.conn && global.conn.user)
  res.status(botConnected ? 200 : 503).json({
    status: botConnected ? 'healthy' : 'unhealthy',
    uptime: Math.floor(process.uptime()),
  })
})

app.get('/plugins', (req, res) => {
  const plugins = global.plugins || {}
  const list = {}

  for (const [key, plugin] of Object.entries(plugins)) {
    if (!plugin) continue
    const category = key.split('/')[0] || 'uncategorized'
    if (!list[category]) list[category] = []
    list[category].push({
      name: plugin.name || key,
      command: plugin.command || [],
      tags: plugin.tags || [],
      disabled: plugin.disabled || false,
    })
  }

  res.json({
    total: Object.keys(plugins).length,
    categories: list,
  })
})

// =============================================
//  Start Server + Cloudflare Tunnel
// =============================================

function startServer() {
  server.listen(PORT, () => {
    console.log(chalk.green(`[SERVER] ✅ Running on http://localhost:${PORT}`))
    console.log(chalk.green(`[SERVER] 📱 QR/Pairing: http://localhost:${PORT}/scan`))

    // Auto-start Cloudflare Tunnel
    startTunnel()
  })
}

function startTunnel() {
  const { spawn } = require('child_process')
  const path = require('path')
  const fs = require('fs')

  // Look for cloudflared binary
  const localBin = path.join(__dirname, 'cloudflared')
  const bin = fs.existsSync(localBin) ? localBin : 'cloudflared'

  try {
    const tunnel = spawn(bin, ['tunnel', '--url', `http://localhost:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    global.tunnelProcess = tunnel

    let urlExtracted = false

    const extractUrl = (data) => {
      const output = data.toString()
      // Cloudflared prints URL to stderr
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
      if (match && !urlExtracted) {
        urlExtracted = true
        global.publicURL = match[0]
        console.log(chalk.cyan('═'.repeat(50)))
        console.log(chalk.cyan.bold(`[TUNNEL] 🌐 Public URL: ${global.publicURL}`))
        console.log(chalk.cyan(`[TUNNEL] 📱 Scan: ${global.publicURL}/scan`))
        console.log(chalk.cyan('═'.repeat(50)))
      }
    }

    tunnel.stdout.on('data', extractUrl)
    tunnel.stderr.on('data', extractUrl)

    tunnel.on('error', (err) => {
      console.log(chalk.yellow(`[TUNNEL] ⚠ Cloudflared not found. Install: curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ./cloudflared && chmod +x ./cloudflared`))
    })

    tunnel.on('close', (code) => {
      if (code !== null && code !== 0) {
        console.log(chalk.yellow(`[TUNNEL] Tunnel closed (code: ${code})`))
      }
      global.publicURL = null
      global.tunnelProcess = null
    })

    // Cleanup on exit
    process.on('SIGINT', () => { tunnel.kill(); process.exit() })
    process.on('SIGTERM', () => { tunnel.kill(); process.exit() })

  } catch (e) {
    console.log(chalk.yellow(`[TUNNEL] ⚠ Could not start tunnel: ${e.message}`))
  }
}

// Start immediately when required
startServer()

module.exports = { app, server, wss }
