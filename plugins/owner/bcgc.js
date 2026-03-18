const { db } = require('../../lib/database')

module.exports = {
    name: 'bcgc',
    command: ['bcgc', 'broadcastgroup'],
    tags: ['owner'],
    owner: true,
    desc: 'Broadcast pesan multimedia ke seluruh group (Anti-Spam)',

    async handler({ m, conn, text, usedPrefix, command }) {
        let q = m.quoted ? m.quoted : m
        let c = m.quoted ? m.quoted : m.msg

        if (!text && !m.quoted) {
            return m.reply(`Masukkan teks atau reply pesan/media yang mau di broadcast!\n\nContoh:\n*${usedPrefix + command} Halo Semua!*`)
        }

        await m.react('📢')
        m.reply('🚀 Mulai mengirim broadcast ke seluruh grup...\n_Mohon tunggu, proses ini sengaja dibuat sedikit lambat untuk menghindari deteksi spam._')

        // Fetch all group chats saved in database
        const groups = await  conn.groupFetchAllParticipating();
        if (!groups || groups.length === 0) {
            return m.reply('❌ Tidak ada grup yang terdaftar di database.')
        }

        let success = 0
        let failed = 0
        // Use a 3-5 second delay to stay safe from WA rate-limits
        const delayTime = 3500 
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

        for (const jid of Object.keys(groups)) {
            try {
                if (!jid.endsWith('@g.us')) continue; // Skip non groups just in case

                let bcText = text ? `📢 *BROADCAST*\n\n${text}` : `📢 *BROADCAST*\n\n${q.text || ''}`
                if (bcText.trim() === '📢 *BROADCAST*') bcText = '' // Empty if there's no text/caption

                // footer
                bcText += `\n\n> *${global.botName}*`
                
                // Synthesize the payload via cMod
                let msg = conn.cMod(jid, c, bcText, conn.user.id)
                
                // Dispatch directly to WaSocket
                await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
                success++
            } catch (e) {
                failed++
            }
            // Execute incremental delay strictly to bypass anti-spam
            await delay(delayTime)
        }

        m.reply(`📢 *Broadcast Group Selesai!*\n\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`)
    }
}
