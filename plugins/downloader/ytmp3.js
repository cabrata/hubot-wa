const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

module.exports = {
    name: 'ytmp3',
    command: ['ytmp3', 'yta'],
    help: 'ytmp3 <link youtube>',
    tags: ['downloader'],
    desc: 'Download Audio dari link YouTube',

    async handler({ m, conn, text, usedPrefix, command }) {
        if (!text || (!text.includes('youtu.be') && !text.includes('youtube.com'))) {
            return m.reply(`🚩 *Gunakan format:* ${usedPrefix + command} <link youtube>`)
        }

        await m.reply('⏳ *Sedang mendownload audio, harap tunggu...*')
        try {
            // Extract URL from text inside regex if there's extra text
            const urlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
            const url = urlMatch ? urlMatch[0] : text.split(' ')[0]

            const ytdlpPath = path.join(__dirname, '../../yt-dlp')
            const tmpFile = path.join(__dirname, '../../tmp', `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`)
            const outPath = tmpFile + '.mp3'

            const yt = spawn(ytdlpPath, [
                '-x', '--audio-format', 'mp3',
                '--audio-quality', '5',
                '-o', outPath,
                url
            ])

            yt.on('close', async (code) => {
                if (code !== 0 || !fs.existsSync(outPath)) {
                    return m.reply('❌ Gagal mengunduh audio. Pastikan link YouTube valid dan bukan live stream.')
                }

                try {
                    await conn.sendMessage(m.chat, {
                        audio: { url: outPath },
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: m })
                } catch (e) {
                    m.reply('❌ Gagal mengirim audio.')
                } finally {
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
