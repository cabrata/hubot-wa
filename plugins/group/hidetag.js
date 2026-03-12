let handler = async (m, { conn, text, participants }) => {
    // Ambil daftar semua ID peserta grup
    let users = participants.map(u => u.id)
   
    // Jika ada pesan yang di-quote, ambil pesannya. Jika tidak, pakai teks yang diketik.
    let q = m.quoted ? m.quoted : m
    let msg = text ? text : (q.text || '')

    // Kirim pesan dengan fitur mentions (Hidetag)
    await conn.sendMessage(m.chat, { 
        text: msg, 
        mentions: users 
    }, { quoted: m })
}

handler.help = ['hidetag <pesan>']
handler.tags = ['group']
handler.command = /^(hidetag|everyone|ht)$/i
handler.group = true
handler.admin = true

module.exports = handler
