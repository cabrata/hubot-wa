const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')
const timeout = 1800000 // 30 Menit

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastnambang = Number(user.lastnambang || 0)
    let time = lastnambang + timeout

    if (Date.now() - lastnambang < timeout) {
        return m.reply(`Anda sudah menambang\nMohon tunggu hasil pertambangan mu\nTunggu selama ${msToTime(time - Date.now())} lagi`)
    }
    
    let berlians = Math.floor(Math.random() * 3)
    let emasbiasas = Math.floor(Math.random() * 4)
    let emasbatangs = Math.floor(Math.random() * 3)
    
    await updateEconomy(m.sender, {
        berlian: (user.berlian || 0) + berlians,
        emas: (user.emas || 0) + emasbiasas,
        diamond: (user.diamond || 0) + emasbatangs, // di script lama, ini di-set ke property 'diamond'
        tiketcoin: (user.tiketcoin || 0) + 1
    })
    await updateCooldown(m.sender, { lastnambang: Date.now() })
    
    conn.reply(m.chat, `Selamat kamu mendapatkan : \n+${berlians} Berlian\n+${emasbiasas} Emas\n+${emasbatangs} Diamond\n\n+1 Tiketcoin`, m)
}

handler.help = ['nambang']
handler.tags = ['rpg']
handler.command = /^(nambang)/i
handler.group = true
//handler.limit = true
handler.registered = true

module.exports = handler

function msToTime(duration) {
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
    let minutes = Math.floor((duration / (1000 * 60)) % 60)
    let seconds = Math.floor((duration / 1000) % 60)
    return hours + " jam " + minutes + " menit " + seconds + " detik"
}
