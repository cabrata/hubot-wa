const { getUser, updateUser } = require('../../lib/database.js')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Cari target: dari tag atau dari reply pesan
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null
    
    if (!who) throw `Tag orangnya atau balas pesannya bang!\n\n*Contoh:* ${usedPrefix + command} @user alasan`
    if (who === conn.user.jid) throw 'Ngapain ban bot sendiri dah 🗿'
    if (global.owner.includes(who.split('@')[0])) throw 'Mana berani ban sesama Owner 🥶'

    // Cek database
    let user = await getUser(who)
    if (!user) throw 'Pengguna tidak ada di dalam database!'

    // Ambil alasan (buang tag dari teks)
    let reason = text.replace(/@[0-9]+/g, '').trim() || 'Melanggar rules bot'

    // Update data user ke SQL
    let updateData = {
        banned: true,
        banLevel: 9, // Set ke level maksimal (Permanen)
        bannedTime: BigInt(Date.now()),
        bannedUntil: 0n, // 0 berarti permanen
        bannedReason: `[Manual Ban] ${reason}`
    }

    await updateUser(who, updateData)

    conn.sendMessage(m.chat, { 
        text: `🔨 *BANNED SUCCESS*\n\nBerhasil membanned @${who.split('@')[0]}!\n*Alasan:* ${reason}`, 
        mentions: [who] 
    }, { quoted: m })
}

handler.help = ['ban @user [alasan]']
handler.tags = ['owner']
handler.command = /^(ban|banned)$/i
handler.owner = true // Pastiin cuma owner yang bisa pake

module.exports = handler
