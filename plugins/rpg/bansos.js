const { updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, command }) => {
    let user = m.user; // Baca pakai m.user
    if (!user) return

    let randomaku = Math.floor(Math.random() * 150)
    let randomkamu = Math.floor(Math.random() * 75) //biar sering ke tangkap wkwk
    
    let lastbansos = Number(user.lastbansos || 0)
    let __timers = (Date.now() - lastbansos)
    let _timers = (3600000 - __timers) 
    let timers = clockString(_timers)

    if (user.money < 5000000) return m.reply(`Uang Anda Harus Diatas 5Juta Untuk Menggunakan Command Ini`)
    
    if (Date.now() - lastbansos > 300000) {
      if (randomaku > randomkamu) {
        // Ganti conn.sendFile jadi conn.sendMessage
        await conn.sendMessage(m.chat, { image: { url: 'https://telegra.ph/file/afcf9a7f4e713591080b5.jpg' }, caption: `Kamu Tertangkap Setelah Kamu korupsi dana bansos🕴️💰,  Dan Kamu harus membayar denda 5 Juta rupiah💵` }, { quoted: m })
        
        // 1. Save permanen ke DB
        await updateEconomy(m.sender, { money: user.money - 5000000 })
        await updateCooldown(m.sender, { lastbansos: Date.now() })
        
        // 2. Update cache memori
        user.money -= 5000000;
        user.lastbansos = Date.now();
        
      } else if (randomaku < randomkamu) {
        // 1. Save permanen ke DB
        await updateEconomy(m.sender, { money: user.money + 5000000 })
        await updateCooldown(m.sender, { lastbansos: Date.now() })
        
        // 2. Update cache memori
        user.money += 5000000;
        user.lastbansos = Date.now();
        
        // Ganti conn.sendFile jadi conn.sendMessage
        await conn.sendMessage(m.chat, { image: { url: 'https://telegra.ph/file/d31fcc46b09ce7bf236a7.jpg' }, caption: `Kamu berhasil  korupsi dana bansos🕴️💰,  Dan Kamu mendapatkan 5 Juta rupiah💵` }, { quoted: m })
      } else {
        m.reply(`Sorry Gan Lu g Berhasil Korupsi bansos Dan Tidak masuk penjara karna Kamu *melarikan diri🏃*`)
        
        await updateCooldown(m.sender, { lastbansos: Date.now() })
        user.lastbansos = Date.now();
      }
    } else m.reply(`Silahkan Menunggu ${timers} Untuk ${command} Lagi`)
}

handler.help = ['korupsi']
handler.tags = ['rpg']
handler.command = /^(bansos|korupsi)$/i
handler.register = true
handler.group = true
handler.rpg = true
module.exports = handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0) ).join(':')
}
