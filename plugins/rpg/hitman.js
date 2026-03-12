//rpg-hitman
const { getUser, updateEconomy, updateUser, updateJob } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender)
    if (!user) return

    // Menggunakan kerja4 sesuai dengan skema JSON Job
    let kerja4 = Number(user.kerja4 || 0)
    let __timers = (Date.now() - kerja4)
    let _timers = (3600000 - __timers)
    let timers = clockString(_timers)
    let name = conn.getName(m.sender)
    let id = m.sender
    let kerja = 'Bunuh'
    
    conn.misi = conn.misi ? conn.misi : {}
    if (id in conn.misi) {
        return conn.reply(m.chat, `Selesaikan Misi ${conn.misi[id][0]} Terlebih Dahulu`, m)
    }

    if (Date.now() - kerja4 > 3600000) {
        let randomaku4 = Math.floor(Math.random() * 10)
        let randomaku5 = Math.floor(Math.random() * 10)

        let rbrb4 = (randomaku4 * 100000)
        let rbrb5 = (randomaku5 * 1000)

        var dimas = `\n🕵️ Mendapatkan Target.....\n`.trim()
        var dimas2 = `\n⚔️ Menusuk Tubuhnya.....\n`.trim()
        var dimas3 = `\n☠️ Target meninggal\nDan kamu mengambil barang² nya\n`.trim()
        var dimas4 = `\n💼 Hasil dari membunuh....\n`.trim()

        var hsl = `
*—[ Hasil ${name} ]—*
➕ 💹 Uang = [ ${rbrb4} ]
➕ ✨ Exp = [ ${rbrb5} ]
➕ 👮 Pelanggaran +1
➕ ☑️ Misi Berhasil = +1
`.trim()

        // Simpan langsung ke SQL
        await updateEconomy(m.sender, { money: (user.money || 0) + rbrb4 })
        await updateUser(m.sender, { exp: (user.exp || 0) + rbrb5, warn: (user.warn || 0) + 1 })
        await updateJob(m.sender, { kerja4: Date.now() })

        conn.misi[id] = [
            kerja,
            setTimeout(() => {
                delete conn.misi[id]
            }, 27000)
        ]
        
        setTimeout(() => { m.reply(hsl) }, 27000)
        setTimeout(() => { m.reply(dimas4) }, 25000)
        setTimeout(() => { m.reply(dimas3) }, 20000)
        setTimeout(() => { m.reply(dimas2) }, 15000)
        setTimeout(() => { m.reply(dimas) }, 10000)
        setTimeout(() => { m.reply('🔍Mencari Target pembunuhan.....') }, 0)
        
    } else {
        m.reply(`Silahkan Menunggu Selama ${timers}, Untuk Menyelesaikan Misi Kembali`)
    }
}
handler.help = ['hitman']
handler.tags = ['rpg']
handler.command = /^(bunuh|hitman)$/i
handler.register = true
handler.group = true
handler.level = 10
module.exports = handler

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}