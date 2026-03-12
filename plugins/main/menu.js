const { getUser } = require('../../lib/database')
const fs = require('fs')
const path = require('path')
const moment = require('moment-timezone')

const isNumber = x => typeof x === 'number' && !isNaN(x)

let handler = async (m, { conn, usedPrefix: _p, text, db }) => {
    try {
        const jam = moment.tz('Asia/Jakarta').format('HH')
        let ucapanWaktu = 'Selamat Pagi'
        let iconWaktu = '🌅'

        if (jam >= '03' && jam <= '10') {
            ucapanWaktu = 'Selamat Pagi'; iconWaktu = '🌅'
        } else if (jam >= '10' && jam <= '13') {
            ucapanWaktu = 'Selamat Siang'; iconWaktu = '☀️'
        } else if (jam >= '13' && jam <= '18') {
            ucapanWaktu = 'Selamat Sore'; iconWaktu = '🌇'
        } else if (jam >= '18' && jam <= '23') {
            ucapanWaktu = 'Selamat Malam'; iconWaktu = '🌙'
        } else {
            ucapanWaktu = 'Selamat Malam'; iconWaktu = '🌃'
        }

        const more = String.fromCharCode(8206)
        const readmore = more.repeat(4001)

        // ========== HELP specific command ==========
        if (text) {
            const cmdName = text.trim().toLowerCase()
            let foundPlugin = null
            let foundPath = null

            for (const [filepath, plugin] of Object.entries(global.plugins)) {
                if (!plugin || plugin.disabled) continue
                if (Array.isArray(plugin.command)) {
                    if (plugin.command.some(cmd => typeof cmd === 'string' && cmd.toLowerCase() === cmdName)) {
                        foundPlugin = plugin; foundPath = filepath; break
                    }
                } else if (typeof plugin.command === 'string' && plugin.command.toLowerCase() === cmdName) {
                    foundPlugin = plugin; foundPath = filepath; break
                }
                if (plugin.help) {
                    const helpList = Array.isArray(plugin.help) ? plugin.help : [plugin.help]
                    if (helpList.some(h => String(h).split(/\s+/)[0].toLowerCase() === cmdName)) {
                        foundPlugin = plugin; foundPath = filepath; break
                    }
                }
                if (plugin.name && plugin.name.toLowerCase() === cmdName) {
                    foundPlugin = plugin; foundPath = filepath; break
                }
            }

            if (!foundPlugin) {
                for (const [filepath, plugin] of Object.entries(global.plugins)) {
                    if (!plugin || plugin.disabled) continue
                    if (plugin.command instanceof RegExp) {
                        if (plugin.command.test('')) continue
                        if (plugin.command.test(cmdName)) {
                            foundPlugin = plugin; foundPath = filepath; break
                        }
                    } else if (Array.isArray(plugin.command)) {
                        const regexMatch = plugin.command.some(cmd =>
                            cmd instanceof RegExp && !cmd.test('') && cmd.test(cmdName)
                        )
                        if (regexMatch) {
                            foundPlugin = plugin; foundPath = filepath; break
                        }
                    }
                }
            }

            if (foundPlugin) {
                const plugin = foundPlugin
                const filepath = foundPath

                let cmdNames = []
                if (plugin.command instanceof RegExp) {
                    const regSrc = plugin.command.source
                        .replace(/^\^?\(?/, '').replace(/\)?\$?$/, '')
                    cmdNames = regSrc.split('|').filter(c => c && !/[\\()?+*\[\]{}]/.test(c))
                } else if (Array.isArray(plugin.command)) {
                    cmdNames = plugin.command.filter(c => typeof c === 'string')
                } else if (typeof plugin.command === 'string') {
                    cmdNames = [plugin.command]
                }

                const helpList = Array.isArray(plugin.help) ? plugin.help : (plugin.help ? [plugin.help] : [])

                let rules = []
                if (plugin.rowner) rules.push('👑 Real Owner')
                if (plugin.owner) rules.push('🔐 Owner Only')
                if (plugin.mods) rules.push('🛡️ Moderator')
                if (plugin.premium) rules.push('💎 Premium')
                if (plugin.limit) rules.push(`⏳ Limit: ${plugin.limit}`)
                if (plugin.group) rules.push('👥 Group Only')
                if (plugin.private) rules.push('🔒 Private Only')
                if (plugin.admin) rules.push('⚡ Admin Only')
                if (plugin.botAdmin) rules.push('🤖 Bot Admin')
                if (plugin.register) rules.push('📋 Registered')

                let info = `╭─「 📖 *Command Info* 」\n`
                info += `│\n`
                info += `│  🔖 *Command :* ${_p}${cmdName}\n`
                if (plugin.name) info += `│  🏷️  *Name    :* ${plugin.name}\n`
                if (plugin.desc) info += `│  📝 *Desc    :* ${plugin.desc}\n`
                if (plugin.tags?.length) info += `│  🗂️  *Tags    :* ${plugin.tags.join(', ')}\n`
                if (helpList.length) info += `│  💡 *Usage   :* ${helpList.map(h => `\`${_p}${h}\``).join(', ')}\n`
                if (cmdNames.length > 1) info += `│  🔀 *Aliases :* ${cmdNames.map(c => `\`${_p}${c}\``).join(', ')}\n`
                if (rules.length) {
                    info += `│\n│  🚦 *Rules:*\n`
                    for (let r of rules) info += `│    ◈ ${r}\n`
                }
                info += `│\n`
                info += `╰─「 _${filepath}_ 」`

                return m.reply(info)
            }

            return m.reply(
                `╭─「 ❌ *Not Found* 」\n│\n│  Command *${cmdName}* tidak ditemukan.\n│  Gunakan: *${_p}find ${cmdName}*\n│\n╰──────────────────`
            )
        }

        // ========== BUILD FULL MENU ==========
        let pkg = {}
        try { pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'))) } catch { }

        let name = await conn.getName(m.sender)
        let d = new Date()
        let locale = 'id'
        let week = d.toLocaleDateString(locale, { weekday: 'long' })
        let date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
        let time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric', second: 'numeric' })

        let _uptime = process.uptime() * 1000
        let uptime = clockString(_uptime)

        let totalfeature = Object.values(global.plugins).filter(v => v.help && v.tags).length

        let totalreg = 0
        try {
            const { db: prisma } = require('../../lib/database')
            totalreg = await prisma.user.count()
        } catch { }

        // ========== TAG DEFINITIONS ==========
        let tags = {
            'main': '🏠  M A I N',
            'info': 'ℹ️   I N F O',
            'tools': '🔧  T O O L S',
            'sticker': '🖼️  S T I C K E R',
            'downloader': '📥  D O W N L O A D',
            'group': '👥  G R O U P',
            'fun': '🎭  F U N',
            'game': '🎮  G A M E',
            'rpg': '⚔️   R P G',
            'owner': '👑  O W N E R',
            'advanced': '⚙️   A D V A N C E D',
        }

        for (let plugin of Object.values(global.plugins)) {
            if (plugin && 'tags' in plugin) {
                for (let tag of plugin.tags) {
                    if (!(tag in tags)) tags[tag] = `📁  ${tag.toUpperCase()}`
                }
            }
        }

        // ========== COLLECT HELP BY TAG ==========
        let help = Object.values(global.plugins).filter(p => p && p.help && p.tags).map(plugin => ({
            help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
            tags: plugin.tags,
            prefix: 'customPrefix' in plugin,
            limit: plugin.limit,
        }))

        let groups = {}
        for (let tag in tags) {
            groups[tag] = []
            for (let menu of help) {
                if (menu.tags && menu.tags.includes(tag)) groups[tag].push(menu)
            }
        }
        for (let tag in groups) {
            if (groups[tag].length === 0) delete groups[tag]
        }

        // ========== COUNTDOWN ==========
        const todayDate = new Date()
        const yearAfter = todayDate.getFullYear() + 1
        const targetDate = new Date(`${yearAfter}-01-01T00:00:00+07:00`)
        const selisih = targetDate.getTime() - Date.now()

        let user = await getUser(m.sender)
        const displayName = user.name ? user.name : m.pushName
        const botMode = global.selfMode ? 'Self' : 'Public'
        const botType = conn.user.id === global.conn.user.id ? 'Main BOT' : 'Clone BOT'

        // ========== HEADER ==========
        let _text = `${readmore}
━━━━━━━━━━━━━━━━━━━━━
  ✦  𝗛𝘂𝗧𝗮𝗼  𝗕𝗢𝗧  ✦
━━━━━━━━━━━━━━━━━━━━━

${iconWaktu} *${ucapanWaktu}!*
┊ 👤 ${displayName}
┊ 📱 @${m.sender.replace(/@.+/, '')}

╭─「 🖥️ *𝚂𝚢𝚜𝚝𝚎𝚖 𝙸𝚗𝚏𝚘* 」
┊
┊  ◈  Mode    ➜  ${botMode}
┊  ◈  Type    ➜  ${botType}
┊  ◈  Clock   ➜  ${moment.tz('Asia/Jakarta').format('HH:mm:ss')} WIB
┊  ◈  Date    ➜  ${week}, ${date}
┊  ◈  Feature ➜  ${totalfeature} commands
┊  ◈  Users   ➜  ${totalreg} registered
┊  ◈  Uptime  ➜  ${uptime}
┊
┊  🎊 *New Year ${yearAfter} Countdown*
┊  ⏳ ${timeString(selisih)}
┊
╰──────────────────────

`

        // ========== CATEGORY BLOCKS ==========
        for (let tag in groups) {
            const cmds = []
            for (let menu of groups[tag]) {
                for (let h of menu.help) {
                    const cmd = menu.prefix ? h : _p + h
                    const mark = menu.limit ? ' 💎' : ''
                    cmds.push(`${cmd}${mark}`)
                }
            }

            _text += `╭─「 ${tags[tag]} 」\n`
            for (let i = 0; i < cmds.length; i++) {
                const isLast = i === cmds.length - 1
                const branch = isLast ? '╰◈' : '├◈'
                _text += `${branch} ${cmds[i]}\n`
            }
            _text += `\n`
        }

        // ========== FOOTER ==========
        _text += `╭─「 💡 *𝙂𝙪𝙞𝙙𝙚* 」\n`
        _text += `├◈ Ketik *${_p}help <cmd>* untuk info detail\n`
        _text += `├◈ Tanda 💎 = membutuhkan limit/premium\n`
        _text += `╰◈ Ketik *${_p}find <kata>* untuk cari command\n`
        _text += `\n`
        _text += `_v${pkg.version || global.botVersion || '1.0.0'} • HuTao BOT_`

        // Replace placeholders
        let replace = {
            '%': '%',
            p: _p,
            uptime,
            name,
            week,
            date,
            time,
            totalreg,
            totalfeature,
            botname: global.botName,
            version: pkg.version || global.botVersion || '1.0.0',
            readmore: global.readmore,
        }
        _text = _text.replace(new RegExp(`%(${Object.keys(replace).join('|')})`, 'g'), (_, key) => '' + replace[key])

        let fekling2 = 'https://i.caliphdev.com/ezgif-6-b4335201ee.webp'
        let adReply2 = {
            title: 'HuTao BOT',
            body: 'Official Channel',
            thumbnailUrl: fekling2,
            sourceUrl: 'https://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m',
            mediaType: 2,
            renderLargerThumbnail: true,
        }

        conn.sendMessage(m.chat, {
            text: _text.trim(),
            contextInfo: {
                mentionedJid: conn.parseMention(_text.trim()),
                externalAdReply: adReply2,
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363373141583166@newsletter',
                    newsletterName: 'HuTao BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: m })

    } catch (e) {
        conn.sendMessage(m.chat, {
            text: `╭─「 ⚠️ *Error* 」\n┊\n┊  Maaf, terjadi kesalahan.\n┊\n╰──────────────`
        }, { quoted: m })
        throw e
    }
}

handler.help = ['menu', 'help']
handler.tags = ['main']
handler.command = /^(menu|help|bantuan)$/i
handler.owner = false
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.fail = null
handler.exp = 3

module.exports = handler

// ========== UTILITIES ==========
function clockString(ms) {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

function timeString(duration) {
    let days = Math.floor(duration / (1000 * 60 * 60 * 24))
    let hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    let mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    let secs = Math.floor((duration % (1000 * 60)) / 1000)
    days = String(days).padStart(2, '0')
    hours = String(hours).padStart(2, '0')
    mins = String(mins).padStart(2, '0')
    secs = String(secs).padStart(2, '0')
    return `${days} hari  ${hours} jam  ${mins} menit  ${secs} detik`
}