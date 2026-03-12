const { updateEconomy, updateUser, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = m.user; // Baca pakai m.user biar ringan
    if (!user) return

    let lastngaji = Number(user.lastngaji || 0)
    let timers = 300000 - (Date.now() - lastngaji)
    
    // FIX [object Promise]: Tambahkan 'await' di sini, atau pakai m.pushName sebagai cadangan
    let name = await conn.getName(m.sender) || m.pushName || 'Murid';
    
    if (timers <= 0) {
        let rbrb4 = Math.floor(Math.random() * 5) * 15729
        let rbrb5 = Math.floor(Math.random() * 10) * 20000

        var dimas = `\nKetemu ustadz...\n`
        var dimas2 = `\nMulai mengaji\n`
        var dimas3 = `     \nDiajarin tajwid\n`
        var dimas4 = `\nNgasih tau, kalo qalqalah itu dipantulkan\n`

        var hsl = `\n*—[ Hasil Ngaji ${name} ]—*\n➕💹 Uang jajan: ${rbrb4}\n➕✨ Exp: ${rbrb5}\n➕🤬 Dimarahin: -1\n`

        // 1. Simpan permanen ke database
        await updateUser(m.sender, { 
            warn: Math.max(0, (user.warn || 0) - 1),
            exp: (user.exp || 0) + rbrb5 
        })
        await updateEconomy(m.sender, { money: (user.money || 0) + rbrb4 })
        await updateCooldown(m.sender, { lastngaji: Date.now() })

        // 2. Update cache m.user lokal
        user.warn = Math.max(0, (user.warn || 0) - 1);
        user.exp = (user.exp || 0) + rbrb5;
        user.money = (user.money || 0) + rbrb4;
        user.lastngaji = Date.now();

        setTimeout(() => { conn.reply(m.chat, `${hsl}`, m) }, 27000) 
        setTimeout(() => { conn.reply(m.chat, `${dimas4}`, m) }, 25000)
        setTimeout(() => { conn.reply(m.chat, `${dimas3}`, m) }, 20000) 
        setTimeout(() => { conn.reply(m.chat, `${dimas2}`, m) }, 15000) 
        setTimeout(() => { conn.reply(m.chat, `${dimas}`, m) }, 10000) 
        setTimeout(() => { conn.reply(m.chat, `Mencari Guru Ngaji.....`, m) }, 0) 
    } else {
        let clock = clockString(timers)
        conn.reply(m.chat, `Sepertinya Kamu Sudah Kecapekan Silahkan Istirahat Dulu Selama\n*${clock}*`, m)
    }
}
handler.help = ['mengaji', 'ngaji']
handler.tags = ['rpg']
handler.command = /^(mengajikeliling|mengaji|ngaji|ustad|ustadz|ustaz)$/i
handler.register = true

module.exports = handler 

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}
