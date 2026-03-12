const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    if (!user) return;

    if (user.guildId || user.guild) return m.reply('❌ Kamu sudah tergabung dalam guild. Keluar dulu jika ingin pindah ke guild lain.');
        let cdTime = 86400000; // 24 Jam
    let lastJoin = Number(user.cooldown?.lastLeaveG || 0); 
    if (Date.now() - lastJoin < cdTime) {
        let ms = cdTime - (Date.now() - lastJoin);
        let h_time = Math.floor(ms / 3600000);
        let m_time = Math.floor((ms / 60000) % 60);
        return m.reply(`⏳ Kamu baru saja keluar dari sebuah markas.\nTunggu *${h_time} Jam ${m_time} Menit* lagi untuk bisa bergabung dengan markas baru.`);
    }

    let guildName = args.join(' ').trim();
    if (!guildName) return m.reply(`❓ Cara penggunaan: *${usedPrefix + command} <nama_guild>*\nContoh: *${usedPrefix + command} Garuda*\n\n_Ketik ${usedPrefix}guildlist untuk melihat nama-nama guild yang ada._`);
    
    let guild = await db.guild.findFirst({ where: { name: guildName } });
    if (!guild) return m.reply(`❌ Guild dengan nama *${guildName}* tidak ditemukan.\nCek kembali penulisan spasi dan huruf besarnya di list.`);

    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];
    let memList = Array.isArray(guild.members) ? guild.members : [];

    if (waitList.includes(m.sender)) return m.reply('⏳ Kamu sudah mengirimkan lamaran ke guild ini. Tunggu di-acc oleh Owner/Staff.');
    
    // Maksimal 50 orang. Tiap level nambah 5.
let maxKapasitas = 10 + (Math.floor(Number(guild.level) / 10) * 2);

    if (memList.length >= maxKapasitas) return m.reply(`🛑 Kapasitas guild penuh! Guild ini hanya bisa menampung ${maxKapasitas} anggota.`);

    waitList.push(m.sender);

    await db.guild.update({ 
        where: { id: guild.id }, 
        data: { waitingRoom: waitList } 
    });

    m.reply(`✅ Lamaran berhasil dikirim ke markas guild *${guild.name}*!\nSilakan tunggu Owner atau Staff untuk menerima lamaranmu.`);
};

handler.help = ['joinguild <nama_guild>'];
handler.tags = ['rpgG'];
handler.command = /^(joinguild|join|gabungguild)$/i;
handler.register = true;
module.exports = handler;
