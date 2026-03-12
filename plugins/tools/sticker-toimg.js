const { spawn } = require('child_process')
const { format } = require('util')

let handler = async (m, { conn, command, usedPrefix }) => {
	let q = m.quoted
	if (q && /sticker/.test(q.mtype)) {
		if (q.isAnimated) return m.reply(` > use *${usedPrefix}togif* for stickerGIF`)
		let img = await m.quoted.download()
		try {
			let bufs = []
			const [_spawnprocess, ..._spawnargs] = [...(global.support.gm ? ['gm'] : global.support.magick ? ['magick'] : []), 'convert', 'webp:-', 'png:-']
			let im = spawn(_spawnprocess, _spawnargs)
			im.on('error', e => m.reply(format(e)))
			im.stdout.on('data', chunk => bufs.push(chunk))
			im.stdin.write(img)
			im.stdin.end()
			im.on('exit', async () => {
				await conn.sendFile(m.chat, Buffer.concat(bufs), 'image.png', 'succes convert!', m)
			})
		} catch (e) {
			console.log(e)
			await conn.sendMessage(m.chat, { image: img, jpegThumbnail: img, caption: 'succes convert!' }, { quoted: m })
		}
	} else return m.reply('Reply / tag Sticker')
}

handler.help = ['toimg']
handler.tags = ['stiker-image|sticker']
handler.command = /^(stiker-image|sticker-image|toim(g|age))$/i

module.exports = handler