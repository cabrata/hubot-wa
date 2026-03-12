const uploadFile = require('../../lib/editimg')

let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  
  if (!mime) throw 'Tidak ada media yang ditemukan'
  
  let media = await q.download()
  let isFoto = /image\/(png|jpe?g)/.test(mime)
  
  if (!isFoto) throw "Hanya bisa gambar"
  await m.reply("Sedang menghitamkan...")
  let link = await uploadFile("Tolong warna kulit karakter ini jadikan warna coklat gelap", media)
  await conn.sendMessage(m.chat, { image: link }, { quoted: m })
}

handler.help = ['hitamkan <reply image>']
handler.tags = ['tools']
handler.command = /^(hitam|hitamkan|ireng)$/i

module.exports = handler