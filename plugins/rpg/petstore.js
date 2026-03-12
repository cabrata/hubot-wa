const { getUser, updateRpg, addInventory } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix }) => {
    let type = (args[0] || '').toLowerCase()
    let user = await getUser(m.sender)
    if (!user) return

    let hkucing = 10
    let hanjing = 10
    let hserigala = 25
    let hrubah = 50
    let hphonix = 150

    let logo = `— *P E T   S T O R E* —\n▮▧▧▧▧▧▧▧▧▧▧▧▧▮`
    let caption = `\n🐈 *kucing:* ${hkucing} pet\n🐕 *anjing:* ${hanjing} pet\n🐺 *serigala:* ${hserigala} pet\n🦊 *rubah:* ${hrubah} pet\n🐦‍🔥 *phonix:* ${hphonix} pet\n\n〉 *Example*\n${usedPrefix}adopt kucing`.trim()

    const petPrices = { 
        kucing: hkucing, 
        anjing: hanjing, 
        serigala: hserigala, 
        rubah: hrubah, 
        phonix: hphonix 
    }

    if (!type || !petPrices[type]) {
        return await m.reply(`${logo}\n${caption}`)
    }

    let price = petPrices[type]
    let currentPetTokens = user.pet || 0
    let currentPetLevel = user[type] || 0

    if (currentPetLevel > 0) return m.reply('Kamu sudah memiliki pet ini!')
    if (currentPetTokens < price) {
        return m.reply(`Pet Token anda kurang. Membutuhkan *${price}* token, kamu hanya memiliki *${currentPetTokens}* token.`)
    }

    // Simpan ke Database
    await addInventory(m.sender, 'pet', -price)
    await updateRpg(m.sender, { [type]: 1 })
    
    m.reply(`🎉 Selamat! Kamu telah berhasil mengadopsi pet *${type.charAt(0).toUpperCase() + type.slice(1)}* baru!`)
}

handler.help = ['adopt <pet>']
handler.tags = ['rpg']
handler.command = /^(adopt|petstore)$/i
handler.register = true

module.exports = handler
