let handler = async (m, { conn, usedPrefix }) => {
    // Pastikan array-nya ada
    global.unbanRequests = global.unbanRequests || []
    if (!m.chat === '120363368633822650@g.us') return m.reply('Fitur inu hanya dapat digunakan di grup staff')
    if (global.unbanRequests.length === 0) {
        return m.reply('🎉 Saat ini tidak ada antrean request unban dari Tim Support.')
    }

    let teks = `📋 *DAFTAR REQUEST UNBANNED*\n\n`
    for (let i = 0; i < global.unbanRequests.length; i++) {
        let req = global.unbanRequests[i]
        teks += `*${i + 1}.* Target: @${req.who.split('@')[0]}\n`
        teks += `   ├ 🧑‍💻 Req By: @${req.requestedBy}\n`
        teks += `   └ 💬 Alasan: ${req.reason}\n\n`
    }
    
    teks += `Ketik *${usedPrefix}unban [nomor]* untuk menyetujui.\nContoh: *${usedPrefix}unban 1*`

    // Extract jid buat mentions
    let mentionsJid = global.unbanRequests.map(r => r.who).concat(global.unbanRequests.map(r => r.requestedBy + '@s.whatsapp.net'))

    conn.sendMessage(m.chat, { text: teks, mentions: [...new Set(mentionsJid)] }, { quoted: m })
}

handler.help = ['listunban']
handler.tags = ['owner', 'staff']
handler.command = /^(listunban|antreanunban)$/i

module.exports = handler
