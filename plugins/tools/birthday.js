const moment = require('moment-timezone')
const { getUser, updateUser } = require('../../lib/database')

let handler = async function (m, { conn, text }) {
  if (!text) throw 'Format: .birthday DD/MM/YYYY\nContoh: .birthday 17/07/2007'

  let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) throw 'Format salah! Gunakan DD/MM/YYYY'

  let [_, dd, mm, yyyy] = match
  yyyy = parseInt(yyyy)
  let currentYear = moment().year()

  // ❌ Cegah tahun di masa depan
  if (yyyy > currentYear) throw '❌ Tahun lahir tidak boleh melebihi tahun sekarang!'

  // parsing dan validasi pakai moment (strict)
  let birth = moment(`${dd}/${mm}/${yyyy}`, 'DD/MM/YYYY', true)
  if (!birth.isValid()) throw 'Tanggal tidak valid!'

  // pakai timezone agar konsisten (Asia/Jakarta)
  birth = birth.tz('Asia/Jakarta')

  // hari sekarang di timezone yang sama
  let today = moment().tz('Asia/Jakarta')

  // umur yang benar (memperhitungkan bulan & tanggal)
  let age = today.diff(birth, 'years')

  if (age < 0) throw 'Tanggal lahir tidak boleh di masa depan!'

  // ❌ Tolak umur di bawah 10 tahun
  if (age < 10) throw '🚫 Umur kamu terlalu muda (kurang dari 10 tahun). Data tidak bisa disimpan.'

  let user = await getUser(m.sender)
  if (!user) return

  let now = Date.now()
  let lastChange = Number(user.setAge || 0)
  let oneMonth = 90 * 24 * 60 * 60 * 1000 // 90 hari

  if (now - lastChange < oneMonth && user.ultah) {
    let sisa = Math.ceil((oneMonth - (now - lastChange)) / (24 * 60 * 60 * 1000))
    throw `❌ Kamu hanya bisa mengubah tanggal lahir 1x setiap 90 hari.\nTunggu ${sisa} hari lagi.`
  }

  // 🔒 Cegah manipulasi umur (perbedaan mencurigakan)
  if (user.age) {
    let oldAge = Number(user.age)
    let diff = age - oldAge

    if (diff > 3) {
      throw '🚫 Umur yang kamu masukkan terlalu jauh dari data sebelumnya.\nAkses ditolak, harap hubungi staff.'
    }
    if (diff < -1) {
      throw '🚫 Umur tidak mungkin mengecil!\nAkses ditolak.'
    }
  }

  // Simpan data
  await updateUser(m.sender, {
    age: age,
    ultah: `${dd}/${mm}/${yyyy}`,
    setAge: now
  })

  // Kirim respon sukses
  let msg = `✅ Tanggal lahir berhasil disimpan!\n\n`
  msg += `🎂 *Birthday:* ${dd}/${mm}/${yyyy}\n`
  msg += `🎈 *Umur Terupdate:* ${age} Tahun\n\n`
  msg += `_Catatan: Kamu baru bisa mengubahnya lagi 90 hari dari sekarang._`

  m.reply(msg)
}

handler.help = ['birthday <DD/MM/YYYY>']
handler.tags = ['tools', 'rpg']
handler.command = /^(birthday|ultah|setbd|setultah)$/i
handler.register = true

module.exports = handler
