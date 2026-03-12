const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);
    if (!target) return m.reply(`Tag member yang ingin dipromosikan!\nContoh: *${usedPrefix + command} @user*`);

    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (guild.owner !== m.sender) return m.reply('⛔ Hanya Pemilik (Owner) guild yang bisa mempromosikan anggota menjadi Staff.');

    let memList = Array.isArray(guild.members) ? guild.members : [];
    let staffList = Array.isArray(guild.staff) ? guild.staff : [];

    if (!memList.includes(target)) return m.reply('❌ User tersebut bukan anggota guild ini.');
    if (staffList.includes(target)) return m.reply('⚠️ User tersebut sudah menjadi staff.');

    staffList.push(target);

    await db.guild.update({
        where: { id: guild.id },
        data: { staff: staffList }
    });

    conn.reply(m.chat, `🎖️ @${target.split('@')[0]} telah dipromosikan menjadi Staff di markas *${guild.name}*.`, m, { mentions: [target] });
};

handler.help = ['guildpromote <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guildpromote|gpromote)$/i;
handler.register = true;
module.exports = handler;
