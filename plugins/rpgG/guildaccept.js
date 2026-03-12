const { getUser, updateUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);
    if (!target) return m.reply(`Tag user yang ingin kamu terima!\nContoh: *${usedPrefix + command} @user*`);
    let usTarget = await getUser(target);
    let user = await getUser(m.sender);
   let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan di server.');
   
    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];
    let memList = Array.isArray(guild.members) ? guild.members : [];

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff guild yang bisa menerima anggota.');
    }

    if (!waitList.includes(target)) {
        return m.reply('❌ User tersebut tidak ada dalam daftar tunggu (Waiting Room) guild ini.');
    }
         let cdTime = 86400000; // 24 Jam
    let lastJoin = Number(usTarget.cooldown?.lastLeaveG || 0); 
    if (Date.now() - lastJoin < cdTime) {
        let ms = cdTime - (Date.now() - lastJoin);
        let h_time = Math.floor(ms / 3600000);
        let m_time = Math.floor((ms / 60000) % 60);
        return m.reply(`⏳ Beliau baru saja keluar dari sebuah markas.\nTunggu *${h_time} Jam ${m_time} Menit* lagi untuk bisa bergabung dengan markas baru.`);
    }

    // Maksimal 50 orang. Tiap level nambah 5.
let maxKapasitas = 10 + (Math.floor(Number(guild.level) / 10) * 2);

    if (memList.length >= maxKapasitas) {
        return m.reply(`🛑 Kapasitas guild penuh!\nMaksimal ${maxKapasitas} anggota untuk Guild level ${guild.level}.`);
    }

    waitList = waitList.filter(jid => jid !== target);
    memList.push(target);

    await db.guild.update({
        where: { id: guild.id },
        data: { waitingRoom: waitList, members: memList }
    });

    await db.user.update({
    where: { jid: target },
    data: { guildId: guild.id }
});


    conn.reply(m.chat, `✅ @${target.split('@')[0]} telah resmi bergabung dengan guild *${guild.name}*.`, m, { mentions: [target] });
};

handler.help = ['guildaccept <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guildaccept|accguild|gacc|guildinviteacc)$/i;
handler.register = true;
module.exports = handler;
