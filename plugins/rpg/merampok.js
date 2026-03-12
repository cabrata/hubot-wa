const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')
const timeout = 3600000 // 1 Jam

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let dapat = Math.floor(Math.random() * 100000)
    
    let who
    if (m.isGroup) who = m.mentionedJid[0]
    else who = m.chat
    
    if (!who) return conn.reply(m.chat, 'Tag salah satu lah yang mau dirampok', m)
    
    let user = await getUser(m.sender)
    let target = await getUser(who)

    if (!user) return
    if (!target) return conn.reply(m.chat, 'Pengguna tidak ada didalam data base', m)
    
    let lastrob = Number(user.lastrob || 0)
    if (Date.now() - lastrob < timeout) {
        let __timers = (Date.now() - lastrob)
        let _timers = (timeout - __timers) 
        let timers = clockString(_timers)
        return conn.reply(m.chat, `Anda Sudah merampok dan berhasil sembunyi , tunggu ${timers} untuk merampok lagi`, m)
    }
    
    if ((target.money || 0) < 10000) return m.reply('Target Gaada Uang bodoh, Kismin dia')
    
    // Kalkulasi aman biar target nggak jadi miskin minus (-)
    let newTargetMoney = Math.max(0, (target.money || 0) - dapat)
    let actualStolen = (target.money || 0) - newTargetMoney
    
    await updateEconomy(who, { money: newTargetMoney })
    await updateEconomy(m.sender, { money: (user.money || 0) + actualStolen })
    await updateCooldown(m.sender, { lastrob: Date.now() })
    
    conn.reply(m.chat, `Berhasil Merampok Money Target Sebesar ${actualStolen.toLocaleString()}`, m)
}

handler.help = ['merampok *@user*']
handler.tags = ['rpg']
handler.command = /^(merampok|rampok)$/i
handler.group = true
handler.registered = true
module.exports = handler

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0) ).join(':')
}
