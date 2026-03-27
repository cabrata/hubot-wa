let handler = async (m, { conn, usedPrefix }) => {
    // Pastikan array-nya ada
    global.banRequests = global.banRequests || []
    if (!m.chat === '120363368633822650@g.us') return m.reply('Fitur ini hanya dapat digunakan di grup staff')
    if (global.banRequests.length === 0) {
        return m.reply('🎉 Saat ini tidak ada antrean request ban dari Tim Support.')
    }

    let teks = `📋 *DAFTAR REQUEST BANNED*\n\n`
    for (let i = 0; i < global.banRequests.length; i++) {
        let req = global.banRequests[i]
        teks += `*${i + 1}.* Target: @${req.who.split('@')[0]}\n`
        teks += `   ├ 🧑‍💻 Req By: @${req.requestedBy}\n`
        teks += `   └ 💬 Alasan: ${req.reason}\n\n`
    }
    
    teks += `Ketik *${usedPrefix}ban [nomor]* untuk menyetujui.\nContoh: *${usedPrefix}ban 1*`

    // Extract jid buat mentions
    let mentionsJid = global.banRequests.map(r => r.who).concat(global.banRequests.map(r => r.requestedBy + '@s.whatsapp.net'))

    conn.sendMessage(m.chat, { text: teks, mentions: [...new Set(mentionsJid)] }, { quoted: m })
}

handler.help = ['listban']
handler.tags = ['staff']
handler.command = /^(listban|antreanban)$/i

module.exports = handler
