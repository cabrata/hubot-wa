module.exports = {
    name: 'find',
    command: ['find'],
    tags: ['main'],
    desc: 'Cari keberadaan command atau plugin berdasarkan keyword',

    async handler({ m, text, usedPrefix }) {
        if (!text) {
            return m.reply(`*Format:* ${usedPrefix}find <keyword>\n*Contoh:* ${usedPrefix}find yt`)
        }

        const keyword = text.trim().toLowerCase()
        const results = []

        for (const [path, plugin] of Object.entries(global.plugins)) {
            if (!plugin) continue

            const pName = plugin.name ? String(plugin.name).toLowerCase() : ''
            const rawDesc = plugin.desc || plugin.help || ''
            const pDesc = (Array.isArray(rawDesc) ? rawDesc.join(' ') : String(rawDesc)).toLowerCase()
            const pTags = Array.isArray(plugin.tags) ? plugin.tags.join(' ').toLowerCase() : String(plugin.tags || '').toLowerCase()
            const pCmds = Array.isArray(plugin.command) ? plugin.command.join(' ').toLowerCase() : String(plugin.command || '').toLowerCase()
            const pPath = String(path).toLowerCase()

            if (
                pName.includes(keyword) ||
                pDesc.includes(keyword) ||
                pTags.includes(keyword) ||
                pCmds.includes(keyword) ||
                pPath.includes(keyword)
            ) {
                const commands = Array.isArray(plugin.command) ? plugin.command : (plugin.command ? [plugin.command] : [])
                const cmdText = commands.length ? commands[0] : (plugin.name || 'Unknown')

                // Keep only the last two parts of the path for cleaner display (e.g. main/menu.js)
                const pathParts = path.split('/')
                const displayPath = pathParts.slice(Math.max(pathParts.length - 2, 0)).join('/')

                results.push(`- *${usedPrefix}${cmdText}* (${displayPath})`)
            }
        }

        if (results.length === 0) {
            return m.reply(`❌ Tidak ditemukan plugin dengan kata kunci *${keyword}*`)
        }

        let msg = `🔍 *Hasil Pencarian: ${keyword}*\nDitemukan ${results.length} plugin:\n\n`
        msg += results.join('\n')
        msg += `\n\n_Ketik ${usedPrefix}help <command> untuk detail_`

        m.reply(msg)
    }
}
