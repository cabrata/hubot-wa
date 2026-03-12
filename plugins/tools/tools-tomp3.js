const { toAudio } = require('../../lib/converter.js')

async function handler(m, { conn, usedPrefix, command }) {
    let q = m.quoted ? m.quoted : m
    let mime = (q || q.msg).mimetype || q.mediaType || ''
    if (!/video|audio/.test(mime)) throw `Reply video/voice note yang ingin kamu ubah ke audio/mp3 dengan perintah *${usedPrefix + command}*`
    let media = await q.download()
    if (!media) throw 'Tidak bisa mengunduh media'
    let audio = await toAudio(media, 'mp4')
    if (!audio) throw 'Tidak bisa mengubah media ke audio'
    conn.sendMessage(m.chat, { audio: audio, mimetype: 'audio/mpeg' }, { quoted: m })
}
handler.help = ['tomp3']
handler.tags = ['tools']
handler.command = /^to(mp3|audio)$/i

module.exports = handler