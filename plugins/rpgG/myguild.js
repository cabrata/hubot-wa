const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    // CARI KODE INI:


// UBAH MENJADI:
let user = await getUser(m.sender);
let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');

let guild = await db.guild.findUnique({ where: { id: userGuildId } });

    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan di server.');

    let memList = Array.isArray(guild.members) ? guild.members : [];
    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    let waitList = Array.isArray(guild.waitingRoom) ? guild.waitingRoom : [];

    let membersDisplay = memList.map((member, idx) => `• ${idx + 1}. @${member.split('@')[0]}`).join('\n');
    let staffDisplay = staffList.length > 0 ? staffList.map(staff => `• @${staff.split('@')[0]}`).join('\n') : '-';
    let waitDisplay = waitList.length > 0 ? waitList.map(room => `• @${room.split('@')[0]}`).join('\n') : '-';

        let currentGuardian = guild.guardian || 'Tidak ada ❌';
    let activeBuff = global.guildBuff && global.guildBuff[guild.id] && global.guildBuff[guild.id].expired > Date.now() 
        ? global.guildBuff[guild.id].name 
        : 'Tidak ada ❌';
    
    let guildInfo = `
亗 *NAMA GUILD:* ${guild.name} (${guild.isPrivate ? '🔒 Private' : '🔓 Public'})
亗 *Level:* ${guild.level}
亗 *Pemilik:* @${guild.owner.split('@')[0]}

*=== S T A T U S ===*
📊 Exp Guild: ${Number(guild.exp).toLocaleString('id-ID')} / ${Number(guild.level) * 1000}
💧 Eliksir: ${Number(guild.eliksir).toLocaleString('id-ID')}
💰 Harta: ${Number(guild.harta).toLocaleString('id-ID')}
🔰 Guardian: ${currentGuardian}
🔥 Buff Aktif: ${activeBuff}


*=== S T A F F ===*
${staffDisplay}

*=== A N G G O T A (${memList.length} / ${10 + (Math.floor(Number(guild.level) / 10) * 2)}) ===*
${membersDisplay}

*=== P E N D I N G   R O O M ===*
${waitDisplay}
`.trim();

    conn.reply(m.chat, guildInfo, m, { mentions: [guild.owner, ...memList, ...staffList, ...waitList] });
};

handler.help = ['myguild'];
handler.tags = ['rpgG'];
handler.command = /^(myguild)$/i;
handler.register = true;
module.exports = handler;
