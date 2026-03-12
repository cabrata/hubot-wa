const { getUser, updateEconomy, updateUser, updateRpg, addInventory } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix }) => {
    let type = (args[0] || '').toLowerCase()
    let amountStr = (args[1] || '10').toLowerCase()
    let amount = amountStr === 'crate' ? 10 : parseInt(amountStr)

    let user = await getUser(m.sender)
    if (!user) return

    const validCrates = ['common', 'uncommon', 'mythic', 'legendary', 'pet']
    if (!validCrates.includes(type)) {
        return conn.reply(m.chat, `${usedPrefix}open <crate name> < 10 | 100 | 1000 >\n\nContoh penggunaan: *${usedPrefix}open common 10*\n\nlist crate:\n*common*\n*uncommon*\n*mythic*\n*legendary*\n*pet*`, m)
    }

    // LOGIKA PET CRATE
    if (type === 'pet') {
        if ((user.pet || 0) < 1) return m.reply('Pet Crate kamu tidak cukup')
        
        let mknp = Math.floor(Math.random() * 5) + 1
        let pets = ['kucing', 'rubah', 'anjing', 'kuda']
        let selectedPet = pets[Math.floor(Math.random() * pets.length)]
        
        await addInventory(m.sender, 'pet', -1)
        await addInventory(m.sender, 'makananpet', mknp)
        
        if ((user[selectedPet] || 0) > 0) {
            await addInventory(m.sender, 'potion', 2)
            return conn.reply(m.chat, `Anda sudah memiliki pet ${selectedPet}, Hadiahmu diganti dengan 2 potion${mknp > 0 ? ` Dan ${mknp} Makanan Pet` : ''}`, m)
        } else {
            await updateRpg(m.sender, { [selectedPet]: 1 })
            return conn.reply(m.chat, `*Selamat Anda mendapatkan pet ${selectedPet}*${mknp > 0 ? ` Dan ${mknp} Makanan Pet` : ''}`, m)
        }
    }

    // LOGIKA REGULAR CRATE
    if (![10, 100, 1000].includes(amount)) {
        return m.reply(`Hanya support 10, 100, 1000\nContoh penggunaan: *${usedPrefix}open ${type} 10*`)
    }

    if ((user[type] || 0) < amount) {
        return m.reply(`*${type}* crate anda tidak cukup!`)
    }

    // Gacha Limits / Rates Mapping
    const limits = {
        common: {
            10: { money: 500, exp: 700, potion: 3, common: 5, uncommon: 3 },
            100: { money: 5000, exp: 7500, potion: 20, common: 50, uncommon: 30 },
            1000: { money: 50000, exp: 80000, potion: 100, common: 350, uncommon: 200 }
        },
        uncommon: {
            10: { money: 400, exp: 750, diamond: 5, potion: 7, common: 7, uncommon: 4 },
            100: { money: 5000, exp: 8000, diamond: 20, potion: 20, common: 50, uncommon: 25 },
            1000: { money: 50000, exp: 100000, diamond: 50, potion: 100, common: 200, uncommon: 100 }
        },
        mythic: {
            10: { money: 2000, exp: 3000, diamond: 5, potion: 6, common: 11, uncommon: 6, mythic: 4 },
            100: { money: 25000, exp: 30000, diamond: 20, potion: 50, common: 150, uncommon: 80, mythic: 10 },
            1000: { money: 500000, exp: 750000, diamond: 50, potion: 70, common: 750, uncommon: 250, mythic: 50 }
        },
        legendary: {
            10: { money: 10000, exp: 15000, diamond: 16, potion: 30, common: 75, uncommon: 50, mythic: 4, legendary: 2, pet: 6 },
            100: { money: 100000, exp: 200000, diamond: 50, potion: 100, common: 750, uncommon: 250, mythic: 11, legendary: 11, pet: 51 },
            1000: { money: 2000000, exp: 5000000, diamond: 250, potion: 500, common: 2500, uncommon: 1000, mythic: 111, legendary: 51, pet: 222 }
        }
    }

    let drops = limits[type][amount]
    let results = {}
    for (let item in drops) {
        results[item] = Math.floor(Math.random() * drops[item])
    }

    await addInventory(m.sender, type, -amount)

    let txt = `Anda telah membuka *📦${type} crate* dan mendapatkan:\n`
    if (results.money) { txt += `💵 Money: ${results.money.toLocaleString()}\n`; await updateEconomy(m.sender, { money: (user.money || 0) + results.money }) }
    if (results.diamond) { txt += `💎 Diamond: ${results.diamond.toLocaleString()}\n`; await updateEconomy(m.sender, { diamond: (user.diamond || 0) + results.diamond }) }
    if (results.exp) { txt += `✨ Exp: ${results.exp.toLocaleString()}\n`; await updateUser(m.sender, { exp: (user.exp || 0) + results.exp }) }
    
    const invItems = ['potion', 'common', 'uncommon', 'mythic', 'legendary', 'pet']
    for (let i of invItems) {
        if (results[i]) {
            txt += `📦 ${i}: ${results[i]}\n`
            await addInventory(m.sender, i, results[i])
        }
    }

    conn.reply(m.chat, txt.trim(), m)
}

handler.help = ['open <crate>']
handler.tags = ['rpg']
handler.command = /^(open|buka)$/i
handler.register = true
module.exports = handler
