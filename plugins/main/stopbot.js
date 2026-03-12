const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'stopbot',
    command: ['stopbot'],
    tags: ['main'],
    desc: 'Matikan sub-bot jadibot',
    group: false,
    owner: false,
    limit: false,

    async handler({ m, conn }) {

        if (global.conn.user?.id === conn.user?.id) {
            return m.reply('❌ Ini bukan jadibot, tidak bisa distop.')
        }

        try {
            await m.reply('👋 Bot dimatikan! Terima kasih sudah menggunakan jadibot.')
            // Mark as stopped to prevent server.js from auto-restarting it
            conn.isStopped = true
            // Just disconnect, don't logout (so session is kept)
            try { conn.ws.close() } catch { }

            global.conns = global.conns.filter((c) => c.user?.id !== conn.user?.id)
        } catch (e) {
            m.reply('❌ Error: ' + e.message)
        }
    },
}
