const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    let staffList = Array.isArray(guild.staff) ? guild.staff : [];

    global.guildBoss = global.guildBoss || {};

    // Cek apakah ada boss yang masih hidup di markas
    if (global.guildBoss[guild.id]) {
        let boss = global.guildBoss[guild.id];
        return m.reply(`🐲 *GUILD BOSS TERCATAT!*\n\nNama: ${boss.name}\n❤️ HP: ${boss.hp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')}\n\nAyo seluruh member ketik *.attackboss* untuk mengalahkan bos ini!`);
    }

    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa melakukan ritual Summon Boss.');
    }

    let cost = 50_000_000_000n; // Biaya panggil boss 50 Miliar
    if (BigInt(guild.harta) < cost) return m.reply('❌ Kas Harta guild tidak cukup untuk Summon Boss! Butuh Rp 50.000.000.000');

    await db.guild.update({
        where: { id: guild.id },
        data: { harta: BigInt(guild.harta) - cost }
    });

    // Bikin statistik boss berdasarkan level guild
    global.guildBoss[guild.id] = {
        name: 'Calamity Dragon 🐉',
        hp: 100000 + (guild.level * 10000), 
        maxHp: 100000 + (guild.level * 10000),
        rewardEliksir: 200 + (guild.level * 10), // Hadiah Eliksir biar nggak 0 lagi!
        rewardExp: 1000
    };

    m.reply(`⚠️ *PANGGILAN DARURAT GUILD* ⚠️\n\n*${global.guildBoss[guild.id].name}* telah di-summon ke markas!\n\nTarget HP: ${global.guildBoss[guild.id].hp.toLocaleString('id-ID')}\n\nSegera perintahkan semua member untuk menyerang bos bersama-sama dengan command *.attackboss*!`);
};

handler.help = ['guildboss'];
handler.tags = ['rpgG'];
handler.command = /^(guildboss|gboss|summonboss)$/i;
module.exports = handler;
