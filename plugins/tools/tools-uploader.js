const uploadR2 = require('../../lib/uploadR2')

let handler = async (m) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw 'Tidak ada media yang ditemukan. Balas/kirim media dengan caption .tourl'

  await m.reply("Sedang mengupload media ke Cloudflare R2...")

  let media = await q.download();
  let link = await uploadR2(media)

  m.reply(`${link}\n${media.length} Byte(s)\n(Expired 7 hari)`)
}
handler.help = ['tourl <reply image/file>']
handler.tags = ['sticker']
handler.command = /^(upload|tourl)$/i

module.exports = handler
