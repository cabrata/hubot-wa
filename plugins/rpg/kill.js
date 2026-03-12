//rpg-kill
const { getUser, updateEconomy, updateUser, updateCooldown, addInventory } = require('../../lib/database')
const timeout = 604800000 // 1 Minggu

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return
    
    let lastkill = Number(user.lastkill || 0)
    let time = lastkill + timeout
    
    if (Date.now() - lastkill < timeout) {
        return conn.reply(m.chat, `Anda sudah menggunakan kill\nTunggu selama *${msToTime(time - Date.now())}* lagi`, m)
    }
    
    // Logika hadiah
    let money = Math.floor(Math.random() * 30000)
    let exp = Math.floor(Math.random() * 999)
    let kardus = Math.floor(Math.random() * 1000)
    
    let nabungFix = 100000 // Dialihkan ke ATM sesuai schema
    let bankFix = 1000000
    
    // Simpan ke SQL
    await updateEconomy(m.sender, { 
        money: (user.money || 0) + money,
        bank: (user.bank || 0) + bankFix,
        atm: (user.atm || 0) + nabungFix
    })
    await updateUser(m.sender, { exp: (user.exp || 0) + exp })
    await addInventory(m.sender, 'kardus', kardus)
    await updateCooldown(m.sender, { lastkill: Date.now() })
    
    conn.reply(m.chat, `Selamat kamu mendapatkan : \n+${money.toLocaleString()} Money\n+${kardus} Kardus\n+${exp} Exp\n+${bankFix.toLocaleString()} Bank\n+${nabungFix.toLocaleString()} ATM`, m)
}
handler.help = ['kill']
handler.tags = ['rpg']
handler.command = /^(kill)/i
handler.group = true
module.exports = handler

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24));
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  let minutes = Math.floor((duration / 1000 / 60) % 60);
  let seconds = Math.floor((duration / 1000) % 60);
  return `${days} Hari ${hours} Jam ${minutes} Menit ${seconds} Detik`;
}