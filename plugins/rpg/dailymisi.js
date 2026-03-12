//rpg-dailymisi
const { getUser, updateEconomy, updateUser, updateJob } = require('../../lib/database')
const moment = require('moment-timezone')

let handler = async (m, { conn }) => {
  let user = await getUser(m.sender)
  if (!user) throw 'Anda belum terdaftar di database'

  let kerja5 = Number(user.kerja5 || 0)
  if (kerja5 && kerja5 > Date.now()) {
    let remainingTime = (kerja5 - Date.now()) / 1000 
    let hours = Math.floor(remainingTime / 3600)
    remainingTime %= 3600
    let minutes = Math.floor(remainingTime / 60)
    let seconds = Math.floor(remainingTime % 60)
    let remainingTimeString = `${hours} jam ${minutes} menit ${seconds} detik`
    throw `Anda masih memiliki misi yang sedang berlangsung. Silakan coba lagi dalam *${remainingTimeString}.*`
  }

  m.reply('Anda sedang mengerjakan misi..')
  await new Promise(resolve => setTimeout(resolve, 2000))

  let randomMoney = Math.floor(Math.random() * (1000000 - 10000 + 1) + 10000)
  let randomExp = Math.floor(Math.random() * (1000 - 100 + 1) + 100)
  let randomLimit = Math.floor(Math.random() * (20 - 10 + 1) + 10)

  // Simpan data ke SQL
  await updateEconomy(m.sender, { 
      money: (user.money || 0) + randomMoney,
      limit: (user.limit || 0) + randomLimit
  })
  await updateUser(m.sender, { exp: (user.exp || 0) + randomExp })
  await updateJob(m.sender, { kerja5: Date.now() + 86400000 })

  let replyMsg = `*Selamat Anda Telah Mengerjakan Misi Hari Ini*\n\n◦ *Money:* ${randomMoney}\n◦ *Exp:* ${randomExp}\n◦ *Limit:* ${randomLimit}`
  m.reply(replyMsg)
}

handler.help = ['dailymisi']
handler.tags = ['rpg']
handler.registered = true
handler.command = /^dailymisi$/i

module.exports = handler