//rpg-makan
const { getUser, updateRpg, addInventory } = require('../../lib/database')

let handler = async (m, { command, usedPrefix, args }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let type = (args[0] || '').toLowerCase()
    let count = args[1] && args[1].length > 0 ? Math.max(parseInt(args[1]), 1) : 1

    const list = `「 *E A T I N G* 」
╭──『 ғᴏᴏᴅ 』
│⬡ typing command↓
│   ${usedPrefix + command} rendang
│
│⬡ 🍖 *Ayam bakar* : ${user.ayambakar || 0}
│⬡ 🍗 *Ayam goreng* : ${user.ayamgoreng || 0}
│⬡ 🥘 *Rendang* : ${user.rendang || 0}
│⬡ 🥩 *Steak* : ${user.steak || 0}
│⬡ 🥠 *Babi panggang* : ${user.babipanggang || 0}
│⬡ 🍲 *Gulai ayam* : ${user.gulai || 0}
│⬡ 🍜 *Opor ayam* : ${user.oporayam || 0}
│⬡ 🍷 *Vodka* : ${user.vodka || 0}
│⬡ 🍣 *Sushi* : ${user.sushi || 0}
│⬡ 🍞 *Roti* : ${user.roti || 0}
│⬡ 🍖 *Ikan bakar* : ${user.ikanbakar || 0}
│⬡ 🍖 *Lele bakar* : ${user.lelebakar || 0}
│⬡ 🍖 *Nila bakar* : ${user.nilabakar || 0}
│⬡ 🍖 *Bawal bakar* : ${user.bawalbakar || 0}
│⬡ 🍖 *Udang bakar* : ${user.udangbakar || 0}
│⬡ 🍖 *Paus bakar* : ${user.pausbakar || 0}
│⬡ 🍖 *Kepiting bakar* : ${user.kepitingbakar || 0}
│⬡ 💉 *Bandage* : ${user.bandage || 0}
│⬡ ☘️ *Ganja* : ${user.ganja || 0}
│⬡ 🍺 *Soda* : ${user.soda || 0}
╰───────────────`.trim()

    if (!type) return conn.reply(m.chat, list, m)

    // Pemetaan makanan & jumlah stamina yang ditambahkan
    const foods = {
        'ayambakar': 20, 'ayamgoreng': 20, 'rendang': 20, 'steak': 20, 'babipanggang': 20,
        'gulai': 20, 'oporayam': 20, 'vodka': 25, 'sushi': 20, 'roti': 20,
        'ikanbakar': 20, 'lelebakar': 20, 'nilabakar': 20, 'bawalbakar': 20,
        'udangbakar': 20, 'pausbakar': 20, 'kepitingbakar': 20,
        'bandage': 25, 'ganja': 25, 'soda': 25
    }

    if (!foods[type]) return conn.reply(m.chat, list, m)

    if ((user.stamina || 0) >= 100) {
        return conn.reply(m.chat, `Stamina kamu sudah penuh`, m)
    }

    let inventoryCount = user[type] || 0
    if (inventoryCount < count) {
        return conn.reply(m.chat, `*${type}* kamu kurang! Kamu hanya punya ${inventoryCount}.`, m)
    }

    let staminaGain = foods[type] * count
    let newStamina = Math.min(100, (user.stamina || 0) + staminaGain) // Maksimal Stamina 100

    // Simpan ke Database
    await addInventory(m.sender, type, -count)
    await updateRpg(m.sender, { stamina: newStamina })

    conn.reply(m.chat, `Nyam nyam... (Stamina +${staminaGain})\nStamina kamu sekarang: ${newStamina}/100`, m)
}

handler.help = ['makan <makanan>']
handler.tags = ['rpg']
handler.command = /^(makan|eat)$/i

module.exports = handler