const { getUser, updateCooldown, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    global.guildBoss = global.guildBoss || {};
    let boss = global.guildBoss[userGuildId];

    if (!boss) return m.reply('💤 Tidak ada Boss yang sedang menyerang markas. Minta Owner/Staff ketik *.gboss* untuk memanggil.');

    // Cek Cooldown (Pakai kolom lastbossbattle di database lu)
    let lastBattle = Number(user.cooldown?.lastbossbattle || user.lastbossbattle || 0); 
    let cdTime = 3600000; // 1 Jam
    if (Date.now() - lastBattle < cdTime) {
        let ms = cdTime - (Date.now() - lastBattle);
        let m_time = Math.floor((ms / 60000) % 60);
        let s_time = Math.floor((ms / 1000) % 60);
        return m.reply(`⏳ Kamu masih kelelahan setelah menyerang boss.\nIstirahat dulu selama *${m_time} Menit ${s_time} Detik*.`);
    }

    // Kalkulasi Damage 
    let dmg = 500 + (Number(user.level) * 50) + Math.floor(Math.random() * 2000);
    boss.hp -= dmg;

    // Catat waktu nyerang
    await updateCooldown(m.sender, { lastbossbattle: Date.now() });

    if (boss.hp <= 0) {
        let guild = await db.guild.findUnique({ where: { id: userGuildId } });
        
        // Kasih hadiah ke kas markas kalau boss mati
        await db.guild.update({
            where: { id: userGuildId },
            data: {
                eliksir: Number(guild.eliksir) + boss.rewardEliksir,
                exp: Number(guild.exp) + boss.rewardExp
            }
        });

        let msg = `🎉 *BOSS RAID BERHASIL DITAKLUKKAN!* 🎉\n\nSerangan mematikan terakhir dari @${m.sender.split('@')[0]} berhasil membunuh *${boss.name}*!\n\n🎁 *Hadiah Masuk ke Kas Guild:*\n💧 Eliksir: +${boss.rewardEliksir}\n✨ EXP Guild: +${boss.rewardExp}`;
        
        delete global.guildBoss[userGuildId]; // Hapus boss dari arena
        
        return conn.reply(m.chat, msg, m, { mentions: [m.sender] });
    } else {
        return m.reply(`⚔️ Kamu menyerang *${boss.name}* dan memberikan *${dmg.toLocaleString('id-ID')}* Damage!\n\n❤️ Sisa HP Boss: ${Math.max(0, boss.hp).toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')}\n_Ajak member lain untuk ikutan nyerang!_`);
    }
};

handler.help = ['attackboss'];
handler.tags = ['rpgG'];
handler.command = /^(attackboss|hitboss)$/i;
module.exports = handler;
