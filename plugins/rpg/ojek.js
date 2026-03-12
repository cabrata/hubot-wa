const { getUser, updateEconomy, updateUser, updateJob, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastngojek = Number(user.lastngojek || 0)
    let __timers = (Date.now() - lastngojek)
    let _timers = (300000 - __timers)
    let order = user.ojek || 0
    let timers = clockString(_timers) 
    let name = conn.getName(m.sender)
    
    if (Date.now() - lastngojek > 300000) {
        let rbrb4 = Math.floor(Math.random() * 5) * 15729
        let rbrb5 = Math.floor(Math.random() * 10) * 200

        let arr = [
            `Mendapatkan Orderan...`, 
            `🚶🛵⬛⬛⬛⬛⬛⬛⬛⬛\n⬛⬜⬜⬜⬛⬜⬜⬜⬛⬛\n⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n🏘️🏘️🏘️🏘️🌳  🌳 🏘️       \n\n\n➕ Mengantar ke tujuan....`, 
            `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n⬛⬜⬜⬛⬛⬜⬜⬜⬛⬛\n⬛⬛⬛⬛⬛⬛⬛🛵⬛⬛\n🏘️🏘️🏘️🏘️🌳  🌳 🏘️       \n\n\n➕ Sampai di tujuan...`, 
            `➕ 💹Menerima gaji....`, 
            `*—[ Hasil Ngojek ${name} ]—*\n ➕ 💹 Uang = [ ${rbrb4} ]\n ➕ ✨ Exp = [ ${rbrb5} ] \t\t \n ➕ 😍 Order Selesai = +1\n➕  📥Total Order Sebelumnya : ${order}\n${global.wm}`
        ]

        // Simpan data di awal supaya kalau bot mati, uang gak hangus
        await updateEconomy(m.sender, { money: (user.money || 0) + rbrb4 })
        await updateUser(m.sender, { exp: (user.exp || 0) + rbrb5 })
        await updateJob(m.sender, { ojek: order + 1 })
        await updateCooldown(m.sender, { lastngojek: Date.now() })

        let { key } = await conn.sendMessage(m.chat, {text: 'Mencari pelanggan.....'})
        for (let i = 0; i < arr.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            await conn.sendMessage(m.chat, { text: arr[i], edit: key });
        }
    } else {
        m.reply(`Sepertinya anda sudah kecapekan silahkan istirahat dulu sekitar\n*${timers}*`)
    }
}
handler.help = ['ojek']
handler.tags = ['rpg']
handler.command = /^(ojek|ngojek|gojek)$/i
handler.register = true

module.exports = handler

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0') ).join(':')
}
