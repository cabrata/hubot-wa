; (async () => {
    // =============================================
    //  LOAD CONFIG & SERVER
    // =============================================
    require('./config')
    require('./servers') // Start HTTP server immediately

    // wbssocket is ESM — use dynamic import()
    const {
        default: makeWASocketBase,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore,
        Browsers,
        jidDecode,
        getContentType,
        downloadContentFromMessage,
    } = await import('wbssocket')

    const NodeCache = require('node-cache')
    const pino = require('pino')
    const ws = require('ws')
    const path = require('path')
    const fs = require('fs')
    const chalk = require('chalk')
    const syntaxError = require('syntax-error')
    const readline = require('readline')

    const { getMessage } = require('./lib/store')
    const { patchSendMessage } = require('./lib/connection')

    const msgRetryCounterCache = new NodeCache()
    const logger = pino({ level: 'silent' })

    const usePairing = process.argv.includes('--code') || process.argv.includes('--pairing')

    // Custom pairing name — tampil di notifikasi WA
    const pairingName = process.env.PAIRING_NAME || 'HUTAOBOT'

    // =============================================
    //  SIMPLE.JS — Extended socket (inline, avoids ESM import issues in CJS files)
    // =============================================
    global.makeWASocketExtended = function (opts) {
        const conn = makeWASocketBase(opts)

        conn.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                const decoded = jidDecode(jid) || {}
                return (decoded.user && decoded.server && `${decoded.user}@${decoded.server}`) || jid
            }
            return jid
        }

        conn.getName = async (jid) => {
            if (!jid) return ''
            const id = conn.decodeJid(typeof jid === 'string' ? jid : String(jid))
            if (typeof id !== 'string') return ''
            if (id.endsWith('@g.us')) {
                try {
                    const metadata = await conn.groupMetadata(id)
                    return metadata.subject || ''
                } catch { return '' }
            }
            const name = id === conn.decodeJid(conn.user?.id)
                ? conn.user?.name
                : (conn.contacts?.[id]?.name || conn.contacts?.[id]?.verifiedName || '')
            return name || id.split('@')[0]
        }

        conn.groupMeta = async (jid) => {
            try { return await conn.groupMetadata(jid) }
            catch { return { participants: [] } }
        }

        conn.reply = async (jid, text, quoted, options = {}) => {
            return conn.sendMessage(jid, { text, ...options }, { quoted })
        }

        conn.copyNForward = async (jid, msg, forceForward = false, options = {}) => {
            const content = msg.message
            if (!content) return
            const mtype = getContentType(content)
            const m = mtype === 'conversation'
                ? { text: content.conversation }
                : { [mtype]: content[mtype] }
            return conn.sendMessage(jid, m, { ...options })
        }

        conn.edit = (chatId, text, key) => conn.sendMessage(chatId, { edit: key.key, text });

        conn.downloadMediaMessage = async (msg) => {
            const mtype = getContentType(msg.message)
            const media = msg.message[mtype]
            const stream = await downloadContentFromMessage(media, mtype.replace(/Message/, ''))
            const buffer = []
            for await (const chunk of stream) { buffer.push(chunk) }
            return Buffer.concat(buffer)
        }

        conn.parseMention = (text) => {
            return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net')
        }

        // Patch sendMessage untuk auto-generate waveform PTT
        patchSendMessage(conn)

        return conn
    }

    // Serialize message — exposed globally for handler.js
    // Handles LID (Linked ID) resolution for group participants
    global.smsg = async function smsg(conn, msg) {
        if (!msg) return msg

        // Handle edited messages (protocolMessage type 14)
        if (msg.message?.protocolMessage?.type === 14) {
            const edited = msg.message.protocolMessage.editedMessage
            if (edited) {
                msg.message = edited
            }
        }

        if (!msg.message) return msg

        const m = {}
        m.key = msg.key
        m.id = msg.key.id
        m.chat = conn.decodeJid(msg.key.remoteJid)
        m.fromMe = msg.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.pushName = msg.pushName || ''
        m.message = msg.message
        m.msg = msg

        // ========== LID RESOLUTION ==========
        // In newer WA, group participants may use @lid format instead of @s.whatsapp.net
        // We need group metadata to resolve LID -> real phone number
        let groupMetadata = null
        if (m.isGroup) {
            try { groupMetadata = await conn.groupMeta(m.chat) } catch { }
        }
        m.groupMetadata = groupMetadata

        // Helper: resolve LID to real JID using group metadata
        function resolveLid(lidJid) {
            if (!lidJid || !lidJid.includes('@lid') || !groupMetadata?.participants) return lidJid
            const participant = groupMetadata.participants.find(
                (p) => p.id === lidJid || p.lid === lidJid
            )
            if (participant?.phoneNumber) return participant.phoneNumber
            if (participant?.id && !participant.id.includes('@lid')) return participant.id
            return lidJid
        }

        // Get raw sender (may be LID)
        const rawSender = conn.decodeJid(
            m.fromMe ? conn.user.id
                : m.isGroup ? msg.key.participant
                    : m.chat
        )

        // Use Alt fields first (wbssocket provides these as resolved JIDs)
        // Then try LID resolution via group metadata
        m.sender = msg.key.remoteJidAlt
            || msg.key.participantAlt
            || (rawSender?.includes('@lid') && m.isGroup ? resolveLid(rawSender) : rawSender)

        const mtype = getContentType(msg.message)
        m.mtype = mtype

        if (mtype === 'conversation') m.text = msg.message.conversation
        else if (mtype === 'extendedTextMessage') m.text = msg.message.extendedTextMessage.text
        else if (mtype === 'imageMessage') m.text = msg.message.imageMessage.caption || ''
        else if (mtype === 'videoMessage') m.text = msg.message.videoMessage.caption || ''
        else if (mtype === 'templateButtonReplyMessage') m.text = msg.message.templateButtonReplyMessage.selectedId
        else if (mtype === 'buttonsResponseMessage') m.text = msg.message.buttonsResponseMessage.selectedButtonId
        else if (mtype === 'listResponseMessage') m.text = msg.message.listResponseMessage.singleSelectReply.selectedRowId
        else m.text = ''

        // ========== QUOTED MESSAGE with LID resolution ==========
        const quoted = msg.message[mtype]?.contextInfo?.quotedMessage
        if (quoted) {
            const rawQuotedSender = conn.decodeJid(msg.message[mtype].contextInfo.participant)
            const resolvedQuotedSender = rawQuotedSender?.includes('@lid') && m.isGroup
                ? resolveLid(rawQuotedSender)
                : rawQuotedSender

            m.quoted = {
                key: {
                    remoteJid: m.chat,
                    fromMe: resolvedQuotedSender === conn.decodeJid(conn.user.id),
                    id: msg.message[mtype].contextInfo.stanzaId,
                    participant: msg.message[mtype].contextInfo.participant,
                },
                message: quoted,
                mtype: getContentType(quoted),
                sender: resolvedQuotedSender,
                pushName: msg.message[mtype].contextInfo.participant
            }
            m.quoted.mimetype = m.quoted.message[m.quoted.mtype].mimetype || ''
            m.quoted.download = async () => {
                return conn.downloadMediaMessage(m.quoted)
            }
            m.quoted.text = m.quoted.message[m.quoted.mtype].caption || m.quoted.message[m.quoted.mtype].text || ''
        } else {
            m.quoted = null
        }
        m.download = async () => {
            return conn.downloadMediaMessage(m)
        }

        // ========== MENTIONED JIDs — resolve LID ==========
        const rawMentions = msg.message[mtype]?.contextInfo?.mentionedJid || []
        m.mentionedJid = m.isGroup && groupMetadata?.participants
            ? rawMentions.map((jid) => jid.includes('@lid') ? resolveLid(jid) : jid)
            : rawMentions

        m.isBaileys = m.id.startsWith('BAE5') || m.id.startsWith('3EB0')

        m.reply = async (text, options = {}) => {
            if (typeof text === 'string') return conn.sendMessage(m.chat, { text, ...options }, { quoted: m.msg })
            return conn.sendMessage(m.chat, text, { quoted: m.msg, ...options })
        }

        m.react = async (emoji) => {
            return conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
        }

        return m
    }

    // =============================================
    //  AUTH STATE
    // =============================================
    const sessionDir = path.join(__dirname, 'sessions')
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const {
        version
    } = await fetchLatestBaileysVersion();
    // using version log
    console.log(chalk.bgGreen.black(' Version: '), chalk.white.bold(version))


    // =============================================
    //  CREATE CONNECTION
    // =============================================
    const socketOpts = {
        printQRInTerminal: !usePairing,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        version,
        generateHighQualityLinkPreview: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.ubuntu('Chrome'),
        logger,
        msgRetryCounterCache,
        getMessage: async (key) => getMessage(key),
    }

    global.conn = global.makeWASocketExtended(socketOpts)

    // =============================================
    //  PAIRING CODE MODE (with custom name)
    // =============================================
    if (usePairing && !global.conn.authState.creds.registered) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        const question = (q) => new Promise((resolve) => rl.question(q, resolve))

        const phoneNumber = await question(chalk.blueBright('Enter phone number with country code (e.g. 62xxx): '))
        rl.close()

        const cleanNumber = phoneNumber.replace(/\D/g, '')
        console.log(chalk.bgWhite.blue('Generating pairing code...'))

        let code = await global.conn.requestPairingCode(cleanNumber, pairingName)
        code = code?.match(/.{1,4}/g)?.join('-') || code
        console.log(chalk.bgGreen.black(' Pairing Code: '), chalk.white.bold(code))
        console.log(chalk.gray(`  Custom Name: ${pairingName}`))
    }

    // =============================================
    //  CONNECTION UPDATE HANDLER
    // =============================================
    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update

        // Broadcast QR to web clients (as base64 image)
        if (qr) {
            global.lastQR = qr
            try {
                const QRCode = require('qrcode')
                const qrImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
                global.lastQRImage = qrImage
                if (global.broadcastWS) global.broadcastWS({ type: 'qr', qr: qrImage })
            } catch (e) {
                console.error('[QR] Failed to generate QR image:', e.message)
                if (global.broadcastWS) global.broadcastWS({ type: 'qr', qr })
            }
        }

        if (connection === 'close') {
            global.lastQR = null
            const statusCode = lastDisconnect?.error?.output?.statusCode

            console.log(chalk.red(`[WA] Connection closed. Status: ${statusCode}`))
            if (global.broadcastWS) global.broadcastWS({ type: 'disconnected', statusCode })

            // Track consecutive 401 retries
            if (!global._401retries) global._401retries = 0

            if (statusCode === DisconnectReason.loggedOut) {
                global._401retries++
                console.log(chalk.yellow(`[WA] Status 401 — retry ${global._401retries}/5`))

                if (global._401retries < 5) {
                    // Try reconnecting (may be temporary auth refresh)
                    console.log(chalk.yellow('[WA] Reconnecting (mungkin auth refresh)...'))
                    setTimeout(() => global.reloadHandler(true), 3000)
                } else {
                    // 5 consecutive 401s — real logout
                    global._401retries = 0
                    console.log(chalk.red('[WA] 5x 401 berturut-turut — ini logout asli. Menghapus sessions...'))
                    try {
                        fs.rmSync(sessionDir, { recursive: true, force: true })
                        console.log(chalk.green('[WA] ✅ Folder sessions/ berhasil dihapus'))
                    } catch (e) {
                        console.error(chalk.red('[WA] Gagal hapus sessions:'), e.message)
                    }

                    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
                    rl.question(chalk.cyan('\n[WA] Mau nyalain ulang bot? (y/n): '), async (answer) => {
                        rl.close()
                        if (answer.trim().toLowerCase() === 'y') {
                            console.log(chalk.yellow('[WA] Restarting bot...'))
                            fs.mkdirSync(sessionDir, { recursive: true })
                            const { state: newState, saveCreds: newSaveCreds } = await useMultiFileAuthState(sessionDir)
                            socketOpts.auth = {
                                creds: newState.creds,
                                keys: makeCacheableSignalKeyStore(newState.keys, logger),
                            }
                            global.conn = global.makeWASocketExtended(socketOpts)
                            global.reloadHandler()
                            conn.credsUpdate = newSaveCreds.bind(conn)
                            conn.ev.on('creds.update', conn.credsUpdate)
                            console.log(chalk.green('[WA] Bot dimulai ulang! Scan QR atau buka /scan'))
                        } else {
                            console.log(chalk.gray('[WA] Bot dimatikan. Bye! 👋'))
                            process.exit(0)
                        }
                    })
                }
            } else {
                // Non-401 disconnect — always reconnect
                global._401retries = 0
                console.log(chalk.yellow('[WA] Reconnecting...'))
                global.reloadHandler(true)
            }
        }

        if (connection === 'open') {
            global._401retries = 0
            global.lastQR = null
            console.log(chalk.green(`[WA] ✅ Connected as ${global.conn.user?.name || 'Unknown'}`))
            global.timestamp.connect = new Date()
            if (global.broadcastWS) global.broadcastWS({
                type: 'connected',
                user: { name: global.conn.user?.name, jid: global.conn.user?.id },
            })
        }
    }

    // =============================================
    //  HANDLER RELOAD SYSTEM
    // =============================================
    let isFirstLoad = true

    function requireUncached(modulePath) {
        const resolved = require.resolve(modulePath)
        delete require.cache[resolved]
        return require(resolved)
    }

    global.reloadHandler = function (resetConnection) {
        const handler = requireUncached('./handler')

        if (resetConnection) {
            try { global.conn.ws.close() } catch { }
            global.conn = { ...global.conn, ...global.makeWASocketExtended(socketOpts) }
        }

        if (!isFirstLoad) {
            if (conn.handler) conn.ev.off('messages.upsert', conn.handler)
            if (conn.participantsUpdate) conn.ev.off('group-participants.update', conn.participantsUpdate)
            if (conn.onDelete) conn.ev.off('message.delete', conn.onDelete)
            if (conn.connectionUpdate) conn.ev.off('connection.update', conn.connectionUpdate)
            if (conn.rejectOnCall) conn.ev.off('call', conn.rejectOnCall)
            if (conn.credsUpdate) conn.ev.off('creds.update', conn.credsUpdate)
            if (conn.presenceUpdate) conn.ev.off('presence.update', conn.presenceUpdate)
        }

        conn.welcome = global.welcomeMsg
        conn.bye = global.byeMsg
        conn.spromote = global.promoteMsg
        conn.sdemote = global.demoteMsg
        conn.prefix = global.prefix

        conn.handler = handler.handler.bind(conn)
        conn.participantsUpdate = handler.participantsUpdate.bind(conn)
        conn.rejectOnCall = handler.rejectOnCall.bind(conn)
        conn.onDelete = handler.delete.bind(conn)
        conn.connectionUpdate = connectionUpdate.bind(conn)
        conn.credsUpdate = saveCreds.bind(conn)
        if (handler.presenceUpdate) conn.presenceUpdate = handler.presenceUpdate.bind(conn)

        conn.ev.on('messages.upsert', conn.handler)
        conn.ev.on('group-participants.update', conn.participantsUpdate)
        conn.ev.on('message.delete', conn.onDelete)
        conn.ev.on('connection.update', conn.connectionUpdate)
        conn.ev.on('call', conn.rejectOnCall)
        conn.ev.on('creds.update', conn.credsUpdate)
        if (conn.presenceUpdate) conn.ev.on('presence.update', conn.presenceUpdate)

        isFirstLoad = false
        return true
    }

    // =============================================
    //  PLUGIN LOADER — Recursive Category Support
    // =============================================
    const pluginsDir = path.join(__dirname, 'plugins')
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true })

    const isJsFile = (f) => /\.js$/.test(f)
    global.plugins = {}

    function loadAllPlugins() {
        const categories = fs.readdirSync(pluginsDir).filter((f) => {
            return fs.statSync(path.join(pluginsDir, f)).isDirectory()
        })

        let loaded = 0
        let failed = 0

        for (const category of categories) {
            const categoryDir = path.join(pluginsDir, category)
            const files = fs.readdirSync(categoryDir).filter(isJsFile)

            for (const file of files) {
                const pluginKey = `${category}/${file}`
                const pluginPath = path.join(categoryDir, file)

                try {
                    global.plugins[pluginKey] = require(pluginPath)
                    loaded++
                } catch (e) {
                    console.error(chalk.red(`[PLUGIN] ❌ Failed to load ${pluginKey}:`), e.message)
                    delete global.plugins[pluginKey]
                    failed++
                }
            }
        }

        console.log(chalk.cyan(`[PLUGIN] ✅ Loaded ${loaded} plugins (${failed} failed)`))
        console.log(chalk.gray(`[PLUGIN] Categories: ${categories.join(', ')}`))
        console.log(chalk.gray(`[PLUGIN] Plugins: ${Object.keys(global.plugins).join(', ')}`))
    }

    loadAllPlugins()

    // =============================================
    //  PLUGIN AUTO-RELOAD (fs.watch recursive)
    // =============================================
    global.pluginWatcher = fs.watch(pluginsDir, { recursive: true }, (eventType, filename) => {
        if (!filename || !isJsFile(filename)) return

        const normalizedFilename = filename.replace(/\\/g, '/')
        const parts = normalizedFilename.split('/')
        if (parts.length !== 2) return

        const [category, file] = parts
        const pluginKey = `${category}/${file}`
        const pluginPath = path.join(pluginsDir, category, file)

        try {
            const resolved = require.resolve(pluginPath)
            if (resolved in require.cache) delete require.cache[resolved]
        } catch { }

        if (!fs.existsSync(pluginPath)) {
            console.log(chalk.yellow(`[PLUGIN] 🗑️ Removed: ${pluginKey}`))
            delete global.plugins[pluginKey]
            return
        }

        const code = fs.readFileSync(pluginPath, 'utf-8')
        const syntaxErr = syntaxError(code, pluginPath)
        if (syntaxErr) {
            console.error(chalk.red(`[PLUGIN] ❌ Syntax error in ${pluginKey}:`))
            console.error(chalk.red(syntaxErr))
            return
        }

        try {
            global.plugins[pluginKey] = require(pluginPath)
            console.log(chalk.green(`[PLUGIN] 🔄 Reloaded: ${pluginKey}`))
        } catch (e) {
            console.error(chalk.red(`[PLUGIN] ❌ Error loading ${pluginKey}:`), e.message)
            delete global.plugins[pluginKey]
        }

        global.plugins = Object.fromEntries(
            Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
        )
    })

    // =============================================
    //  START BOT
    // =============================================
    global.timestamp = { start: new Date() }
    global.reloadHandler()

    process.on('uncaughtException', (err) => {
        console.error(chalk.red('[UNCAUGHT]'), err)
    })
    process.on('unhandledRejection', (err) => {
        console.error(chalk.red('[UNHANDLED]'), err)
    })
})()
