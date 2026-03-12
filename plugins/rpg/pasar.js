const { getUser, updateEconomy, addInventory } = require('../../lib/database')

// Mapping Harga (Supaya nggak switch-case ratusan baris)
const prices = {
    kepiting: 7000, lobster: 7000, udang: 7000, cumi: 7000, gurita: 7000,
    buntal: 7000, dory: 7000, orca: 7000, lumba: 7000, paus: 7000,
    ikan: 7000, hiu: 7000, banteng: 9000, harimau: 9000, gajah: 9000,
    kambing: 9000, panda: 9000, buaya: 9000, kerbau: 9000, sapi: 9000,
    monyet: 9000, babihutan: 9000, babi: 9000, ayam: 9000
}

let handler = async (m, { conn, args, usedPrefix }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let type = (args[0] || '').toLowerCase()
    let count = args[1] && !isNaN(args[1]) ? Math.max(parseInt(args[1]), 1) : 1

    let list = `🛒 *P A S A R*\n\nGunakan format: *${usedPrefix}pasar <hewan> <jumlah>*\nContoh: *${usedPrefix}pasar sapi 5*\n\n`
    list += `*Daftar Harga Hasil Buruan & Tangkapan:*\n`
    for (let [item, price] of Object.entries(prices)) {
        list += `• ${item.charAt(0).toUpperCase() + item.slice(1)}: Rp ${price.toLocaleString()}\n`
    }

    if (!type || !prices[type]) {
        return conn.reply(m.chat, list.trim(), m)
    }

    let inventoryCount = user[type] || 0
    if (inventoryCount < count) {
        return conn.reply(m.chat, `❌ *${type.charAt(0).toUpperCase() + type.slice(1)}* kamu tidak cukup! Kamu hanya punya ${inventoryCount}.`, m)
    }

    let totalProfit = prices[type] * count

    await addInventory(m.sender, type, -count)
    await updateEconomy(m.sender, { money: (user.money || 0) + totalProfit })

    conn.reply(m.chat, `✅ Sukses menjual *${count} ${type.charAt(0).toUpperCase() + type.slice(1)}* dengan harga *Rp ${totalProfit.toLocaleString()}* Money.`, m)
}

handler.help = ['pasar <item> <jumlah>']
handler.tags = ['rpg']
handler.command = /^(pasar|jual)$/i

module.exports = handler
