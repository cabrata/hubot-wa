//rpg-bonus
const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastGift = Number(user.lastgift || 0)
    let time = lastGift + 86400000
    
    if (Date.now() - lastGift < 86400000) {
        throw `Kamu Sudah Ambil Bonus Hari Ini\nTunggu selama ${msToTime(time - Date.now())} lagi`
    }
    
    let money = Math.floor(Math.random() * 50000)
    
    await updateEconomy(m.sender, { money: user.money + money })
    await updateCooldown(m.sender, { lastgift: Date.now() })
    
    m.reply(`Selamat Kamu Mendapatkan Bonus : \n+${money} Money`)
}
handler.help = ['bonus']
handler.tags = ['rpg']
handler.command = /^(bonus)/i
handler.register = true
module.exports = handler

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
    
  hours = (hours < 10) ? "0" + hours : hours
  minutes = (minutes < 10) ? "0" + minutes : minutes
  seconds = (seconds < 10) ? "0" + seconds : seconds

  return hours + " jam " + minutes + " menit " + seconds + " detik"
}