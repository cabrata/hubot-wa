const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (myGuild.owner !== m.sender) return m.reply('⛔ Hanya Owner yang bisa menerima Aliansi!');

    let targetName = args.join(' ').trim();
    if (!targetName) return m.reply(`❓ Masukkan nama markas yang ingin diterima aliansinya!\nContoh: *${usedPrefix + command} Garuda*`);

    global.guildAlliance = global.guildAlliance || {};
    let challengerId = global.guildAlliance[myGuild.id];

    if (!challengerId) return m.reply(`❌ Tidak ada proposal aliansi yang masuk ke markasmu.`);

    let targetGuild = await db.guild.findUnique({ where: { id: challengerId } });
    if (!targetGuild || targetGuild.name.toLowerCase() !== targetName.toLowerCase()) {
        return m.reply(`❌ Proposal aliansi dari *${targetName}* tidak ditemukan atau sudah dibatalkan.`);
    }

    // Tambahkan ID ke daftar aliansi masing-masing
    let myAllies = Array.isArray(myGuild.aliansi) ? myGuild.aliansi : [];
    let targetAllies = Array.isArray(targetGuild.aliansi) ? targetGuild.aliansi : [];

    if (!myAllies.includes(targetGuild.id)) myAllies.push(targetGuild.id);
    if (!targetAllies.includes(myGuild.id)) targetAllies.push(myGuild.id);

    await db.guild.update({ where: { id: myGuild.id }, data: { aliansi: myAllies } });
    await db.guild.update({ where: { id: targetGuild.id }, data: { aliansi: targetAllies } });

    delete global.guildAlliance[myGuild.id]; // Hapus dari waiting list

    m.reply(`🤝 *ALIANSI TERBENTUK!* 🤝\n\nMarkas *${myGuild.name}* dan *${targetGuild.name}* kini resmi bersekutu!\nKalian tidak akan menyerang satu sama lain.`);
    conn.reply(targetGuild.owner, `🤝 *ALIANSI DITERIMA!* 🤝\n\nMarkas *${myGuild.name}* menerima tawaran persekutuan dari kalian. Kita sekarang adalah sekutu!`, null).catch(()=>{});
};
handler.help = ['gallyacc <nama_guild>'];
handler.tags = ['rpgG'];
handler.command = /^(gallyacc|terimaaliansi)$/i;
module.exports = handler;
