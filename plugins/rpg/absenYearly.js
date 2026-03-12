const { getUser, updateEconomy, updateUser, updateCooldown } = require('../../lib/database')

const free = 200000
const prem = 400000
const limitfree = 200
const limitprem = 400
const moneyfree = 200000
const moneyprem = 400000
const timeout = 31536000000 // 365 Hari

let handler = async (m, { conn, isPrems }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastyearly = Number(user.lastyearly || 0)
    let time = lastyearly + timeout

    if (Date.now() - lastyearly < timeout) {
        return conn.reply(m.chat, `Anda sudah mengklaim hadiah tahunan!\nTunggu selama *${msToTime(time - Date.now())}* lagi`, m)
    }

    let expGain = isPrems ? prem : free
    let moneyGain = isPrems ? moneyprem : moneyfree
    let limitGain = isPrems ? limitprem : limitfree

    await updateUser(m.sender, { exp: (user.exp || 0) + expGain })
    await updateEconomy(m.sender, { 
        money: (user.money || 0) + moneyGain,
        limit: (user.limit || 0) + limitGain
    })
    await updateCooldown(m.sender, { lastyearly: Date.now() })

    conn.reply(m.chat, `🎉 *KLAIM TAHUNAN*\n\nSelamat kamu mendapatkan:\n+${expGain} Exp\n+${moneyGain} Money\n+${limitGain} Limit`, m)
}

handler.help = ['yearly']
handler.tags = ['rpg']
handler.command = /^(yearly)$/i
handler.registered = true

module.exports = handler

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24))
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${days} Hari ${hours} Jam ${minutes} Menit`
}
