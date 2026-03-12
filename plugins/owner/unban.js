const { getUser, updateUser } = require('../../lib/database.js')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Cari target: dari tag atau dari reply pesan
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null
    
    if (!who) throw `Tag orangnya atau balas pesannya bang!\n\n*Contoh:* ${usedPrefix + command} @user`

    // Cek database
    let user = await getUser(who)
    if (!user) throw 'Pengguna tidak ada di dalam database!'

    if (!user.banned) throw 'Loh? Orang ini emang nggak lagi di-ban kok.'

    // Reset data user ke kondisi normal (TIPE DATA HARUS PERSIS SAMA KAYA SQL)
    let updateData = {
        banned: false,
        Banneduser: false,
        banLevel: 0n,         // ⚠️ Pake 0n (BigInt) karena di SQL bentuknya 1n
        bannedTime: 0,        // ⚠️ Pake 0 biasa karena di SQL gak ada 'n' nya
        bannedReason: ''      // ⚠️ Pake 'B' besar sesuai database lu
    }

    // Eksekusi update!
    await updateUser(who, updateData)

    conn.sendMessage(m.chat, { 
        text: `✅ *UNBANNED SUCCESS*\n\nBerhasil membuka gembok ban untuk @${who.split('@')[0]}!\nDatabase telah disinkronisasi, sekarang dia bisa pakai bot lagi.`, 
        mentions: [who] 
    }, { quoted: m })
}

handler.help = ['unban @user']
handler.tags = ['owner']
handler.command = /^unban$/i
handler.owner = true 

module.exports = handler
