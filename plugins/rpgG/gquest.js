const QuestEngine = require('../../lib/quest');
const { getUser, db, updateCooldown } = require('../../lib/database');

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    let action = (args[0] || '').toLowerCase();
    
    let activeQuest = QuestEngine.quests[guild.id];

    // ─── MENU & INFO QUEST ───
    if (!action || action === 'info') {
        if (!activeQuest) {
            let menu = `📜 *PAPAN MISI MARKAS* 📜\n\n`;
            menu += `Saat ini tidak ada misi yang berjalan di markasmu.\n\n`;
            menu += `=> *${usedPrefix + command} list* (Cek daftar misi di papan)\n`;
            menu += `=> *${usedPrefix + command} random* (Ambil misi harian acak)\n`;
            menu += `=> *${usedPrefix + command} klaim* (Rebut Misi Spesial dari Broadcast Channel)\n`;
            return m.reply(menu);
        }

        let step = activeQuest.template.steps[activeQuest.currentStep];
        let msg = `📜 *MISI AKTIF: ${activeQuest.template.title}*\n☠️ Rank: ${activeQuest.template.rank}\n\n`;
        msg += `🎯 *Instruksi Saat Ini:*\n${step.text}\n\n`;
        msg += `◈ *Tindakan yang Dibutuhkan:*\n`;

        if (step.type === 'dialog') {
            msg += `🗣️ Ketik: *${usedPrefix + command} bicara ${step.target}*`;
        } else if (step.type === 'action') {
            msg += `🏃‍♂️ Ketik: *${usedPrefix + command} aksi ${step.lokasi} ${step.kegiatan}*`;
        } else if (step.type === 'submit') {
            msg += `📦 Progress Material:\n`;
            for (let reqItem in step.req) {
                let curr = activeQuest.progress[reqItem] || 0;
                let max = step.req[reqItem];
                msg += `- ${reqItem.toUpperCase()}: [${curr}/${max}] ${curr >= max ? '✅' : '❌'}\n`;
            }
            msg += `\n📥 Ketik: *${usedPrefix + command} setor <nama_item> <jumlah>*`;
        } else if (step.type === 'dungeon_action') {
            let curr = activeQuest.progress['dungeon'] || 0;
            msg += `⚔️ Masuk ke Dungeon dan selesaikan misi ini!\nProgress: [${curr}/${step.max}]`;
        }
        
        return m.reply(msg);
    }

    // ─── LIST PAPAN PENGUMUMAN ───
    if (action === 'list' || action === 'board') {
        let msg = `📋 *PAPAN PENGUMUMAN GUILD* 📋\n\n`;
        
        if (global.globalQuestBoard) {
            let gq = global.globalQuestBoard.template;
            msg += `🌍 *[GLOBAL EVENT]* (Rebutan!)\n`;
            msg += `📜 Judul: ${gq.title}\n`;
            msg += `☠️ Rank: ${gq.rank} | Syarat Markas: Lv ${gq.minLevel}\n`;
            msg += `=> Ambil Misi: *.gquest klaim*\n\n`;
        } else {
            msg += `🌍 *[GLOBAL EVENT]*\nSaat ini sedang kosong. Pantau terus Channel WA untuk info terbaru!\n\n`;
        }

        msg += `🏡 *[MISI HARIAN]*\n`;
        msg += `Guild Level ${guild.level} siap menerima misi harian (Rank D - B).\n`;
        msg += `=> Ambil Misi: *.gquest ambil*\n`;
        
        return m.reply(msg);
    }

    // ─── AMBIL MISI HARIAN RANDOM ───
    if (action === 'random' || action === 'ambil') {
        let staffList = Array.isArray(guild.staff) ? guild.staff : [];
        if (guild.owner !== m.sender && !staffList.includes(m.sender)) return m.reply('⛔ Hanya Owner dan Staff yang bisa mengambil kontrak Quest dari papan.');
        if (activeQuest) return m.reply('⚠️ Selesaikan dulu quest yang sedang berjalan! Ketik *.gquest info*');

        let cdTime = 14400000; // 4 Jam antar Quest biasa
        let lastQuest = Number(user.cooldown?.lastberkebon || 0);

        if (Date.now() - lastQuest < cdTime) {
            let ms = cdTime - (Date.now() - lastQuest);
            let h_time = Math.floor(ms / 3600000);
            let m_time = Math.floor((ms / 60000) % 60);
            return m.reply(`⏳ Kontrak Quest baru akan tersedia di papan dalam *${h_time} Jam ${m_time} Menit*.`);
        }

        let generated = QuestEngine.generateDynamicQuest('D'); // Bisa diacak Rank D atau C sesuai sistem di lib
        QuestEngine.quests[guild.id] = { id: 'DAILY', template: generated, currentStep: 0, progress: {} };
        
        await updateCooldown(m.sender, { lastberkebon: Date.now() });
        return m.reply(`✉️ *Kontrak Misi Harian Diterima!*\n\nKetik *${usedPrefix + command} info* untuk melihat instruksi tahap pertama.`);
    }

    // ─── KLAIM MISI SPESIAL (REBUTAN GLOBAL) ───
    if (action === 'klaim') {
        let staffList = Array.isArray(guild.staff) ? guild.staff : [];
        if (guild.owner !== m.sender && !staffList.includes(m.sender)) return m.reply('⛔ Hanya Owner dan Staff yang berhak menandatangani kontrak eksklusif ini!');
        if (activeQuest) return m.reply('⚠️ Markasmu sedang mengerjakan quest lain. Selesaikan atau batalkan dulu!');
        
        if (!global.globalQuestBoard) return m.reply('💤 Tidak ada Global Quest yang tersedia saat ini. Cek papan dengan *.gquest list*');

        let gq = global.globalQuestBoard.template;

        if (Number(guild.level) < gq.minLevel) {
            return m.reply(`🛑 *SYARAT TIDAK TERPENUHI!*\n\nMisi ini membutuhkan Markas minimal *Level ${gq.minLevel}*.\nMarkasmu saat ini masih Level ${guild.level}. Upgrade markasmu terlebih dahulu!`);
        }

        QuestEngine.quests[guild.id] = { id: global.globalQuestBoard.id, template: gq, currentStep: 0, progress: {} };
        global.globalQuestBoard = null;

        return conn.reply(m.chat, `🎉 *GLOBAL QUEST BERHASIL DIKLAIM!* 🎉\n\nMarkas *${guild.name}* telah memenangkan hak eksklusif untuk menjalankan misi rank *${gq.rank}* ini!\nSegera perintahkan anggota untuk mengetik *${usedPrefix}gquest info* dan mulai bekerja!`, m);
    }

    // ─── PROSES EKSEKUSI STEP (Bicara, Aksi, Setor) ───
    if (['bicara', 'aksi', 'setor'].includes(action)) {
        let argsObj = {};
        if (action === 'bicara') argsObj.target = args[1]?.toLowerCase();
        if (action === 'aksi') { argsObj.lokasi = args[1]?.toLowerCase(); argsObj.kegiatan = args[2]?.toLowerCase(); }
        if (action === 'setor') { argsObj.item = args[1]?.toLowerCase(); argsObj.amount = parseInt(args[2]); }

        let result = await QuestEngine.processStep(guild.id, m.sender, action, argsObj);
        if (result.error) return m.reply(result.error);

        let responTeks = result.msg;
        if (result.next && result.next.done) {
            responTeks += `\n\n──────────────────\n` + result.next.msg;
        } else if (result.next) {
            responTeks += `\n\n✅ *Lanjut ke Tahap Berikutnya!*\nKetik *.gquest info* untuk melihat instruksi baru.`;
        }

        return m.reply(responTeks);
    }
};

handler.help = ['guildquest <args>'];
handler.tags = ['rpgG'];
handler.command = /^(guildquest|gquest|misiguild)$/i;
module.exports = handler;