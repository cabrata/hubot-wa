const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });

    // Daftar item yang bisa disumbangkan ke gudang (sesuaikan dengan schema UserEconomy botmu)
    const allowedItems = ['iron', 'emas', 'diamond', 'mythic', 'legendary', 'potion'];
    let item = (args[0] || '').toLowerCase();
    let amount = parseInt(args[1]);

    if (!allowedItems.includes(item) || isNaN(amount) || amount < 1) {
        return m.reply(`❓ *CARA MENYIMPAN BARANG KE GUDANG*\n\nContoh: *${usedPrefix + command} iron 10*\n\n📦 *Barang yang diizinkan:*\n${allowedItems.map(v => '- ' + v).join('\n')}`);
    }

    // Cek item milik user
    let userEco = await db.userEconomy.findUnique({ where: { jid: m.sender } });
    let userRpg = await db.userRpg.findUnique({ where: { jid: m.sender } });

    let isRpgItem = ['potion'].includes(item);
    let userItemCount = isRpgItem ? Number(userRpg?.[item] || 0) : Number(userEco?.[item] || 0);

    if (userItemCount < amount) {
        return m.reply(`❌ *${item.toUpperCase()}* kamu tidak cukup!\nKamu hanya memiliki ${userItemCount} ${item}.`);
    }

    // Potong item dari inventory user
    if (isRpgItem) {
        await db.userRpg.update({ where: { jid: m.sender }, data: { [item]: { decrement: BigInt(amount) } } });
    } else {
        await db.userEconomy.update({ where: { jid: m.sender }, data: { [item]: { decrement: BigInt(amount) } } });
    }

    // Tambah item ke gudang markas
    let storage = guild.storage && typeof guild.storage === 'object' ? guild.storage : {};
    storage[item] = Number(storage[item] || 0) + amount;

    await db.guild.update({
        where: { id: guild.id },
        data: { storage: storage }
    });

    m.reply(`📦 *BERHASIL MENYIMPAN!*\n\nKamu telah memasukkan *${amount}x ${item.toUpperCase()}* ke dalam Gudang Markas.`);
};
handler.help = ['gstore <item> <jumlah>'];
handler.tags = ['rpgG'];
handler.command = /^(gstore|gudangsimpan)$/i;
module.exports = handler;
