//rpg-bertarung
const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, text }) => {
  let opponent = m.mentionedJid[0]
  if (!opponent) return conn.reply(m.chat, '• *Example :* .bertarung @user', m)

  let user = await getUser(m.sender)
  let target = await getUser(opponent)

  if (!user || !target) {
    return conn.reply(m.chat, 'Salah satu pengguna tidak terdaftar di database', m)
  }

  conn.sendMessage(m.chat, { react: { text: '🕒', key: m.key } })

  let alasanKalah = pickRandom(['bodoh gitu doang aja kalah tolol lu di denda', 'lemah lu kontol mending lu di rumah aja dah lu di denda dek', 'Jangan beratem kalo cupu dek wkwkwk kamu di denda', 'Dasar tolol lawan itu doang aja ga bisa lu di denda', 'Hadehh sono lu mending di rumah aja deh lu di denda'])
  let alasanMenang = pickRandom(['kamu berhasil menggunakan kekuatan elemental untuk menghancurkan pertahanan lawan dan mendapatkan', 'kamu berhasil melancarkan serangan mematikan dengan gerakan akrobatik yang membingungkan lawan, dan mendapatkan', 'Kamu berhasil menang karena baru selesai coli dan mendapatkan', 'Kamu berhasil menang karena menyogok lawan dan mendapatkan', 'Kamu berhasil menang karena bot merasa kasihan sama kamu dan mendapatkan', 'Kamu berhasil menang karena kamu melawan orang cupu dan mendapatkan'])

  let betAmount = Math.floor(Math.random() * (10000000 - 10000 + 1)) + 10000

  if (user.money < betAmount) {
    return conn.reply(m.chat, 'Uang Anda tidak mencukupi', m)
  }

  let lastWar = Number(user.lastwar || 0) // Pakai lastwar sesuai cooldown schema
  if (lastWar && (Date.now() - lastWar) < 10000) {
    let remainingTime = Math.ceil((10000 - (Date.now() - lastWar)) / 1000)
    return conn.reply(m.chat, `Anda harus menunggu ${remainingTime} detik sebelum dapat bertarung lagi`, m)
  }

  conn.reply(m.chat, 'Mempersiapkan arena...', m)

  setTimeout(() => {
    conn.reply(m.chat, 'Mendapatkan arena...', m)

    setTimeout(() => {
      conn.reply(m.chat, 'Bertarung...', m)

      setTimeout(async () => {
        // Ambil data terbaru biar uangnya akurat
        let freshUser = await getUser(m.sender)
        let freshTarget = await getUser(opponent)

        let result = Math.random() >= 0.5
        let wonAmount = result ? betAmount : -betAmount

        if (freshUser) await updateEconomy(m.sender, { money: freshUser.money + wonAmount })
        if (freshTarget) await updateEconomy(opponent, { money: freshTarget.money - wonAmount })

        let opponentName = conn.getName(opponent)
        let updatedUser = await getUser(m.sender) // Tarik ulang buat nampilin saldo final

        let caption = `❏  *F I G H T*\n\n`
        caption += `Lawan Anda Adalah: ${opponentName}\nLevel: [${updatedUser.level || 0}]\n\n`

        if (result) {
          caption += `*Menang!*, ${alasanMenang}, +${betAmount} Money\n`
          caption += `Uang Anda saat ini: ${updatedUser.money}\n`
          conn.sendMessage(m.chat, { image: { url: 'https://telegra.ph/file/e3d5059b970d60bc438ac.jpg' }, caption: caption }, { quoted: m })
        } else {
          caption += `*kalah!*, ${alasanKalah}, -${betAmount} Money\n`
          caption += `Uang Anda saat ini: ${updatedUser.money}\n`
          conn.sendMessage(m.chat, { image: { url: 'https://telegra.ph/file/86b2dc906fb444b8bb6f7.jpg' }, caption: caption }, { quoted: m })
        }

        await updateCooldown(m.sender, { lastwar: Date.now() })

        setTimeout(() => {
          conn.reply(m.chat, `Anda dapat bertarung lagi setelah 5 detik`, m)
        }, 5000)
      }, 2000)
    }, 2000)
  }, 2000)
}

handler.help = ['bertarung *@user*', 'fight *@user*']
handler.tags = ['rpg']
handler.command = /^(fight|bertarung)$/i
handler.register = true
handler.group = true
module.exports = handler

function pickRandom(list) { return list[Math.floor(Math.random() * list.length)] }