const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!myGuild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(myGuild.staff) ? myGuild.staff : [];
    if (myGuild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa membatalkan deklarasi perang.');
    }

    global.guildWars = global.guildWars || {};
    let canceled = false;

    for (let targetId in global.guildWars) {
        if (targetId === myGuild.id || global.guildWars[targetId].challengerId === myGuild.id) {
            delete global.guildWars[targetId];
            canceled = true;
        }
    }

    if (canceled) {
        conn.reply(m.chat, '🏳️ Deklarasi perang / tantangan War berhasil ditarik kembali dan dibatalkan.', m);
    } else {
        conn.reply(m.chat, '💤 Tidak ada tantangan War yang sedang aktif untuk guild ini.', m);
    }
};

handler.help = ['guildwarpause'];
handler.tags = ['rpgG'];
handler.command = /^(guildwarpause|gwarpause|cancelwar)$/i;
handler.register = true;
module.exports = handler;
