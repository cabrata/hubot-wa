const { getUser, updateEconomy, updateUser, updateCooldown } = require('../../lib/database')

const free = 10000
const prem = 20000
const limitfree = 10
const limitprem = 20
const moneyfree = 10000
const moneyprem = 20000
const timeout = 604800000 // 7 Hari

let handler = async (m, { conn, isPrems }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastweekly = Number(user.lastweekly || 0)
    let time = lastweekly + timeout

    if (Date.now() - lastweekly < timeout) {
        return conn.reply(m.chat, `Anda sudah mengklaim hadiah mingguan!\nTunggu selama *${msToTime(time - Date.now())}* lagi`, m)
    }

    let expGain = isPrems ? prem : free
    let moneyGain = isPrems ? moneyprem : moneyfree
    let limitGain = isPrems ? limitprem : limitfree

    await updateUser(m.sender, { exp: (user.exp || 0) + expGain })
    await updateEconomy(m.sender, { 
        money: (user.money || 0) + moneyGain,
        limit: (user.limit || 0) + limitGain
    })
    await updateCooldown(m.sender, { lastweekly: Date.now() })

    conn.reply(m.chat, `🎉 *KLAIM MINGGUAN*\n\nSelamat kamu mendapatkan:\n+${expGain} Exp\n+${moneyGain} Money\n+${limitGain} Limit`, m)
}

handler.help = ['weekly']
handler.tags = ['rpg']
handler.command = /^(weekly)$/i
handler.registered = true

module.exports = handler

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24))
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${days} Hari ${hours} Jam ${minutes} Menit`
}
