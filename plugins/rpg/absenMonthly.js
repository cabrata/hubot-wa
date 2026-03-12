const { getUser, updateEconomy, updateUser, updateCooldown } = require('../../lib/database')

const free = 20000
const prem = 40000
const limitfree = 20
const limitprem = 40
const moneyfree = 20000
const moneyprem = 40000
const timeout = 2592000000 // 30 Hari

let handler = async (m, { conn, isPrems }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastmonthly = Number(user.lastmonthly || 0)
    let time = lastmonthly + timeout

    if (Date.now() - lastmonthly < timeout) {
        return conn.reply(m.chat, `Anda sudah mengklaim hadiah bulanan!\nTunggu selama *${msToTime(time - Date.now())}* lagi`, m)
    }

    let expGain = isPrems ? prem : free
    let moneyGain = isPrems ? moneyprem : moneyfree
    let limitGain = isPrems ? limitprem : limitfree

    await updateUser(m.sender, { exp: (user.exp || 0) + expGain })
    await updateEconomy(m.sender, { 
        money: (user.money || 0) + moneyGain,
        limit: (user.limit || 0) + limitGain
    })
    await updateCooldown(m.sender, { lastmonthly: Date.now() })

    conn.reply(m.chat, `🎉 *KLAIM BULANAN*\n\nSelamat kamu mendapatkan:\n+${expGain} Exp\n+${moneyGain} Money\n+${limitGain} Limit`, m)
}

handler.help = ['monthly']
handler.tags = ['rpg']
handler.command = /^(monthly)$/i
handler.registered = true

module.exports = handler

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24))
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${days} Hari ${hours} Jam ${minutes} Menit`
}
