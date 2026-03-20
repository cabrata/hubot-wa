let handler = async (m, { conn, isAdmin, isOwner }) => {
    // Memastikan ada balasan pesan
    if (!m.quoted) return m.reply('❌ Reply pesan yang ingin dihapus!')

    let isBotMessage = m.quoted.sender === conn.user.jid

    // Key identifikasi pesan
    let key = {
        remoteJid: m.chat,
        fromMe: isBotMessage,
        id: m.quoted.id,
        participant: m.quoted.sender
    }

    // Jika pesan orang lain, pastikan user adalah Admin/Owner
    if (!isBotMessage) {
        if (!(isAdmin || isOwner)) {
            return m.reply('❌ Hanya Admin Grup atau Bot Owner yang bisa menghapus pesan orang lain!')
        }
    }

    // Eksekusi penghapusan
    try {
        await conn.sendMessage(m.chat, { delete: key })
    } catch (e) {
        console.error(e)
        m.reply('❌ Gagal menghapus pesan. Pastikan bot adalah Admin!')
    }
}

handler.help = ['delete']
handler.tags = ['group']
handler.command = /^(delete|del|d)$/i

module.exports = handler
