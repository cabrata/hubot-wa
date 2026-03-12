const { getUser, updateEconomy, addInventory } = require('../../lib/database')

const prices = {
    ayambakar: 20000, ayamgoreng: 15000, rendang: 15000, steak: 20000,
    babipanggang: 50000, gulai: 15000, oporayam: 15000, vodka: 50000,
    sushi: 30000, roti: 10000, ikanbakar: 15000, lelebakar: 15000,
    nilabakar: 15000, bawalbakar: 15000, udangbakar: 15000,
    pausbakar: 200000, kepitingbakar: 20000
}

let handler = async (m, { conn, command, args, usedPrefix }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let type = (args[0] || '').toLowerCase()
    let count = args[1] && !isNaN(args[1]) ? Math.max(parseInt(args[1]), 1) : 1

    let list = `🍽️ *R E S T A U R A N T*\n\n`
    list += `Gunakan format: *${usedPrefix}${command} <makanan> <jumlah>*\nContoh: *${usedPrefix}${command} ayambakar 5*\n\n`
    list += `*Daftar Harga Jual Makanan:*\n`
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

handler.help = ['restaurant <item> <jumlah>']
handler.tags = ['rpg']
handler.command = /^(restaurant|jualmakanan)$/i

module.exports = handler
