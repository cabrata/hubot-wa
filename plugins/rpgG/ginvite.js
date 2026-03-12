const { getUser, updateUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);
    if (!target) return m.reply(`Tag user yang ingin kamu rekrut ke guild!\nContoh: *${usedPrefix + command} @user*`);

    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa merekrut anggota baru.');
    }

    let targetUser = await getUser(target);
    if (!targetUser) return m.reply('❌ Target tidak terdaftar di database server.');
    if (targetUser.guildId) return m.reply('❌ Target gagal direkrut karena sudah tergabung dalam guild lain.');

    let memList = Array.isArray(guild.members) ? guild.members : [];
    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];

    // Maksimal 50 orang. Tiap level nambah 5.
let maxKapasitas = 10 + (Math.floor(Number(guild.level) / 10) * 2);

    if (memList.length >= maxKapasitas) {
        return m.reply(`🛑 Kapasitas guild penuh! Maksimal ${maxKapasitas} anggota untuk Guild level ${guild.level}.`);
    }

    waitList = waitList.filter(id => id !== target);
    memList.push(target);

    await db.guild.update({
        where: { id: guild.id },
        data: { members: memList, waitingRoom: waitList }
    });

    await db.user.update({
    where: { jid: target },
    data: { guildId: guild.id }
});


    conn.reply(m.chat, `🎉 Berhasil! @${target.split('@')[0]} telah direkrut dan resmi menjadi anggota guild *${guild.name}*.`, m, { mentions: [target] });
};

handler.help = ['guildinvite <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guildinvite|ginvite|grekrut)$/i;
handler.register = true;
module.exports = handler;
