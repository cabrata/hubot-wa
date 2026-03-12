//rpg-berburu
const { getUser, updateCooldown, addInventory } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastberburu = Number(user.lastberburu || 0)
    let __timers = (Date.now() - lastberburu)
    let _timers = (3600000 - __timers)
    let timers = clockString(_timers)

    if (Date.now() - lastberburu > 3600000) {
        let rbrb1 = Math.floor(Math.random() * 10)
        let rbrb2 = Math.floor(Math.random() * 10)
        let rbrb3 = Math.floor(Math.random() * 10)
        let rbrb4 = Math.floor(Math.random() * 10)
        let rbrb5 = Math.floor(Math.random() * 10)
        let rbrb6 = Math.floor(Math.random() * 10)
        let rbrb7 = Math.floor(Math.random() * 10)
        let rbrb8 = Math.floor(Math.random() * 10)
        let rbrb9 = Math.floor(Math.random() * 10)
        let rbrb10 = Math.floor(Math.random() * 10)
        let rbrb11 = Math.floor(Math.random() * 10)
        let rbrb12 = Math.floor(Math.random() * 10)

        let hsl = `
• *Hasil Berburu*

 *🐂 = [ ${rbrb1} ]* *🐃 = [ ${rbrb7} ]*
 *🐅 = [ ${rbrb2} ]* *🐮 = [ ${rbrb8} ]*
 *🐘 = [ ${rbrb3} ]* *🐒 = [ ${rbrb9} ]*
 *🐐 = [ ${rbrb4} ]* *🐗 = [ ${rbrb10} ]*
 *🐼 = [ ${rbrb5} ]* *🐖 = [ ${rbrb11} ]*
 *🐊 = [ ${rbrb6} ]* *🐓 = [ ${rbrb12} ]*
`
        // Save semua hewan ke inventory
        await addInventory(m.sender, 'banteng', rbrb1)
        await addInventory(m.sender, 'harimau', rbrb2)
        await addInventory(m.sender, 'gajah', rbrb3)
        await addInventory(m.sender, 'kambing', rbrb4)
        await addInventory(m.sender, 'panda', rbrb5)
        await addInventory(m.sender, 'buaya', rbrb6)
        await addInventory(m.sender, 'kerbau', rbrb7)
        await addInventory(m.sender, 'sapi', rbrb8)
        await addInventory(m.sender, 'monyet', rbrb9)
        await addInventory(m.sender, 'babihutan', rbrb10)
        await addInventory(m.sender, 'babi', rbrb11)
        await addInventory(m.sender, 'ayam', rbrb12)
        
        await updateCooldown(m.sender, { lastberburu: Date.now() })

        setTimeout(() => { m.reply(hsl) }, 11000)
        setTimeout(() => { m.reply('Mendapatkan sasaran!') }, 10000)
        setTimeout(() => { m.reply('Sedang mencari mangsa...') }, 0)
        
    } else {
        m.reply(`\nSepertinya Anda Sudah kecapean, Silahkan Istirahat dulu sekitar *${timers}* Untuk bisa melanjutkan berburu.`)
    }
}

handler.help = ['berburu']
handler.tags = ['rpg']
handler.command = /^(berburu|hunt)$/i
handler.registered = true

module.exports = handler

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}