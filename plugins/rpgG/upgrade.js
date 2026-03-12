const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild; // Ambil dari guildId ATAU guild
if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.\nGunakan *.joinguild <nama_guild>* untuk bergabung atau buat guild barumu dengan *.createguild <nama_guild>*.');
    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa melakukan upgrade guild.');
    }

    let upgradeType = (args[0] || '').toLowerCase();
    if (upgradeType !== 'level') {
        return m.reply(`❓ *SISTEM UPGRADE GUILD*\n\nSaat ini hanya tersedia upgrade *Level*.\n\nKetik: *${usedPrefix + command} level*\n_Meningkatkan kapasitas anggota dan menambah kekuatan pertahanan Base saat War._`);
    }

    let currentLevel = Number(guild.level);

    if (currentLevel >= 100) {
        return m.reply('🛑 Markas guild kamu sudah mencapai *Level Maksimal (Level 100)*!\nKamu sudah berada di puncak kejayaan, tidak bisa di-upgrade lagi.');
    }

    // Biaya Upgrade (Level x 50 Miliar)
        // Biaya Upgrade (Level x 50 Miliar)
    let cost = currentLevel * 50000000000; 
    let kasGuild = Number(guild.harta);
    let expDibutuhkan = currentLevel * 1000; // Tiap level butuh kelipatan 1000 EXP
    
    // Cek Kas Harta
    if (kasGuild < cost) {
        return m.reply(`🏦 Kas Guild (*Harta*) tidak cukup!\n\nBiaya Upgrade: *Rp ${cost.toLocaleString('id-ID')}*\nKas Guild: *Rp ${kasGuild.toLocaleString('id-ID')}*`);
    }

    // Cek EXP Guild
    if (Number(guild.exp) < expDibutuhkan) {
        return m.reply(`📈 EXP Guild belum cukup untuk naik Level ${currentLevel + 1}!\n\nEXP saat ini: *${Number(guild.exp).toLocaleString('id-ID')} / ${expDibutuhkan.toLocaleString('id-ID')}*\n_Kumpulkan EXP dengan memenangkan .gwar, .gattack, atau .attackboss!_`);
    }
    
    // Naikkan level, kurangi kas, dan kurangi EXP yang terpakai
    await db.guild.update({
        where: { id: guild.id },
        data: { 
            level: currentLevel + 1,
            harta: BigInt(kasGuild - cost),
            exp: Number(guild.exp) - expDibutuhkan // EXP dipotong sesuai harga upgrade
        }
    });

    m.reply(`🎉 Berhasil! Markas *${guild.name}* telah di-upgrade ke *Level ${currentLevel + 1}*!\nKapasitas anggota bertambah, pertahanan saat War meningkat!`);
};

handler.help = ['guildupgrade <type>'];
handler.tags = ['rpgG'];
handler.command = /^(guildupgrade|gupgrade)$/i;
handler.register = true;
module.exports = handler;
