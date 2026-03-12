module.exports = {
    name: 'broadcast',
    command: ['broadcast', 'bc'],
    group: false,
    admin: false,
    botAdmin: false,
    owner: true,
    premium: false,
    private: false,
    limit: false,
    tags: ['owner'],
    desc: 'Broadcast pesan ke semua chat',

    async handler({ m, conn, text }) {
        if (!text) return m.reply('Masukkan pesan yang ingin di-broadcast!\n\nContoh: *.broadcast Halo semua!*')

        await m.react('📢')

        // Get all chats
        const chats = Object.keys(conn.chats || {})
        if (chats.length === 0) return m.reply('Tidak ada chat yang tersimpan!')

        let success = 0
        let failed = 0
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

        for (const chatId of chats) {
            try {
                await conn.sendMessage(chatId, {
                    text: `📢 *BROADCAST*\n\n${text}\n\n— _${global.botName}_`,
                })
                success++
                await delay(1000) // delay 1s to avoid rate limit
            } catch {
                failed++
            }
        }

        await m.reply(`📢 *Broadcast selesai!*\n\n✅ Terkirim: ${success}\n❌ Gagal: ${failed}`)
    },
}
