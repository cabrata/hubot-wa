const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa melihat daftar lamaran masuk.');
    }

    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];

    if (waitList.length === 0) {
        return m.reply('💤 Kosong. Belum ada yang melamar ke guild ini.');
    }

    let listFormatted = waitList.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`).join('\n');

    conn.reply(m.chat, `📋 *DAFTAR PELAMAR GUILD ${guild.name.toUpperCase()}*\n\n${listFormatted}\n\n_Tips:_\n- Ketik *.gcek @user* untuk melihat profilnya.\n- Ketik *.gacc @user* untuk menerima.\n- Ketik *.gdecline @user* untuk menolak.`, m, { 
        mentions: waitList 
    });
};

handler.help = ['guildlistacc'];
handler.tags = ['rpgG'];
handler.command = /^(guildlistacc|listacc|pelamarguild)$/i;
handler.register = true;
module.exports = handler;
