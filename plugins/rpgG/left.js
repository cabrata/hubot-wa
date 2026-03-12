const { getUser, updateUser, db, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (guild.owner === m.sender) {
        return m.reply('⛔ Kamu adalah Owner guild!\nSeorang pemimpin tidak boleh lari meninggalkan anggotanya. Jika ingin menghapus guild ini, gunakan command *.delguild*');
    }

    let memList = Array.isArray(guild.members) ? guild.members : [];
    let staffList = Array.isArray(guild.staff) ? guild.staff : [];

    memList = memList.filter(jid => jid !== m.sender);
    staffList = staffList.filter(jid => jid !== m.sender);

    await db.guild.update({
        where: { id: guild.id },
        data: { members: memList, staff: staffList }
    });

    await db.user.update({
    where: { jid: m.sender },
    data: { guildId: null }
});
    await updateCooldown(m.sender, { lastLeaveG: Date.now() }); 

    
    conn.reply(m.chat, `🚪 Kamu telah resmi keluar dari guild *${guild.name}*.`, m);
};

handler.help = ['guildleave'];
handler.tags = ['rpgG'];
handler.command = /^(guildleave|gleave|keluarguild)$/i;
handler.register = true;
module.exports = handler;
