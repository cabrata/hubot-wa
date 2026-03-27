const chalk = require('chalk')

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
const pad = (str, len) => String(str).padEnd(len).slice(0, len)
const truncate = (str, len) => str.length > len ? str.slice(0, len - 1) + '…' : str

function getTimestamp() {
    return new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
}

function formatUptime() {
    const s = Math.floor(process.uptime())
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
}

// ─────────────────────────────────────────────
//  COMMAND COUNTERS  (in-memory)
// ─────────────────────────────────────────────
const _stats = { total: 0, success: 0, error: 0 }

// ─────────────────────────────────────────────
//  MAIN PRINT
// ─────────────────────────────────────────────
module.exports = function print(m, conn) {
    try {
        // ── Raw values ──────────────────────────────
        const time        = getTimestamp()
        const sender      = m.sender?.split('@')[0] || '???'
        const pushName    = m.pushName || ''
        const isGroup     = !!m.isGroup
        const chatId      = m.chat?.split('@')[0] || ''
        const prefix      = m.usedPrefix  || ''
        const command     = m.command     || ''
        const fullCmd     = prefix + command
        const isError     = !!m.error
        const level       = m.user?.level || 0
        const isPrems     = m.user?.premium && Date.now() < Number(m.user.premium)
        const isMods      = m.user?.moderator || false
        const expGain     = m.exp || 0
        const limitUsed   = m.limit ? Number(m.limit) : 0
        const pluginFile  = m.plugin
            ? m.plugin.replace(/^plugins\//, '').replace(/\.js$/, '')
            : '—'

        // ── Counters ────────────────────────────────
        _stats.total++
        if (isError) _stats.error++; else _stats.success++

        // ── Role badge ──────────────────────────────
        let roleBadge
        if (isOwner) roleBadge = chalk.bgRed.black(' OWNER ')
        else if (isMods)   roleBadge = chalk.bgMagenta.black(' MOD ')
        else if (isPrems) roleBadge = chalk.bgYellow.black(' VIP ')
        else          roleBadge = chalk.bgGray.black(` Lv${pad(level, 2)} `)

        // ── Chat badge ──────────────────────────────
        const chatBadge = isGroup
            ? chalk.bgCyan.black(' GRP ')
            : chalk.bgGreen.black(' DM  ')

        // ── Status badge ────────────────────────────
        const statusBadge = isError
            ? chalk.bgRed.white(' ERR ')
            : chalk.bgGreenBright.black(' OK  ')

        // ── Command colour ──────────────────────────
        const cmdColour = isError ? chalk.redBright : chalk.greenBright

        // ── Sender display ──────────────────────────
        const senderDisplay = pushName
            ? `${chalk.white(truncate(pushName, 14))} ${chalk.gray('(' + sender + ')')}`
            : chalk.white(sender)

        // ── Chat display ────────────────────────────
        const chatDisplay = isGroup
            ? chalk.cyan(truncate(chatId, 18))
            : chalk.green('private')

        // ── Plugin path (dim) ───────────────────────
        const pluginDisplay = chalk.gray(truncate(pluginFile, 28))

        // ── EXP / Limit side info ───────────────────
        const xpStr    = expGain   > 0 ? chalk.yellow(`+${expGain}xp`)       : ''
        const limitStr = limitUsed > 0 ? chalk.red(`-${limitUsed}lmt`)       : ''
        const sideInfo = [xpStr, limitStr].filter(Boolean).join(' ')

        // ─────────────────────────────────────────────
        //  LINE OUTPUT
        //  [time] [STATUS] [CHAT] [ROLE]  name (num) → chat  .cmd  plugin  +xp -lmt
        // ─────────────────────────────────────────────
        const line = [
            chalk.gray(`[${time}]`),
            statusBadge,
            chatBadge,
            roleBadge,
            ' ',
            pad('', 0),                         // spacing
            senderDisplay,
            chalk.gray('→'),
            chatDisplay,
            chalk.gray('|'),
            cmdColour.bold(truncate(fullCmd, 20)),
            chalk.gray('·'),
            pluginDisplay,
            sideInfo ? chalk.gray('·') + ' ' + sideInfo : '',
        ].filter(v => v !== '').join(' ')

        console.log(line)

        // ── Error detail (indented) ──────────────────
        if (isError && m.error) {
            const errMsg = String(m.error?.message || m.error).split('\n')[0]
            console.log(
                chalk.gray('         └─'),
                chalk.red('⚠'),
                chalk.red(truncate(errMsg, 80))
            )
        }

        // ── Periodic summary every 25 commands ──────
        if (_stats.total % 25 === 0) {
            const bar = chalk.green('█'.repeat(Math.round((_stats.success / _stats.total) * 20)))
                      + chalk.red('░'.repeat(20 - Math.round((_stats.success / _stats.total) * 20)))
            console.log(
                chalk.gray('         ┌─ '),
                chalk.bold('RINGKASAN'),
                chalk.gray(`Total: ${_stats.total}`),
                chalk.green(`OK: ${_stats.success}`),
                chalk.red(`ERR: ${_stats.error}`),
                chalk.gray(`Uptime: ${formatUptime()}`),
                bar
            )
        }

    } catch (e) {
        // Fallback — never crash the bot over logging
        console.log(chalk.gray(`[print.js error] ${e.message}`))
    }
}