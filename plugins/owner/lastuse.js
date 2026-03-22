const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let who
    if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
    else who = m.chat
    
    if (!who && text) {
        if (text.toLowerCase() === 'all') {
            who = 'all'
        } else {
            let clean = text.replace(/[^0-9]/g, '')
            if (clean) who = clean + '@s.whatsapp.net'
        }
    }

    if (!who) {
        return m.reply(`*Format salah!*\n\nContoh:\n${usedPrefix + command} @user\natau\n${usedPrefix + command} all\nAtau balas pesan target.`)
    }

    if (who === 'all') {
        let sortedUsers = await db.user.findMany({
            where: { lastUseTime: { not: null } },
            orderBy: { lastUseTime: 'desc' },
            take: 30
        })

        if (sortedUsers.length === 0) return m.reply('Belum ada satupun user yang menggunakan bot.')

        let cap = `*📊 LAST USE TRACKER (30 Terakhir)*\n\n`
        cap += sortedUsers.map((u, i) => {
            let date = new Date(u.lastUseTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }).replace(' ', ', ')
            return `${i + 1}. @${u.jid.split('@')[0]}\n   └ ${date}\n   └ Cmd: ${u.lastUseCommand}`
        }).join('\n\n')

        return m.reply(cap, null, { mentions: sortedUsers.map(u => u.jid) })
    }

    let user = await getUser(who)
    if (!user) {
        return m.reply('Data pengguna tidak ditemukan di database!')
    }

    let lastTime = user.lastUseTime
    let lastCmd = user.lastUseCommand || 'Belum pernah memakai bot.'

    if (!lastTime) {
        return m.reply(`@${who.split('@')[0]} belum pernah menggunakan bot sama sekali (atau belum tercatat).`, null, { mentions: [who] })
    }

    let date = new Date(lastTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    let caption = `*📊 LAST USE TRACKER*\n\n`
    caption += `👤 *User:* @${who.split('@')[0]}\n`
    caption += `🕒 *Terakhir Pakai:* ${date} WIB\n`
    caption += `💻 *Command:* ${lastCmd}\n`

    m.reply(caption, null, { mentions: [who] })
}

handler.help = ['lastuse @user']
handler.tags = ['owner']
handler.command = /^(lastuse)$/i
handler.owner = true

module.exports = handler
