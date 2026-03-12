const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (guild.owner !== m.sender) return m.reply('⛔ Hanya Owner guild yang bisa membubarkan/menghapus guild.');

    // Hapus referensi guild dari semua anggota di database
    let members = Array.isArray(guild.members) ? guild.members : [];
    for (let memberId of members) {
        await db.user.update({ 
            where: { jid: memberId }, 
            data: { guildId: null } // <-- FIX PRISMA COLUMN
        }).catch(() => {}); 
    }

    // Hapus guild dari database
    await db.guild.delete({ where: { id: guild.id } });

    conn.reply(m.chat, `🗑️ Guild *${guild.name}* telah resmi dibubarkan dan dihapus dari sistem. Seluruh anggota telah dikeluarkan.`, m);
};

handler.help = ['delguild'];
handler.tags = ['rpgG'];
handler.command = /^(delguild|deleteguild|hapusguild)$/i;
handler.register = true;
module.exports = handler;
