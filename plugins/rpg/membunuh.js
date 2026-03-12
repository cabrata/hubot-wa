const { getUser, updateEconomy, updateRpg, updateCooldown } = require('../../lib/database')
const timeout = 3600000 // 1 Jam

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let dapat = Math.floor(Math.random() * 100000)
    let healtu = Math.floor(Math.random() * 100)
    
    let who
    if (m.isGroup) who = m.mentionedJid[0]
    else who = m.chat
    
    if (!who) return conn.reply(m.chat, 'Tag salah satu lah', m)
    
    let user = await getUser(m.sender)
    let target = await getUser(who)

    if (!user) return
    if (!target) return conn.reply(m.chat, 'Pengguna tidak ada didalam data base', m)
    
    let lastbunuhi = Number(user.lastbunuhi || 0)
    if (Date.now() - lastbunuhi < timeout) {
        let __timers = (Date.now() - lastbunuhi)
        let _timers = (timeout - __timers) 
        let timers = clockString(_timers)
        return conn.reply(m.chat, `Anda sudah membunuh orang dan berhasil sembunyi , tunggu ${timers} untuk membunuhnya lagi`, m)
    }
    
    if ((target.health || 0) < 10) return m.reply('Target sudah tidak memiliki health')
    if ((target.money || 0) < 100) return m.reply('Target terlalu miskin :(')
    
    // Kalkulasi aman biar nggak minus
    let newTargetHealth = Math.max(0, (target.health || 0) - healtu)
    let newTargetMoney = Math.max(0, (target.money || 0) - dapat)
    let actualStolen = (target.money || 0) - newTargetMoney
    
    await updateRpg(who, { health: newTargetHealth })
    await updateEconomy(who, { money: newTargetMoney })
    await updateEconomy(m.sender, { money: (user.money || 0) + actualStolen })
    await updateCooldown(m.sender, { lastbunuhi: Date.now() })
    
    conn.reply(m.chat, `Target berhasil di bunuh dan kamu mengambil money target sebesar\n${actualStolen.toLocaleString()} Money\nDarah target berkurang -${healtu} Health`, m)
}

handler.help = ['membunuh *@user*']
handler.tags = ['rpg']
handler.command = /^(membunuh|bunuh)$/i
handler.group = true
handler.registered = true

module.exports = handler

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0) ).join(':')
}
