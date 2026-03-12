const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!myGuild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(myGuild.staff) ? myGuild.staff : [];
    if (myGuild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa menerima tantangan War.');
    }

    let challengerName = args.join(' ').trim();
    if (!challengerName) return m.reply(`❓ Masukkan nama guild penantang!\nContoh: *${usedPrefix + command} Garuda*`);

    global.guildWars = global.guildWars || {};
    let challenge = global.guildWars[myGuild.id];

    if (!challenge || challenge.challengerName.toLowerCase() !== challengerName.toLowerCase()) {
        return m.reply(`❌ Tidak ada deklarasi perang yang valid dari guild *${challengerName}* ke guild kalian.`);
    }

    let challengerGuild = await db.guild.findUnique({ where: { id: challenge.challengerId } });
    if (!challengerGuild) {
        delete global.guildWars[myGuild.id];
        return m.reply('⚠️ Guild penantang sudah tidak valid atau telah bubar.');
    }

    delete global.guildWars[myGuild.id];

    let { key } = await conn.sendMessage(m.chat, { text: `⚔️ *GUILD WAR DIMULAI!* ⚔️\n\n🛡️ *${myGuild.name}* VS  🗡️ *${challengerGuild.name}*\n\nPasukan kedua belah pihak sedang bertempur hebat di medan perang...` }, { quoted: m });

    setTimeout(async () => {
        try {
            // Refresh data terbaru dari SQL
                        // Refresh data terbaru dari SQL
            myGuild = await db.guild.findUnique({ where: { id: myGuild.id } }); // <-- Kita ambil dari myGuild.id langsung biar aman

            challengerGuild = await db.guild.findUnique({ where: { id: challengerGuild.id } });

            let myMemCount = Array.isArray(myGuild.members) ? myGuild.members.length : 1;
            let chalMemCount = Array.isArray(challengerGuild.members) ? challengerGuild.members.length : 1;

            // FIX: Menggunakan Number() untuk konversi BigInt dari SQL Prisma
            let myLevel = Number(myGuild.level)
            let myElixir = Number(myGuild.eliksir)

            let chalLevel = Number(challengerGuild.level)
            let chalElixir = Number(challengerGuild.eliksir)
            
            let myPower = (myLevel * 500) + (myElixir * 0.1) + (myMemCount * 100) + Math.floor(Math.random() * 2000);
            let chalPower = (chalLevel * 500) + (chalElixir * 0.1) + (chalMemCount * 100) + Math.floor(Math.random() * 2000);

            // --- START: SISTEM BUFF GUILD ---
if (global.guildBuff && global.guildBuff[myGuild.id] && global.guildBuff[myGuild.id].expired > Date.now()) {
    let myBuff = global.guildBuff[myGuild.id].type;
    if (myBuff === 'rage') myPower += (myPower * 0.2); 
    if (myBuff === 'iron') myPower += (myPower * 0.2); 
}

if (global.guildBuff && global.guildBuff[challengerGuild.id] && global.guildBuff[challengerGuild.id].expired > Date.now()) {
    let enemyBuff = global.guildBuff[challengerGuild.id].type;
    if (enemyBuff === 'iron') chalPower += (chalPower * 0.2); 
    if (enemyBuff === 'rage') chalPower += (chalPower * 0.2); 
}
// --- END: SISTEM BUFF GUILD ---
// --- START: SISTEM GUARDIAN ---
// Tambahan Defense untuk Guild Kita
if (myGuild.guardian === '🪨 Golem Batu') myPower += 5000;
if (myGuild.guardian === '👼 Valkyrie') myPower += 15000;
if (myGuild.guardian === '🐉 Naga Api') myPower += 50000;
if (myGuild.guardian === '🗿 Colossal Titan') myPower += 250000;

// Tambahan Defense untuk Guild Penantang
if (challengerGuild.guardian === '🪨 Golem Batu') chalPower += 5000;
if (challengerGuild.guardian === '👼 Valkyrie') chalPower += 15000;
if (challengerGuild.guardian === '🐉 Naga Api') chalPower += 50000;
if (challengerGuild.guardian === '🗿 Colossal Titan') chalPower += 250000;
// --- END: SISTEM GUARDIAN ---

            let winner, loser;
            let isMyGuildWin = myPower > chalPower;

            if (isMyGuildWin) {
                winner = myGuild;
                loser = challengerGuild;
            } else {
                winner = challengerGuild;
                loser = myGuild;
            }

                        let percentage = (Math.floor(Math.random() * 11) + 10) / 100; 
            let elixirLoot = Math.floor(Number(loser.eliksir) * percentage);
            let hartaLoot = Math.floor(Number(loser.harta) * percentage);
            
            // 1. HAPUS BigInt di sini karena exp bertipe Int
            let expWin = 500 + Math.floor(Math.random() * 500); 

            

// Cek buff exp
if (global.guildBuff && global.guildBuff[winner.id] && global.guildBuff[winner.id].type === 'exp') {
    expWin = expWin * 2; // EXP dikali 2
}

            // Update database SQL
            await db.guild.update({
              where: { id: winner.id },
              data: {
                // 2. HAPUS BigInt di eliksir
                eliksir: { increment: elixirLoot }, 
                // harta tetap pakai BigInt
                harta: { increment: BigInt(hartaLoot) },
                // exp cukup lempar angkanya langsung
                exp: { increment: expWin } 
              }
            });

            await db.guild.update({
              where: { id: loser.id },
              data: {
                // 3. HAPUS BigInt di eliksir
                eliksir: Math.max(0, Number(loser.eliksir) - elixirLoot),
                // harta tetap pakai BigInt
                harta: BigInt(Math.max(0, Number(loser.harta) - hartaLoot))
              }
            });


            let report = `🏁 *GUILD WAR SELESAI* 🏁\n\n`;
            report += `🏆 *Pemenang:* ${winner.name} (Power: ${Math.floor(isMyGuildWin ? myPower : chalPower).toLocaleString('id-ID')})\n`;
            report += `☠️ *Kalah:* ${loser.name} (Power: ${Math.floor(isMyGuildWin ? chalPower : myPower).toLocaleString('id-ID')})\n\n`;
            report += `🎁 *Rampasan Perang untuk ${winner.name}:*\n`;
            report += `💧 Eliksir: +${elixirLoot.toLocaleString('id-ID')}\n`;
            report += `💰 Harta: +${hartaLoot.toLocaleString('id-ID')}\n`;
            report += `✨ Exp Guild: +${expWin}\n\n`;
            report += `_Pertahanan markas ${loser.name} telah dijarah!_`;

            await conn.sendMessage(m.chat, { text: report, edit: key });

            if (challengerGuild.owner !== m.sender) {
                conn.reply(challengerGuild.owner, `🔔 *LAPORAN GUILD WAR: ${challengerGuild.name} VS ${myGuild.name}*\n\n${report}`, null).catch(() => {});
            }

        } catch (e) {
            console.log(e);
            conn.sendMessage(m.chat, { text: '⚠️ Terjadi kesalahan internal saat menghitung hasil peperangan.', edit: key });
        }
    }, 5000); 
};

handler.help = ['guildwaracc <nama_guild>'];
handler.tags = ['rpgG'];
handler.command = /^(guildwaracc|gwaracc)$/i;
handler.register = true;
module.exports = handler;
