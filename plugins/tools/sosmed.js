let handler = async (m, { conn, text, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  if (!user.bd) return conn.sendMessage(m.sender, {
  text: `Anda belum memiliki data ulang tahun, harap isi terlebih dahulu sebelum menggunakan fitur ini, ketik *${usedPrefix}birthday* Harap mengisi di chat bot, jangan mengisi di grup!`, 
  quoted: m
})

  if (!text) throw 'Format: .sosmed <platform> <username>\nContoh: .sosmed ig @mnabzfz'

  let [platform, username] = text.split(' ')
  if (!platform || !username) throw 'Format salah! Contoh: .sosmed tiktok @user'

  // normalisasi platform
  platform = platform.toLowerCase()
  let valid = ['tiktok', 'ig', 'instagram', 'x', 'facebook', 'threads']
  if (!valid.includes(platform)) throw 'Platform tidak dikenal! Pilih: tiktok/ig/x/facebook/threads'

  if (!user.sosmed) user.sosmed = []

  // kalau udah ada platform yg sama → update
  let exist = user.sosmed.find(s => s.platform === platform)
  if (exist) {
    exist.username = username
  } else {
    // kalau udah ada 2 sosmed → replace yang pertama
    if (user.sosmed.length >= 2) user.sosmed.shift()
    user.sosmed.push({ platform, username })
  }

  m.reply(`✅ Sosmed berhasil disimpan!
Platform: ${platform}
Username: ${username}`)
}

handler.command = /^sosmed$/i
handler.tags = ['internet']
handler.help = ['sosmed']

module.exports = handler