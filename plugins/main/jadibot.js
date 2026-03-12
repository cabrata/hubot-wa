const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Active jadibot tokens: token -> { requester, phone, createdAt }
if (!global.jadibotTokens) global.jadibotTokens = {}
if (!global.conns) global.conns = []

module.exports = {
    name: 'jadibot',
    command: ['jadibot'],
    tags: ['main'],
    desc: 'Jadikan nomor kamu sebagai bot sementara',
    group: false,
    owner: false,
    limit: false,

    async handler({ m, conn, usedPrefix, command }) {
        // Only main bot can create sub-bots
        if (global.conn.user?.id !== conn.user?.id) {
            return m.reply('❌ Tidak bisa membuat sub-bot dari user jadibot!')
        }

        // Generate unique token
        const token = crypto.randomBytes(8).toString('hex')
        const port = global.serverPort || process.env.PORT || 3000
        const baseURL = global.publicURL || `http://localhost:${port}`

        global.jadibotTokens[token] = {
            requester: m.sender,
            chat: m.chat,
            createdAt: Date.now(),
        }

        // Expire token after 5 minutes
        setTimeout(() => {
            delete global.jadibotTokens[token]
        }, 5 * 60 * 1000)

        const url = `${baseURL}/jadibot/${token}`

        await m.reply(
            `🤖 *JadiBot — Clone Bot*\n\n` +
            `Buka link berikut untuk scan QR atau input pairing code:\n\n` +
            `🔗 ${url}\n\n` +
            `⏳ Link berlaku 5 menit\n\n` +
            `\`\`\`RULES\n` +
            `1. Jangan komplain ke owner kalo nomor di-banned!\n` +
            `2. Bot ini gratis, jangan disewakan!\n` +
            `3. Jangan spam/chat private orang!\n` +
            `4. Ketik .stopbot untuk matikan bot\`\`\``
        )
    },
}
