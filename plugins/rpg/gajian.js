//rpg-gajian
const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return
    
    // Gaji disesuaikan ke "Bulanan" (30 Hari) menggunakan schema lastmonthly
    let lastmonthly = Number(user.lastmonthly || 0)
    let time = lastmonthly + 2592000000 // 30 hari dalam milidetik

    if (Date.now() - lastmonthly < 2592000000) {
        throw `Kamu Sudah Ambil Gaji Bulan Ini!\nTunggu selama *${msToTime(time - Date.now())}* lagi`
    }
    
    let gajipokok = 500000
    
    await updateEconomy(m.sender, { money: (user.money || 0) + gajipokok })
    await updateCooldown(m.sender, { lastmonthly: Date.now() })
    
    m.reply(`💳 *SLIP GAJI*\n\nSelamat! Kamu telah menerima Gaji Bulanan sebesar: *Rp${gajipokok.toLocaleString()}* Money`)
}
handler.help = ['gajian']
handler.tags = ['rpg']
handler.command = /^(gaji|gajian)/i
handler.register = true
handler.rpg = true
module.exports = handler

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24));
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  let minutes = Math.floor((duration / 1000 / 60) % 60);
  let seconds = Math.floor((duration / 1000) % 60);

  return `${days} Hari ${hours} Jam ${minutes} Menit ${seconds} Detik`;
}