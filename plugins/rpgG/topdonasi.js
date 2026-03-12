const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    
    let donasiRecord = guild.donasi && typeof guild.donasi === 'object' ? guild.donasi : {};
    
    if (Object.keys(donasiRecord).length === 0) {
        return m.reply('💤 Buku kas masih kosong. Belum ada satupun anggota yang berdonasi ke markas ini.');
    }

    // Urutkan dari donatur paling sultan ke paling miskin
    let sortedDonasi = Object.entries(donasiRecord).sort((a, b) => b[1] - a[1]);
    
    let txt = `🏆 *PAPAN SKOR DONASI MARKAS* 🏆\n\nGuild: *${guild.name}*\n\n`;
    let rank = 1;
    let memList = Array.isArray(guild.members) ? guild.members : [];

    for (let [jid, amount] of sortedDonasi) {
        let isMember = memList.includes(jid);
        let statusTag = isMember ? '' : ' _(Keluar)_'; // Buat nandain kalau ada donatur yang udah minggat
        
        if (rank === 1) txt += `🥇 `;
        else if (rank === 2) txt += `🥈 `;
        else if (rank === 3) txt += `🥉 `;
        else txt += `🏅 `;

        txt += `@${jid.split('@')[0]}${statusTag}\n💰 Total Sumbangan: Rp ${Number(amount).toLocaleString('id-ID')}\n\n`;
        rank++;
    }

    txt += `_Gunakan command *.gdonasi* untuk menaikkan peringkatmu!_`;

    conn.reply(m.chat, txt.trim(), m, { mentions: sortedDonasi.map(v => v[0]) });
};

handler.help = ['gtopdonasi'];
handler.tags = ['rpgG'];
handler.command = /^(gtopdonasi|topdonasi|logdonasi|logguild)$/i;
module.exports = handler;
