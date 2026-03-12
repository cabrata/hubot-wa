const { getUser, updateCooldown, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');

let myGuild = await db.guild.findUnique({ where: { id: userGuildId } });

    let lastwar = Number(user.cooldown?.lastwar || user.lastwar || 0);
    let cooldownTime = 3600000; 
    if (Date.now() - lastwar < cooldownTime) {
        let remaining = cooldownTime - (Date.now() - lastwar);
        let m_time = Math.floor((remaining / 60000) % 60);
        let s_time = Math.floor((remaining / 1000) % 60);
        return m.reply(`⏳ Pasukan guild kamu masih kelelahan.\nTunggu *${m_time} Menit ${s_time} Detik* lagi untuk menyerang.`);
    }

    
    if (!myGuild) return m.reply('⚠️ Guild Anda tidak ditemukan di database.');

    let staffList = Array.isArray(myGuild.staff) ? myGuild.staff : [];
    if (myGuild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Anda tidak memiliki izin komando. Hanya Owner dan Staff yang bisa memimpin penyerangan!');
    }

    let { key } = await conn.sendMessage(m.chat, { text: '🔎 *Mencari Markas Guild Aktif...*' }, { quoted: m });

    setTimeout(async () => {
        try {
            let myAllies = Array.isArray(myGuild.aliansi) ? myGuild.aliansi : [];
// Filter musuh, jangan serang ID yang ada di daftar sekutu
let allGuilds = await db.guild.findMany({ where: { id: { not: myGuild.id } } });
let validEnemies = allGuilds.filter(g => !myAllies.includes(g.id));

if (validEnemies.length === 0) {
    return conn.sendMessage(m.chat, { text: '💤 Tidak ada guild musuh yang dapat diserang saat ini (Hanya tersisa sekutu).', edit: key });
}
let enemyGuild = validEnemies[Math.floor(Math.random() * validEnemies.length)];


            await conn.sendMessage(m.chat, { text: `⚔️ *TARGET DITEMUKAN!*\nMenyerang markas: *${enemyGuild.name}*\n\nPasukan sedang bertempur...`, edit: key });

            setTimeout(async () => {
                // FIX NUMBER BIGINT AGAR TIDAK CRASH
                let myPower = (Number(myGuild.level) * 100) + (Number(myGuild.eliksir) * 0.1) + Math.floor(Math.random() * 500);
                let enemyPower = (Number(enemyGuild.level) * 100) + (Number(enemyGuild.eliksir) * 0.1) + Math.floor(Math.random() * 500);

                // --- START: SISTEM GUARDIAN ---
// Tambahan Defense untuk Guild Kita
if (myGuild.guardian === '🪨 Golem Batu') myPower += 5000;
if (myGuild.guardian === '👼 Valkyrie') myPower += 15000;
if (myGuild.guardian === '🐉 Naga Api') myPower += 50000;
if (myGuild.guardian === '🗿 Colossal Titan') myPower += 250000;

// Tambahan Defense untuk Guild Musuh (Kalau musuh punya)
if (enemyGuild.guardian === '🪨 Golem Batu') enemyPower += 5000;
if (enemyGuild.guardian === '👼 Valkyrie') enemyPower += 15000;
if (enemyGuild.guardian === '🐉 Naga Api') enemyPower += 50000;
if (enemyGuild.guardian === '🗿 Colossal Titan') enemyPower += 250000;
// --- END: SISTEM GUARDIAN ---



                if (myPower > enemyPower) {
                    let elixirStolen = Math.floor(Math.random() * 1000) + (Number(enemyGuild.level) * 50);
                    let treasureStolen = Math.floor(Math.random() * 500000) + (Number(enemyGuild.level) * 10000);
                    
                    elixirStolen = Math.min(elixirStolen, Number(enemyGuild.eliksir));
                    treasureStolen = Math.min(treasureStolen, Number(enemyGuild.harta));

                    await db.guild.update({
                        where: { id: myGuild.id },
                        data: { 
                            eliksir: Number(myGuild.eliksir) + elixirStolen,
                            harta: Number(myGuild.harta) + treasureStolen,
                            exp: Number(myGuild.exp) + 100
                        }
                    });

                    await db.guild.update({
                        where: { id: enemyGuild.id },
                        data: { 
                            eliksir: Math.max(0, Number(enemyGuild.eliksir) - elixirStolen),
                            harta: Math.max(0, Number(enemyGuild.harta) - treasureStolen)
                        }
                    });

                    let winMsg = `🏆 *VICTORY! Guild ${myGuild.name} Menang!*\n\n`;
                    winMsg += `Pertahanan markas *${enemyGuild.name}* berhasil dijebol.\n\n`;
                    winMsg += `🎁 *Loot Rampasan:*\n`;
                    winMsg += `💧 Eliksir: +${elixirStolen}\n`;
                    winMsg += `💰 Harta: +${treasureStolen.toLocaleString('id-ID')}\n`;
                    winMsg += `✨ Guild Exp: +100`;

                    await conn.sendMessage(m.chat, { text: winMsg, edit: key });

                } else {
                    let defMsg = `☠️ *DEFEAT! Guild ${myGuild.name} Kalah...*\n\n`;
                    defMsg += `Pasukanmu dipukul mundur oleh pertahanan kuat *${enemyGuild.name}*.\n`;
                    defMsg += `Tingkatkan level dan eliksir guildmu untuk pertempuran berikutnya!`;
                    
                    await conn.sendMessage(m.chat, { text: defMsg, edit: key });
                }

                await updateCooldown(m.sender, { lastwar: Date.now() });

            }, 3500);

        } catch (e) {
            conn.sendMessage(m.chat, { text: '⚠️ Terjadi kesalahan internal saat mencari musuh.', edit: key });
        }
    }, 2500);
};

handler.help = ['guildattack'];
handler.tags = ['rpgG'];
handler.command = /^(guildattack|gattack)$/i;
handler.group = true;
handler.register = true;
module.exports = handler;
