const { db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let guilds = await db.guild.findMany({
        orderBy: { level: 'desc' }
    });

    if (!guilds || guilds.length === 0) {
        return conn.reply(m.chat, '💤 Belum ada guild yang berdiri di kota ini. Buatlah guild pertamamu!', m);
    }

    let guildList = guilds.map((guild, idx) => {
        let ownerNumber = guild.owner ? guild.owner.split('@')[0] : 'Tidak diketahui';
        let memCount = Array.isArray(guild.members) ? guild.members.length : typeof guild.members === 'string' ? JSON.parse(guild.members).length : 0;
        let maxCap = 10 + (Math.floor(Number(guild.level) / 10) * 2);

        return `*${idx + 1}. ${guild.name}*\n👑 Owner: @${ownerNumber}\n📈 Level: ${guild.level} | 👥 Member: ${memCount}/${maxCap}`;
    }).join('\n\n');

    conn.reply(m.chat, `🏆 *LEADERBOARD GUILD* 🏆\n\n${guildList}\n\n_Ketik .joinguild <nama> untuk bergabung_`, m, {
        mentions: guilds.map(guild => guild.owner).filter(Boolean)
    });
};

handler.help = ['guildlist'];
handler.tags = ['rpgG'];
handler.command = /^(guildlist|listguild|glist)$/i;
handler.register = true
module.exports = handler;
