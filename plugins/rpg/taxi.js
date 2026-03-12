const { getUser, updateEconomy, updateUser, updateJob, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lasttaxi = Number(user.lasttaxi || 0)
    let __timers = (Date.now() - lasttaxi)
    let _timers = (3600000 - __timers)
    let order = user.taxi || 0
    
    let name = conn.getName(m.sender)
    
    if (Date.now() - lasttaxi > 3600000) {
        let randomaku1 = Math.floor(Math.random() * 1000000)
        let randomaku2 = Math.floor(Math.random() * 10000)
        
        var njir = `\n🚶⬛⬛⬛⬛⬛⬛⬛⬛⬛\n⬛⬜⬜⬜⬛⬜⬜⬜⬛⬛\n⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n🏘️🏘️🏘️🏘️🌳  🌳 🏘️       🚕\n\n\n✔️ Mendapatkan orderan....\n`.trim()
        var njirr = `\n🚶⬛⬛⬛⬛⬛🚐⬛⬛⬛🚓🚚\n🚖⬜⬜⬜⬛⬜⬜⬜🚓⬛🚑\n⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n🏘️🏘️🏘️🏘️🌳  🌳 🏘️\n\n\n✔️ Menjemput Penumpang....\n`.trim()
        var njirrr = `\n🚶⬛⬛⬛⬛⬛🚐⬛⬛⬛🚓🚚\n⬛⬜⬜⬜⬛⬜⬜⬜🚓🚖🚑\n⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n🏘️🏘️🏘️🏘️🌳  🌳 🏘️\n\n\n🚖 Selesai Mengantar Pelanggan....\n`.trim()
        var njirrrr = `\n➕ 💹Menerima gaji....\n`.trim()
        var hasil = `\n*—[ Hasil taxi ${name} ]—*\n➕ 💹 Uang = [ ${randomaku1.toLocaleString()} ]\n➕ ✨ Exp = [ ${randomaku2.toLocaleString()} ]\n➕ 😍 Order Selesai = +1\n➕ 📥Total Order Sebelumnya : ${order}\n`.trim()

        // Amankan data ke database di awal eksekusi
        await updateEconomy(m.sender, { money: (user.money || 0) + randomaku1 })
        await updateUser(m.sender, { exp: (user.exp || 0) + randomaku2 })
        await updateJob(m.sender, { taxi: order + 1 })
        await updateCooldown(m.sender, { lasttaxi: Date.now() })
        
        // Animasi pakai Edit Message agar grup ga spam
        let { key } = await conn.sendMessage(m.chat, { text: '🔍Mencari orderan buat kamu.....' }, { quoted: m })
        
        let arr = [njir, njirr, njirrr, njirrrr, hasil]
        for (let i = 0; i < arr.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 4000))
            await conn.sendMessage(m.chat, { text: arr[i], edit: key })
        }
    } else {
        let h = Math.floor(_timers / 3600000)
        let m_time = Math.floor(_timers / 60000) % 60
        let s = Math.floor(_timers / 1000) % 60
        let timers = `${h} Jam ${m_time} Menit ${s} Detik`
        m.reply(`Kamu kecapean sehabis nyetir!\nIstirahat dulu selama ${timers}, baru gas ngorder lagi.`)
    }
}

handler.help = ['taxi']
handler.tags = ['rpg']
handler.command = /^(taxi|ngetaxi)$/i
handler.group = true
module.exports = handler
