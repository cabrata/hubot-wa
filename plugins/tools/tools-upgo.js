const uploadFile = require('../../lib/upfiles')

let handler = async (m, { text }) => {
  let q = m.quoted ? m.quoted : m;
  let [context, filename] = (text || "").split("/");
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw 'Tidak ada media yang ditemukan'
  let media = await q.download();
  let link = await uploadFile(media, filename, context)
  m.reply(`Upload Berhasil Ke Server GO!\nLink: ${link}`)
}
handler.help = ['upgo <reply image/file>']
handler.tags = ['tools']
handler.command = /^(upgo)$/i

module.exports = handler