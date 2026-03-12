const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net' : null);
    if (!target) return m.reply(`Tag user yang ingin kamu cek profilnya!\nContoh: *${usedPrefix + command} @user*`);

    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa mengecek profil pelamar.');
    }

    if (!waitList.includes(target)) {
        return m.reply('❌ User tersebut tidak ada di dalam daftar tunggu (Waiting Room) guild kamu.');
    }

    let targetUser = await getUser(target);
    if (!targetUser) return m.reply('Pengguna tidak terdaftar di database.');

    let targetMoney = Number(targetUser.economy?.money || targetUser.money || 0);

    let applicantInfo = `
📋 *PROFIL PELAMAR GUILD* 📋
👤 Nama: ${targetUser.name || targetUser.pushName || 'Tidak diketahui'}
📛 Username: @${target.split('@')[0]}
📈 Level: ${Number(targetUser.level || 0)}
⚔️ Role: ${targetUser.role || 'Newbie ㋡'}
💰 Uang: Rp ${targetMoney.toLocaleString('id-ID')}
📊 Exp: ${Number(targetUser.exp || 0).toLocaleString('id-ID')}

_Ketik *${usedPrefix}gacc @user* untuk menerima, atau *${usedPrefix}gdecline @user* untuk menolak._
`.trim();

    conn.reply(m.chat, applicantInfo, m, { mentions: [target] });
};

handler.help = ['guildcekpelamar <@user>'];
handler.tags = ['rpgG'];
handler.command = /^(guildcekpelamar|gcek|infoacc)$/i;
handler.register = true;
module.exports = handler;
