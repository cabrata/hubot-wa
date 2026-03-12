const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!myGuild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (myGuild.owner !== m.sender) return m.reply('⛔ Hanya Owner guild yang dapat mengubah pengaturan keamanan guild.');

    if (!args[0] || !['private', 'public'].includes(args[0].toLowerCase())) {
        return m.reply(`❓ Contoh penggunaan: *${usedPrefix + command} private* atau *${usedPrefix + command} public*\n\n_Note: Jika diset Private, calon member akan masuk Waiting Room. Jika Public, langsung tergabung._`);
    }

    let newSetting = args[0].toLowerCase() === 'private';

    await db.guild.update({
        where: { id: myGuild.id },
        data: { isPrivate: newSetting }
    });

    conn.reply(m.chat, `✅ Pengamanan Guild *${myGuild.name}* berhasil diubah menjadi *${newSetting ? 'Private 🔒' : 'Public 🔓'}*.`, m);
};

handler.help = ['setguild <private|public>'];
handler.tags = ['rpgG'];
handler.command = /^(setguild)$/i;
handler.register = true;
module.exports = handler;
