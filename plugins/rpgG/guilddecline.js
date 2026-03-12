const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);
    if (!target) return m.reply(`Tag user yang permintaannya ingin ditolak!\nContoh: *${usedPrefix + command} @user*`);

    let user = await getUser(m.sender);
   let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } }); // <-- FIX GUILD ID
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa menolak permintaan bergabung.');
    }

    if (!waitList.includes(target)) {
        return m.reply('❌ User tersebut tidak ada dalam daftar tunggu (Waiting Room).');
    }

    waitList = waitList.filter(jid => jid !== target);

    await db.guild.update({
        where: { id: guild.id },
        data: { waitingRoom: waitList }
    });

    conn.reply(m.chat, `🗑️ Permintaan @${target.split('@')[0]} untuk bergabung telah ditolak.`, m, { mentions: [target] });
};

handler.help = ['guilddecline <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guilddecline|gdecline|tolakguild)$/i;
handler.register = true;
module.exports = handler;
