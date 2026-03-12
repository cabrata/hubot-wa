const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } }); // <-- FIX GUILD ID
    if (!myGuild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(myGuild.staff) ? myGuild.staff : [];
    if (myGuild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa mendeklarasikan perang (War).');
    }

    let enemyGuildName = args.join(' ').trim();
    if (!enemyGuildName) return m.reply(`❓ Masukkan nama guild lawan yang ingin ditantang!\nContoh: *${usedPrefix + command} Garuda*`);

    let enemyGuild = await db.guild.findFirst({ where: { name: enemyGuildName } });
    if (!enemyGuild) return m.reply(`❌ Guild dengan nama *${enemyGuildName}* tidak ditemukan di daftar Leaderboard.`);

    if (enemyGuild.id === myGuild.id) return m.reply('⚠️ Kamu tidak bisa menantang guildmu sendiri!');

    let myAllies = Array.isArray(myGuild.aliansi) ? myGuild.aliansi : [];
if (myAllies.includes(enemyGuild.id)) {
    return m.reply(`🛡️ Kamu tidak bisa mendeklarasikan perang terhadap *${enemyGuild.name}* karena markas kalian saling bersekutu (Aliansi)!`);
}

    global.guildWars = global.guildWars || {};
    
    if (global.guildWars[enemyGuild.id] && global.guildWars[enemyGuild.id].challengerId === myGuild.id) {
        return m.reply('⏳ Kalian sudah mengirimkan tantangan War ke guild ini. Tunggu mereka menerimanya!');
    }

    global.guildWars[enemyGuild.id] = {
        challengerId: myGuild.id,
        challengerName: myGuild.name,
        timestamp: Date.now()
    };

    m.reply(`⚔️ *DEKLARASI PERANG DIKIRIM!* ⚔️\n\nGuild *${myGuild.name}* telah menantang guild *${enemyGuild.name}*.\n\nMenunggu Owner/Staff musuh untuk menerima tantangan...`);
    
    conn.reply(enemyGuild.owner, `⚠️ *PANGGILAN PERANG!* ⚠️\n\nMarkas guildmu (*${enemyGuild.name}*) telah ditantang War oleh *${myGuild.name}*!\n\nKetik *.gwaracc ${myGuild.name}* di dalam bot/grup untuk menerima tantangan ini dan memulai pertempuran!`, null).catch(() => {});
};

handler.help = ['guildwar <nama_guild>'];
handler.tags = ['rpgG'];
handler.command = /^(guildwar|gwar)$/i;
handler.register = true;
module.exports = handler;
