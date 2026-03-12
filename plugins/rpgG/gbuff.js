const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa mengaktifkan Buff Guild.');
    }

    global.guildBuff = global.guildBuff || {};

    let buffs = {
        'rage': { name: '⚔️ Rage Frenzy', eliksir: 300, duration: 86400000, desc: 'Power +20% saat menyerang markas lain (.gattack / .gwar).' },
        'iron': { name: '🛡️ Iron Skin', eliksir: 300, duration: 86400000, desc: 'Defense +20% saat diserang oleh guild musuh.' },
        'exp': { name: '✨ Blessing of Athena', eliksir: 500, duration: 86400000, desc: 'Mendapatkan Double EXP (+100%) setiap kali memenangkan pertempuran.' }
    };

    let type = (args[0] || '').toLowerCase();
    
    // Tampilkan Menu Buff
    if (!buffs[type]) {
        let activeBuff = global.guildBuff[guild.id];
        let status = 'Tidak ada ❌';
        
        if (activeBuff && activeBuff.expired > Date.now()) {
            let sisaWaktu = Math.floor((activeBuff.expired - Date.now()) / 3600000); // dalam jam
            status = `*${activeBuff.name}* (Sisa ${sisaWaktu} Jam)`;
        } else if (activeBuff) {
            delete global.guildBuff[guild.id]; // Hapus kalau udah expired
        }

        let menu = `🔥 *GUILD BUFF SYSTEM* 🔥\n\nTukarkan Eliksir dengan kekuatan magis sementara untuk seluruh anggota markas!\n\n`;
        menu += `💧 Eliksir Guild: *${Number(guild.eliksir)}*\n`;
        menu += `🔰 Buff Aktif: ${status}\n\n`;
        menu += `*Daftar Buff Tersedia:*\n`;

        for (let k in buffs) {
            menu += `*${k.toUpperCase()}*\n`;
            menu += `🏷️ ${buffs[k].name}\n`;
            menu += `💧 Harga: ${buffs[k].eliksir} Eliksir (Durasi: 24 Jam)\n`;
            menu += `📜 Efek: ${buffs[k].desc}\n\n`;
        }

        menu += `=> Cara Beli: *${usedPrefix + command} <nama_buff>*\nContoh: *${usedPrefix + command} rage*`;
        return m.reply(menu);
    }

    let b = buffs[type];

    // Cek apakah buff masih ada yang aktif
    if (global.guildBuff[guild.id] && global.guildBuff[guild.id].expired > Date.now()) {
        return m.reply(`⚠️ Markasmu masih dipengaruhi oleh buff *${global.guildBuff[guild.id].name}*!\nTunggu sampai durasinya habis sebelum mengaktifkan buff baru.`);
    }

    if (Number(guild.eliksir) < b.eliksir) {
        return m.reply(`❌ *Eliksir* guild tidak cukup!\nButuh: *${b.eliksir}*\nEliksir saat ini: *${Number(guild.eliksir)}*`);
    }

    // Potong Eliksir di SQL
    await db.guild.update({
        where: { id: guild.id },
        data: { eliksir: Number(guild.eliksir) - b.eliksir }
    });

    // Simpan data buff ke memory global (aktif 24 jam)
    global.guildBuff[guild.id] = {
        name: b.name,
        type: type,
        expired: Date.now() + b.duration
    };

    m.reply(`✨ *BUFF DIAKTIFKAN!* ✨\n\nMarkas *${guild.name}* kini diberkati dengan *${b.name}*.\n\nEfek: _${b.desc}_\nDurasi: 24 Jam dari sekarang.`);
};

handler.help = ['guildbuff <nama>'];
handler.tags = ['rpgG'];
handler.command = /^(guildbuff|gbuff)$/i;
module.exports = handler;
