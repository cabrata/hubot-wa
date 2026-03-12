const { getUser, updateUser, updateEconomy, updateCooldown } = require('../../lib/database')

const free = 5000
const prem = 10000
const moneyfree = 5000
const moneyprem = 10000
const timeout = 3600000

let handler = async (m, { conn, isPrems }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lasthourly = Number(user.lasthourly || 0)
    let time = lasthourly + timeout

    if (Date.now() - lasthourly < timeout) {
        return conn.reply(m.chat, `Anda sudah mengklaim harian jam ini\nTunggu selama *${msToTime(time - Date.now())}* lagi`, m)
    }

    let expGain = isPrems ? prem : free
    let moneyGain = isPrems ? moneyprem : moneyfree

    await updateUser(m.sender, { exp: (user.exp || 0) + expGain })
    await updateEconomy(m.sender, { money: (user.money || 0) + moneyGain })
    await updateCooldown(m.sender, { lasthourly: Date.now() })

    conn.reply(m.chat, `Selamat kamu mendapatkan:\n\n+${expGain} Exp\n+${moneyGain} Money`, m)
}

handler.help = ['hourly']
handler.tags = ['rpg']
handler.command = /^(hourly)$/i
handler.registered = true

module.exports = handler

function msToTime(duration) {
  var minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  
  hours = (hours < 10) ? "0" + hours : hours
  minutes = (minutes < 10) ? "0" + minutes : minutes
  
  return hours + " jam " + minutes + " menit"
}
