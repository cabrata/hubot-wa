const yts = require('yt-search')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

module.exports = {
    name: 'play',
    command: ['play'],
    help: 'play <judul lagu>',
    tags: ['downloader'],
    desc: 'Cari dan Putar lagu dari YouTube',

    async handler({ m, conn, text, usedPrefix, command }) {
        if (!text) return m.reply(`🚩 *Gunakan format:* ${usedPrefix + command} <judul lagu>`)

        await m.reply('🔍 *Sedang mencari lagu...*')
        try {
            const search = await yts(text)
            if (!search.videos.length) return m.reply('❌ Lagu tidak ditemukan.')

            const video = search.videos[0]
            const ytdlpPath = path.join(__dirname, '../../yt-dlp')
            const tmpFile = path.join(__dirname, '../../tmp', `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`)
            const outPath = tmpFile + '.mp3'

            // Format info msg
            const caption = `🎵 *YOUTUBE PLAY*\n\n` +
                `*Title:* ${video.title}\n` +
                `*Duration:* ${video.timestamp}\n` +
                `*Views:* ${video.views}\n` +
                `*Uploaded:* ${video.ago}\n` +
                `*Channel:* ${video.author.name}\n\n` +
                `_Sedang mendownload audio, harap tunggu..._`;

            await conn.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: caption }, { quoted: m })

            const yt = spawn(ytdlpPath, [
                '-x', '--audio-format', 'mp3',
                '--audio-quality', '5', // Good enough for messaging
                '-o', outPath,      // output file
                video.url
            ])

            yt.on('close', async (code) => {
                if (code !== 0 || !fs.existsSync(outPath)) {
                    return m.reply('❌ Gagal mengunduh audio dari YouTube.')
                }

                try {
                    // Convert to opus for PTT
                    const { toPTT } = require('../../lib/converter')
                    const opusPath = await toPTT(fs.readFileSync(outPath), 'ogg')

                    await conn.sendMessage(m.chat, {
                        audio: opusPath,
                        mimetype: 'audio/mpeg',
                        ptt: true
                    }, { quoted: m })

                    if (fs.existsSync(opusPath)) fs.unlinkSync(opusPath)
                } catch (e) {
                    m.reply('❌ Gagal convert/mengirim file audio: ' + e.message)
                } finally {
                    // Cleanup tmp
                    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
                }
            })

            yt.stderr.on('data', (d) => console.log('[YT-DLP ERR]', d.toString()))
        } catch (e) {
            console.error(e)
            m.reply('❌ Terjadi kesalahan: ' + e.message)
        }
    }
}
