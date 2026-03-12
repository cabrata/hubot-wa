const { getUser, updateCooldown, addInventory } = require('../../lib/database')
const timeout = 28800000 // 8 Jam

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastturu = Number(user.lastturu || 0)
    let time = lastturu + timeout
    
    if (Date.now() - lastturu < timeout) {
        return m.reply(`Anda sudah memulung\nMohon tunggu selama ${msToTime(time - Date.now())} untuk mulung lagi`)
    }
    
    let botolnye = Math.floor(Math.random() * 35)
    let kalengnye = Math.floor(Math.random() * 20)
    let kardusnye = Math.floor(Math.random() * 45)
    
    await addInventory(m.sender, 'botol', botolnye)
    await addInventory(m.sender, 'kaleng', kalengnye)
    await addInventory(m.sender, 'kardus', kardusnye)
    await updateCooldown(m.sender, { lastturu: Date.now() })
    
    conn.reply(m.chat, `Selamat kamu mendapatkan : \n+${botolnye} Botol\n+${kardusnye} Kardus\n+${kalengnye} Kaleng`, m)
}
handler.help = ['mulung']
handler.tags = ['rpg']
handler.command = /^(mulung)/i
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
