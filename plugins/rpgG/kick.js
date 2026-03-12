const { getUser, updateUser, db, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);
    if (!target) return m.reply(`Tag user yang ingin kamu kick!\nContoh: *${usedPrefix + command} @user*`);

    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa mengeluarkan anggota.');
    }

    if (target === guild.owner) return m.reply('❌ Kamu tidak bisa nge-kick Owner guild!');
    if (target === m.sender) return m.reply('❌ Kalau mau keluar, gunakan command *.guildleave* !');

    let memList = Array.isArray(guild.members) ? guild.members : [];
    if (!memList.includes(target)) return m.reply('❌ User tersebut bukan anggota guild ini.');

    memList = memList.filter(jid => jid !== target);
    staffList = staffList.filter(jid => jid !== target);

    await db.guild.update({
        where: { id: guild.id },
        data: { members: memList, staff: staffList }
    });

    await db.user.update({
    where: { jid: target },
    data: { guildId: null }
});
    await updateCooldown(m.sender, { lastLeaveG: Date.now() }); 



    conn.reply(m.chat, `👢 @${target.split('@')[0]} berhasil dikeluarkan secara paksa dari guild *${guild.name}*.`, m, { mentions: [target] });
};

handler.help = ['guildkick <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guildkick|gkick)$/i;
handler.register = true;
module.exports = handler;
