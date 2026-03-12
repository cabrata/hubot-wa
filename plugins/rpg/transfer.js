const { getUser, updateEconomy, addInventory } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix }) => {
    if (args.length < 3) {
        return conn.reply(m.chat, `Gunakan format ${usedPrefix}tf <type> <jumlah> <@tag>\n📍contoh penggunaan: *${usedPrefix}tf money 100 @tag*\n\n*List yang bisa di transfer :*\n💹 Money\n🏷 Limit\n💳 Tabungan\n🥤 Potion\n🗑️ Sampah\n💎 Diamond\n📦 Common\n🛍️ Uncommon\n🎁 Mythic\n🧰 Legendary\n🕸️ String\n🪵 Kayu\n🪨 Batu\n⛓ Iron`, m)
    }
    
    let type = (args[0] || '').toLowerCase()
    let count = Math.max(1, parseInt(args[1]) || 0)
    let who = m.mentionedJid ? m.mentionedJid[0] : (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net')
    
    if (!who || who === m.sender) throw 'Tag pengguna yang valid untuk ditransfer!'
    
    let senderData = await getUser(m.sender)
    let targetData = await getUser(who)
    
    if (!senderData) return
    if (!targetData) return m.reply('Pengguna yang ditag tidak terdaftar di database.')

    // Object MAP untuk pembersihan if-else
    const typeMap = {
        'money': { db: 'economy', key: 'money' },
        'limit': { db: 'economy', key: 'limit' },
        'tabungan': { db: 'economy', key: 'bank' },
        'diamond': { db: 'economy', key: 'diamond' },
        'potion': { db: 'inventory', key: 'potion' },
        'sampah': { db: 'inventory', key: 'sampah' },
        'common': { db: 'inventory', key: 'common' },
        'uncommon': { db: 'inventory', key: 'uncommon' },
        'mythic': { db: 'inventory', key: 'mythic' },
        'legendary': { db: 'inventory', key: 'legendary' },
        'string': { db: 'inventory', key: 'string' },
        'kayu': { db: 'inventory', key: 'kayu' },
        'batu': { db: 'inventory', key: 'batu' },
        'iron': { db: 'inventory', key: 'iron' }
    }

    if (!typeMap[type]) {
        return m.reply(`Tipe *${type}* tidak valid! Cek list yang bisa ditransfer dengan mengetik *${usedPrefix}tf*`)
    }

    let dbInfo = typeMap[type]
    let senderBal = senderData[dbInfo.key] || 0
    
    if (senderBal < count) {
        return m.reply(`Saldo/Item *${type}* kamu tidak mencukupi! Kamu hanya punya ${senderBal}.`)
    }

    // Proses Transaksi
    if (dbInfo.db === 'economy') {
        await updateEconomy(m.sender, { [dbInfo.key]: senderBal - count })
        await updateEconomy(who, { [dbInfo.key]: (targetData[dbInfo.key] || 0) + count })
    } else if (dbInfo.db === 'inventory') {
        await addInventory(m.sender, dbInfo.key, -count)
        await addInventory(who, dbInfo.key, count)
    }

    conn.reply(m.chat, `✅ Berhasil mentransfer *${count} ${type}* ke @${who.split('@')[0]}`, m, { mentions: [who] })
}

handler.help = ['transfer <type> <jumlah> <@tag>']
handler.tags = ['rpg']
handler.command = /^(transfer|tf)$/i
handler.group = true
module.exports = handler
