//rpg-health
const { getUser, updateRpg, addInventory } = require('../../lib/database')

let handler = async (m, { args, usedPrefix }) => {
    let user = await getUser(m.sender)
    if (!user) return

    // 🛡️ FIX: Bungkus pakai Number() biar BigInt dari database berubah jadi angka normal
    let currentHealth = Number(user.health || 0)
    let currentPotion = Number(user.potion || 0)
    const maxHealth = 100
    const healAmount = 50

    if (currentHealth >= maxHealth) {
        return m.reply(`\n❤️ Health kamu sudah penuh!\n`.trim())
    }

    // Hitung berapa potion yang dibutuhkan secara logika
    let potionNeeded = Math.ceil((maxHealth - currentHealth) / healAmount)
    
    // Tentukan jumlah potion yang dipakai (dari argumen user ATAU otomatis)
    let count = args[0] ? parseInt(args[0]) : potionNeeded
    count = Math.max(1, count)

    if (currentPotion < count) {
        return m.reply(`\n🧃 Potion kamu tidak cukup, kamu hanya memiliki *${currentPotion}* 🧃Potion.\nKetik *${usedPrefix}buy potion ${count - currentPotion}* untuk membelinya.\n`.trim())
    }

    // Mencegah health melebihi batas (over-heal bug)
    let newHealth = Math.min(maxHealth, currentHealth + (healAmount * count))

    await addInventory(m.sender, 'potion', -count)
    await updateRpg(m.sender, { health: newHealth })

    m.reply(`\nBerhasil menggunakan *${count}* 🧃Potion(s).\n❤️ Health sekarang: ${newHealth}/${maxHealth}\n`.trim())
}

handler.help = ['heal *jumlah*']
handler.tags = ['rpg']
handler.command = /^(heal|use)$/i
handler.registered = true

module.exports = handler
