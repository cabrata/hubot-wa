const { getUser, updateEconomy, updateUser, updateCooldown, addInventory } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lasttambang = Number(user.lasttambang || 0)
    let cooldown = 3600000 // 1 Jam
    
    if (Date.now() - lasttambang < cooldown) {
        let remaining = cooldown - (Date.now() - lasttambang)
        let minutes = Math.floor((remaining / 60000) % 60)
        let seconds = Math.floor((remaining / 1000) % 60)
        return m.reply(`⏳ Kamu masih kelelahan sehabis menambang.\nTunggu *${minutes} menit ${seconds} detik* lagi.`)
    }

    const areaNames = [
        "Emas", "Perak", "Berlian", "Batu Permata", "Uranium", "Emas Hitam",
        "Kristal", "Rubi", "Safir", "Topaz", "Ametis", "Zamrud", "Opal"
    ]
    let area = areaNames[Math.floor(Math.random() * areaNames.length)]

    let exp = Math.floor(Math.random() * 500) + 100
    let diamond = Math.floor(Math.random() * 5)
    let emerald = Math.floor(Math.random() * 5)
    let iron = Math.floor(Math.random() * 15)
    let coal = Math.floor(Math.random() * 20)
    let batu = Math.floor(Math.random() * 30)

    // Simpan langsung ke database di awal (menghindari exploit)
    await updateUser(m.sender, { exp: (user.exp || 0) + exp })
    await updateEconomy(m.sender, { 
        diamond: (user.diamond || 0) + diamond,
        emerald: (user.emerald || 0) + emerald
    })
    await addInventory(m.sender, 'iron', iron)
    await addInventory(m.sender, 'coal', coal)
    await addInventory(m.sender, 'batu', batu)
    await updateCooldown(m.sender, { lasttambang: Date.now() })

    let arr = [
        `👷‍♂️ Mempersiapkan peralatan tambang...`,
        `🚶‍♂️ Berjalan menuju *Tambang ${area}*...`,
        `⛏️ Mulai menggali dinding tambang...`,
        `📦 Mengumpulkan hasil tambang...`,
        `🎉 *Ekspedisi Tambang Selesai!*\n\nLokasi: *Tambang ${area}*\n\n🎁 *REWARD:*\n✨ Exp: +${exp}\n💎 Diamond: +${diamond}\n🟩 Emerald: +${emerald}\n⛓️ Iron: +${iron}\n🪨 Batu: +${batu}\n⚫ Coal: +${coal}`
    ]

    let { key } = await conn.sendMessage(m.chat, { text: 'Mencari lokasi tambang...' }, { quoted: m })
    for (let i = 0; i < arr.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await conn.sendMessage(m.chat, { text: arr[i], edit: key })
    }
}

handler.help = ['tambang']
handler.tags = ['rpg']
handler.command = /^(tambang)$/i
handler.group = true
module.exports = handler
