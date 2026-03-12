const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (myGuild.owner !== m.sender) return m.reply('⛔ Hanya Owner yang bisa mengajukan proposal Aliansi!');

    let targetName = args.join(' ').trim();
    if (!targetName) return m.reply(`❓ Masukkan nama markas yang ingin diajak bersekutu!\nContoh: *${usedPrefix + command} Garuda*`);

    let targetGuild = await db.guild.findFirst({ where: { name: targetName } });
    if (!targetGuild) return m.reply('❌ Guild tersebut tidak ditemukan di Leaderboard.');
    if (targetGuild.id === myGuild.id) return m.reply('⚠️ Kamu tidak bisa beraliansi dengan dirimu sendiri!');

    let myAllies = Array.isArray(myGuild.aliansi) ? myGuild.aliansi : [];
    if (myAllies.includes(targetGuild.id)) return m.reply(`⚠️ Markasmu sudah beraliansi dengan *${targetGuild.name}*!`);

    // Simpan ajakan ke memory global
    global.guildAlliance = global.guildAlliance || {};
    global.guildAlliance[targetGuild.id] = myGuild.id;

    m.reply(`🤝 *MENGAJUKAN ALIANSI...*\n\nProposal persekutuan telah dikirim ke markas *${targetGuild.name}*.\nMenunggu persetujuan Owner mereka...`);

    conn.reply(targetGuild.owner, `🕊️ *PROPOSAL ALIANSI MASUK!* 🕊️\n\nMarkas *${myGuild.name}* mengajak guildmu untuk bersekutu!\n\nKeuntungan Aliansi:\n- Kebal dari sasaran .gattack satu sama lain.\n- Tidak bisa saling mendeklarasikan .gwar.\n\nKetik *.gallyacc ${myGuild.name}* untuk menerima persekutuan ini!`, null).catch(()=> {});
};
handler.help = ['gally <nama_guild>'];
handler.tags = ['rpgG'];
handler.command = /^(gally|aliansi)$/i;
module.exports = handler;
