const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    let storage = guild.storage && typeof guild.storage === 'object' ? guild.storage : {};

    if (Object.keys(storage).length === 0) {
        return m.reply('📦 Gudang markas saat ini masih kosong melompong.');
    }

    let txt = `📦 *GUDANG MARKAS ${guild.name.toUpperCase()}* 📦\n\n`;
    for (let item in storage) {
        txt += `▪️ ${item.toUpperCase()}: *${storage[item].toLocaleString('id-ID')}*\n`;
    }
    txt += `\n_Gunakan .gstore <item> <jumlah> untuk menyumbang._`;

    m.reply(txt);
};
handler.help = ['gstorage'];
handler.tags = ['rpgG'];
handler.command = /^(gstorage|gudang)$/i;
module.exports = handler;
