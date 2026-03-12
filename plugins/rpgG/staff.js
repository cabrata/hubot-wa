const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!myGuild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (myGuild.owner !== m.sender) return m.reply('⛔ Hanya Pemilik (Owner) guild yang bisa mengatur posisi Staff.');

    if (!args[0]) return m.reply(`❓ Format yang kamu masukkan salah.\nContoh penggunaan:\n*${usedPrefix + command} tambah @user*\n*${usedPrefix + command} hapus @user*`);

    let action = args[0].toLowerCase();
    let target = m.mentionedJid[0] || (args[1] ? args[1].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);

    if (!target) return m.reply('📍 Tag user yang ingin ditambahkan atau dihapus dari staff.');

    let staffList = Array.isArray(myGuild.staff) ? myGuild.staff : [];
    let memList = Array.isArray(myGuild.members) ? myGuild.members : [];

    if (action === 'tambah' || action === 'add') {
        if (!memList.includes(target)) return m.reply('❌ Orang ini bukan anggota guildmu! Hanya anggota resmi yang bisa diangkat menjadi Staff.');
        if (staffList.includes(target)) return m.reply('⚠️ User tersebut sudah menjabat sebagai Staff.');

        staffList.push(target);
        
        await db.guild.update({ where: { id: myGuild.id }, data: { staff: staffList } });
        conn.reply(m.chat, `🎖️ @${target.split('@')[0]} telah resmi ditambahkan sebagai Staff di guild *${myGuild.name}*.`, m, { mentions: [target] });

    } else if (action === 'hapus' || action === 'remove') {
        if (!staffList.includes(target)) return m.reply('❌ User tersebut tidak sedang menjabat sebagai Staff.');

        staffList = staffList.filter(staff => staff !== target);
        
        await db.guild.update({ where: { id: myGuild.id }, data: { staff: staffList } });
        conn.reply(m.chat, `🔽 @${target.split('@')[0]} telah diturunkan dari posisi Staff guild *${myGuild.name}*.`, m, { mentions: [target] });

    } else {
        conn.reply(m.chat, `❓ Pilihan tidak valid. Gunakan *tambah* atau *hapus*.`, m);
    }
};

handler.help = ['guildstaff <tambah/hapus> <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guildstaff|gstaff)$/i;
handler.register = true;
module.exports = handler;
