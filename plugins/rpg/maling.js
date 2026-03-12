//rpg-maling
const { getUser, updateEconomy, updateUser, updateCooldown, addInventory } = require('../../lib/database')
const timeout = 604800000 // 1 Minggu

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return
    
    let lastmaling = Number(user.lastmaling || 0)
    let time = lastmaling + timeout
    
    if (Date.now() - lastmaling < timeout) {
        return conn.reply(m.chat, `Anda sudah merampok bank\nTunggu selama ${msToTime(time - Date.now())} lagi`, m)
    }
    
    let money = Math.floor(Math.random() * 30000)
    let exp = Math.floor(Math.random() * 999)
    let kardus = Math.floor(Math.random() * 1000)
    
    await updateEconomy(m.sender, { money: (user.money || 0) + money })
    await updateUser(m.sender, { exp: (user.exp || 0) + exp })
    await addInventory(m.sender, 'kardus', kardus)
    await updateCooldown(m.sender, { lastmaling: Date.now() })
    
    conn.reply(m.chat, `Selamat kamu mendapatkan : \n+${money} Money\n+${kardus} Kardus\n+${exp} Exp`, m)
}
handler.help = ['maling']
handler.tags = ['rpg']
handler.command = /^(maling)/i
module.exports = handler

function msToTime(duration) {
  var hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  var minutes = Math.floor((duration / (1000 * 60)) % 60)
  var seconds = Math.floor((duration / 1000) % 60)
  return hours + " jam " + minutes + " menit " + seconds + " detik"
}