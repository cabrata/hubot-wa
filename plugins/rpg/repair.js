const { getUser, updateEconomy, addInventory, getTool, setTool } = require('../../lib/database')

let handler = async (m, { conn, command, args, usedPrefix }) => {
    let type = (args[0] || '').toLowerCase()
    let user = await getUser(m.sender)
    if (!user) return

    let validTools = ['fishingrod', 'pickaxe', 'sword', 'armor', 'katana', 'axe', 'bow', 'pisau']

    let caption = `乂 *R E P A I R*\n\n乂 *L I S T - R E P A I R*\n*[ ⛏️ ]* • Pickaxe \n*[ ⚔️ ]* • Sword \n*[ 🎣 ]* • Fishingrod \n*[ 🥼 ]* • Armor \n*[ 🦯 ]* • Katana\n*[ 🪓 ]* • Axe\n*[ 🏹 ]* • Bow\n*[ 🔪 ]* • Pisau\n\n_Example_ :\n${usedPrefix}repair sword`.trim()

    if (!validTools.includes(type)) {
        return await conn.reply(m.chat, caption, m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1, title: wm,
                    thumbnailUrl: 'https://telegra.ph/file/f329ce46c24b0d7e0837e.jpg',
                    renderLargerThumbnail: true, sourceUrl: ''
                }
            }
        })
    }

    let tool = await getTool(m.sender, type)
    if (!tool) {
        return m.reply(`Kamu belum memiliki *${type}* untuk diperbaiki.\nKetik *${usedPrefix}craft ${type}* untuk membuatnya.`)
    }

    // Standarisasi biaya repair
    let cost = { kayu: 10, iron: 10 } 
    if (type === 'armor') cost = { iron: 15, diamond: 1 } 
    else if (type === 'katana' || type === 'sword') cost = { kayu: 10, iron: 15 }

    let userKayu = user.kayu || 0
    let userIron = user.iron || 0 
    let userDiamond = user.diamond || 0

    // Check ketersediaan bahan
    if (cost.kayu && userKayu < cost.kayu) return m.reply(`🪵 Kayu kamu kurang! Butuh ${cost.kayu}, kamu hanya punya ${userKayu}.`)
    if (cost.iron && userIron < cost.iron) return m.reply(`⛓️ Iron kamu kurang! Butuh ${cost.iron}, kamu hanya punya ${userIron}.`)
    if (cost.diamond && userDiamond < cost.diamond) return m.reply(`💎 Diamond kamu kurang! Butuh ${cost.diamond}, kamu hanya punya ${userDiamond}.`)

    // Potong bahan
    if (cost.kayu) await addInventory(m.sender, 'kayu', -cost.kayu)
    
    let ecoUpdates = {}
    if (cost.iron) ecoUpdates.iron = userIron - cost.iron
    if (cost.diamond) ecoUpdates.diamond = userDiamond - cost.diamond
    if (Object.keys(ecoUpdates).length > 0) await updateEconomy(m.sender, ecoUpdates)

    // Reset durability max
    let maxDura = (tool.level || 1) * 50
    await setTool(m.sender, type, { ...tool, durability: maxDura })

    m.reply(`✅ Sukses memperbaiki *${type}*!\nDurability kembali penuh (${maxDura}).`)
}

handler.help = ['repair <item>']
handler.tags = ['rpg']
handler.command = /^(repair|perbaiki)$/i
handler.register = true
module.exports = handler
