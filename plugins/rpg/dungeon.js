const Dungeon = require('../../lib/dungeon');
const { db, getUser, getTool } = require('../../lib/database');

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    if (!user) return;

    let action = (args[0] || '').toLowerCase();
    let uDungeon = await db.userDungeon.findUnique({ where: { jid: m.sender } });
    let uRpg = await db.userRpg.findUnique({ where: { jid: m.sender } });
    
    // Tarik info markas user
    let userGuildId = user?.guildId || user?.guild;

    global.dungeonLobby = global.dungeonLobby || {};

    // ─── MENU UTAMA ───
    if (!action) {
        let menu = `▧ ─── [ 𝐃𝐔𝐍𝐆𝐄𝐎𝐍 𝐆𝐀𝐓𝐄 ] ─── ▧\n\n`;
        menu += `◈ *MODE TERSEDIA*\n`;
        menu += `👤 \`.dungeon solo <rank>\`\n`;
        menu += `👥 \`.dungeon party <rank>\`\n`;
        menu += `🌍 \`.dungeon raid <rank>\` *(Eksklusif Guild!)*\n\n`;
        menu += `◈ *SISTEM LOBBY (MULTI-PLAYER)*\n`;
        menu += `» \`.dungeon join\` (Masuk ke Lobby Grup)\n`;
        menu += `» \`.dungeon start\` (Mulai oleh Leader)\n\n`;
        menu += `◈ *RANK KESULITAN*\n`;
        menu += `[ F | E | D | C | B | A | A+ | S | SS ]\n\n`;
        menu += `◈ *PERINTAH DALAM DUNGEON*\n`;
        menu += `» \`.dungeon status\`\n`;
        menu += `» \`.dungeon explore\`\n`;
        menu += `» \`.dungeon attack <1-5>\`\n`;
        menu += `» \`.dungeon leave\`\n\n`;
        menu += `_⚠️ Tips: Mode Raid akan menyetor loot tambahan ke Kas Markas!_`;
        return m.reply(menu);
    }

    // ─── KELUAR DARI LOBBY (CANCEL) ───
    if (action === 'leave' && global.dungeonLobby[m.chat] && global.dungeonLobby[m.chat].players.includes(m.sender)) {
        let lobby = global.dungeonLobby[m.chat];
        if (lobby.leader === m.sender) {
            delete global.dungeonLobby[m.chat];
            return m.reply("🛑 Leader membatalkan ekspedisi. Lobby Dungeon ditutup.");
        } else {
            lobby.players = lobby.players.filter(p => p !== m.sender);
            return m.reply(`✅ Kamu berhasil keluar dari Lobby Dungeon.`);
        }
    }

    // ─── 1. BUAT SESI / LOBBY ───
    if (['solo', 'party', 'raid'].includes(action)) {
        if (uDungeon?.inSession) return m.reply('❌ Kamu masih berada di dalam dungeon! Selesaikan dulu atau ketik *.dungeon leave*.');
        
        let rank = (args[1] || 'D').toUpperCase();

        if (action === 'solo') {
            let session = await Dungeon.startSession(m.sender, 'SOLO', rank);
            uDungeon = await db.userDungeon.findUnique({ where: { jid: m.sender } });
            
            let msg = `▧ ──── [ 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐒𝐓𝐀𝐑𝐓 ] ──── ▧\n\n`;
            msg += `[ 🌐 MODE: SOLO | 🎚️ RANK: ${session.difficulty.name} ]\n\n`;
            msg += `◈ *DAILY EVENT ACTIVE*\n`;
            msg += `» ${session.event.icon} *${session.event.name}*\n`;
            msg += `» _${session.event.desc}_\n\n`;
            msg += `◈ *PLAYER STATUS*\n`;
            msg += `⚚ Lantai Saat Ini: *${uDungeon.currentFloor}*\n\n`;
            msg += `⚠️ *[ FOCUS MODE ENGAGED ]*\n`;
            msg += `Ketik \`.dungeon explore\` untuk masuk ke ruangan selanjutnya!`;
            return conn.sendMessage(m.chat, { text: msg }, { quoted: m });
        } 
        else {
            // MODE PARTY & RAID (MEMBUAT LOBBY)
            if (!m.isGroup) return m.reply("❌ Mode Party dan Raid hanya bisa dilakukan di dalam Grup!");
            if (global.dungeonLobby[m.chat]) return m.reply("⚠️ Sudah ada Lobby Dungeon yang terbuka di grup ini! Ketik *.dungeon join* untuk ikut bergabung.");

            let isRaid = action === 'raid';
            let myGuild = null;

            // 🌟 VALIDASI KHUSUS RAID GUILD 🌟
            if (isRaid) {
                if (!userGuildId) return m.reply("❌ Mode Raid adalah event eksklusif Markas. Kamu belum bergabung dengan Guild manapun!");
                myGuild = await db.guild.findUnique({ where: { id: userGuildId } });
                if (!myGuild) return m.reply("⚠️ Data Guild tidak ditemukan.");
            }

            let maxP = isRaid ? 100 : 5;
            let minP = isRaid ? 3 : 2;

            global.dungeonLobby[m.chat] = {
                mode: action.toUpperCase(),
                rank: rank,
                leader: m.sender,
                players: [m.sender],
                max: maxP,
                min: minP,
                guildId: isRaid ? myGuild.id : null,
                guildName: isRaid ? myGuild.name : null
            };

            let msg = `▧ ─── [ 𝐋𝐎𝐁𝐁𝐘 𝐃𝐔𝐍𝐆𝐄𝐎𝐍 𝐃𝐈𝐁𝐔𝐊𝐀 ] ─── ▧\n\n`;
            msg += `🎯 Mode: *${isRaid ? 'GLOBAL RAID (GUILD EXCLUSIVE)' : 'PARTY'}*\n`;
            if (isRaid) msg += `🏰 Berafiliasi dengan Markas: *${myGuild.name}*\n`;
            msg += `☠️ Rank: *${rank}*\n`;
            msg += `👑 Leader: @${m.sender.split('@')[0]}\n\n`;
            msg += `👥 Anggota Terkumpul [1/${maxP}]:\n- @${m.sender.split('@')[0]}\n\n`;
            msg += `💡 Ketik *.dungeon join* untuk bergabung!\n`;
            if (isRaid) msg += `_(Hanya anggota markas ${myGuild.name} yang bisa bergabung)_\n\n`;
            msg += `💡 Ketik *.dungeon start* jika anggota sudah siap (Min. ${minP}).`;
            
            return conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] }, { quoted: m });
        }
    }

    // ─── JOIN LOBBY ───
    if (action === 'join') {
        if (!m.isGroup) return;
        let lobby = global.dungeonLobby[m.chat];
        if (!lobby) return m.reply("❌ Tidak ada Lobby Dungeon yang terbuka di grup ini.");
        if (uDungeon?.inSession) return m.reply("❌ Kamu sedang berada di dalam dungeon yang lain!");
        if (lobby.players.includes(m.sender)) return m.reply("❌ Kamu sudah terdaftar di dalam lobby.");
        if (lobby.players.length >= lobby.max) return m.reply("❌ Maaf, kuota anggota lobby sudah penuh!");

        // 🌟 FILTER PENYUSUP RAID 🌟
        if (lobby.mode === 'RAID') {
            if (!userGuildId) return m.reply(`❌ Kamu tidak memiliki markas! Ekspedisi ini dikhususkan untuk Guild *${lobby.guildName}*.`);
            if (userGuildId !== lobby.guildId) return m.reply(`⛔ PENYUSUP TERDETEKSI! Kamu adalah anggota guild lain. Ekspedisi ini HANYA untuk pasukan *${lobby.guildName}*.`);
        }

        lobby.players.push(m.sender);
        return conn.sendMessage(m.chat, { text: `✅ @${m.sender.split('@')[0]} bergabung ke dalam ekspedisi!\n👥 Total Anggota: *${lobby.players.length}/${lobby.max}*`, mentions: [m.sender] }, { quoted: m });
    }

    // ─── START MULTIPLAYER SESSION ───
    if (action === 'start') {
        if (!m.isGroup) return;
        let lobby = global.dungeonLobby[m.chat];
        if (!lobby) return m.reply("❌ Tidak ada Lobby Dungeon yang bisa dimulai.");
        if (lobby.leader !== m.sender) return m.reply("⛔ Hanya Leader yang bisa memulai Dungeon!");
        if (lobby.players.length < lobby.min) return m.reply(`⚠️ Anggota tidak mencukupi! Butuh minimal *${lobby.min}* orang untuk mode ${lobby.mode}.`);

        // Mulai sesi via engine dan lempar data Guild
        let session = await Dungeon.startSession(lobby.leader, lobby.mode, lobby.rank, lobby.guildId, lobby.guildName);
        
        session.players = lobby.players;

        for (let jid of lobby.players) {
            await db.userDungeon.upsert({
                where: { jid: jid },
                update: { inSession: true },
                create: { jid: jid, inSession: true }
            });
        }

        delete global.dungeonLobby[m.chat];

        let msg = `▧ ──── [ 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐒𝐓𝐀𝐑𝐓 ] ──── ▧\n\n`;
        msg += `[ 🌐 MODE: ${lobby.mode} | 🎚️ RANK: ${session.difficulty.name} ]\n`;
        if (session.mode === 'RAID') msg += `[ 🏰 MARKAS: ${session.guildName} ]\n`;
        msg += `\n◈ *DAILY EVENT ACTIVE*\n`;
        msg += `» ${session.event.icon} *${session.event.name}*\n`;
        msg += `» _${session.event.desc}_\n\n`;
        msg += `👥 *DAFTAR PASUKAN (${session.players.length} Orang)*\n`;
        lobby.players.forEach((p, i) => {
            msg += `${i+1}. @${p.split('@')[0]}\n`;
        });
        msg += `\n⚠️ *[ FOCUS MODE ENGAGED ]*\n`;
        msg += `Command lain dikunci untuk seluruh anggota party.\n`;
        msg += `Segera ketik \`.dungeon explore\` untuk membuka pintu lantai pertama!`;

        return conn.sendMessage(m.chat, { text: msg, mentions: lobby.players }, { quoted: m });
    }

    // ─── 2. CEK STATUS SESI ───
    if (action === 'status') {
        if (!uDungeon?.inSession) return m.reply('❌ Kamu sedang berada di luar dungeon.');
        let sessionId = Object.keys(Dungeon.sessions).find(key => Dungeon.sessions[key].players.includes(m.sender));
        if (!sessionId) return m.reply('❌ Sesi error. Ketik .dungeon leave untuk mereset.');
        
        let session = Dungeon.sessions[sessionId];
        let msg = `▧ ─── [ 𝐃𝐔𝐍𝐆𝐄𝐎𝐍 𝐒𝐓𝐀𝐓𝐔𝐒 ] ─── ▧\n\n`;
        msg += `📍 Lokasi  : *Lantai ${session.floor}*\n`;
        msg += `☠️ Tingkat : *${session.difficulty.name}*\n`;
        msg += `👥 Pasukan : *${session.players.length} Orang*\n`;
        msg += `🔮 Event   : *${session.event.name}*\n\n`;
        
        // STATUS LOOT PRIBADI
        msg += `🎒 *Kantung Loot Pribadi (Belum Aman):*\n`;
        msg += `💰 Koin : *Rp ${session.loot.money.toLocaleString('id-ID')}*\n`;
        msg += `✨ EXP  : *${session.loot.exp.toLocaleString('id-ID')}*\n\n`;
        
        // 🌟 STATUS LOOT MARKAS 🌟
        if (session.mode === 'RAID') {
            msg += `🏰 *Loot Tambahan Markas (${session.guildName}):*\n`;
            msg += `💧 Eliksir : +${session.guildLoot.eliksir}\n`;
            msg += `💰 Kas Harta : +Rp ${session.guildLoot.harta.toLocaleString('id-ID')}\n`;
            msg += `✨ Guild EXP : +${session.guildLoot.exp}\n\n`;
        }
        
        msg += `_Simpan loot dengan .dungeon leave_`;
        return m.reply(msg);
    }

    // ─── 3. EXPLORE (CARI MONSTER) ───
    if (action === 'explore') {
        if (!uDungeon?.inSession) return m.reply('❌ Kamu tidak berada di dalam dungeon.');
        let sessionId = Object.keys(Dungeon.sessions).find(key => Dungeon.sessions[key].players.includes(m.sender));
        if (!sessionId) return m.reply('❌ Sesi tidak valid.');

        let session = Dungeon.sessions[sessionId];

        if (!session.monster) {
            let mob = await Dungeon.generateEncounter(sessionId);
            
            if (session.status === 'BOSS_GATE') {
                await m.reply(`⚠️ *[ WARNING: BOSS GATE ]*\nMerasakan aura mematikan di balik pintu Lantai ${session.floor}. Mengecek Total Combat Power tim...`);
                
                let check = await Dungeon.checkBossGate(sessionId);
                if (!check.passed) {
                    return m.reply(`💀 *[ PARTY WIPEOUT ]*\n\nTotal Kekuatan Tim (*${check.totalPower}*) belum cukup untuk bos ini (Syarat: *${check.req}*).\nAura bos menghancurkan kalian semua dalam sekejap.\n\n_Lantai direset ke 1. Loot musnah. Armor & Pedang retak._`);
                } else {
                    await m.reply(`🔓 *[ GATE OPENED ]*\nKekuatan diakui. Bersiaplah untuk Boss Battle!`);
                }
            }

            let sword = await getTool(m.sender, 'sword');
            let armor = await getTool(m.sender, 'armor');
            let pAtk = Number(uRpg.attack) + (sword.owned * 150);
            let pDef = Number(uRpg.defense) + (armor.owned * 200);

            let msg = `▧ ─── [ 𝐄𝐍𝐂𝐎𝐔𝐍𝐓𝐄𝐑 ] ─── ▧\n\n`;
            msg += `👾 *${mob.name}* menghadang tim kalian!\n`;
            msg += `🩸 HP Musuh : *${mob.hp.toLocaleString()}*\n`;
            msg += `📍 Lantai   : *${session.floor}*\n\n`;
            msg += `◈ *STATUSMU*\n`;
            msg += `⚔️ ATK: ${pAtk} | 🛡️ DEF: ${pDef}\n`;
            msg += `🔮 MANA: ${uDungeon.mana}/${uDungeon.maxMana}\n\n`;
            msg += `◈ *COMMAND SKILL*\n`;
            msg += `[1] ⚔️ Dual Slash (Bal) - ${session.event.id === 'mana_overflow' ? '2' : '5'} MP\n`;
            msg += `[2] 🛡️ Cross Parry (Def) - ${session.event.id === 'mana_overflow' ? '5' : '10'} MP\n`;
            msg += `[3] 💥 Frenzy Strike (Atk) - ${session.event.id === 'mana_overflow' ? '7' : '15'} MP\n`;
            msg += `[4] 🌪️ Blade Dance (Spd) - ${session.event.id === 'mana_overflow' ? '10' : '20'} MP\n`;
            msg += `[5] 🎯 Lethal Combo (Crit) - ${session.event.id === 'mana_overflow' ? '12' : '25'} MP\n\n`;
            msg += `💡 _Ketik: .dungeon attack <angka>_`;
            return m.reply(msg);
        } else {
            return m.reply(`⚠️ Pertarungan sedang berlangsung! Cepat bantu serang *${session.monster.name}* dengan .dungeon attack <1-5>`);
        }
    }

    // ─── 4. ATTACK (PILIH SKILL) ───
    if (action === 'attack') {
        if (!uDungeon?.inSession) return m.reply('❌ Kamu tidak berada di dalam dungeon.');
        let sessionId = Object.keys(Dungeon.sessions).find(key => Dungeon.sessions[key].players.includes(m.sender));
        let session = Dungeon.sessions[sessionId];
        
        if (!session?.monster) return m.reply('💤 Ruangan ini kosong. Ketik .dungeon explore untuk lanjut.');

        let skillId = args[1] || 1; 
        let result = await Dungeon.processAttack(sessionId, m.sender, skillId);

        if (result.error) return m.reply(`❌ ${result.error}`);

        if (result.status === 'WIPEOUT') {
            return m.reply(`💀 *[ PARTY WIPEOUT ]*\n\nMonster tersebut menghabisi anggota terakhir kalian di Lantai ${session.floor}.\nProgress lantai direset kembali ke Lantai 1.\nSemua loot yang belum disimpan hangus.\nDurability Senjata & Armor berkurang drastis (-25).`);
        }
        
        if (result.status === 'PLAYER_DEAD') {
            return m.reply(`🩸 *[ MAN DOWN ]*\nKamu tumbang! HP kamu habis. Kamu tidak bisa menyerang lagi sampai rekan timmu memenangkan lantai ini.`);
        }

        if (result.status === 'CLEARED') {
            return m.reply(`🎉 *[ STAGE CLEARED ]*\n\nMusuh tumbang! Loot dimasukkan ke kantung party.\nHP dan Mana seluruh anggota sedikit pulih.\n\n» .dungeon explore (Naik Lantai ${result.newFloor})\n» .dungeon leave (Pulang & Simpan)`);
        }

        if (result.status === 'NEXT_TURN') {
            return m.reply(`⚔️ *[ BATTLE LOG ]*\n\n» @${m.sender.split('@')[0]} ( *${result.skillUsed}* ) ➔ *${result.dmgGiven.toLocaleString()}* DMG\n» Musuh menyerang balik ➔ *${result.dmgTaken.toLocaleString()}* DMG\n\n🩸 HP Musuh: *${result.mHp.toLocaleString()}*\n🔮 Sisa Mana: *${result.pMana}*\n\n_Bantu serang! .dungeon attack <1-5>_`, null, {mentions: [m.sender]});
        }
    }

    // ─── 5. KELUAR & SIMPAN PROGRESS ───
    if (action === 'leave') {
        if (!uDungeon?.inSession) return m.reply('❌ Kamu tidak berada di dalam dungeon.');
        let sessionId = Object.keys(Dungeon.sessions).find(key => Dungeon.sessions[key].players.includes(m.sender));
        
        if (sessionId) {
            let session = Dungeon.sessions[sessionId];
            let floor = session.floor;
            let money = session.loot.money;
            let exp = session.loot.exp;
            let gLoot = session.guildLoot; // Tarik data loot markas sblm dihapus
            
            await Dungeon.leaveSession(sessionId);
            
            let msg = `▧ ─── [ 𝐄𝐒𝐂𝐀𝐏𝐄 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 ] ─── ▧\n\n`;
            msg += `Tim berhasil keluar dengan selamat dari Lantai ${floor}!\n\n`;
            msg += `🎒 *Loot Masuk ke Inventory (Masing-masing):*\n`;
            msg += `💰 Koin : +Rp ${money.toLocaleString('id-ID')}\n`;
            msg += `✨ EXP  : +${exp.toLocaleString('id-ID')}\n\n`;
            
            // 🌟 PENGUMUMAN LOOT MARKAS 🌟
            if (session.mode === 'RAID') {
                msg += `🏰 *Loot Khusus Markas (${session.guildName}):*\n`;
                msg += `💧 Eliksir : +${gLoot.eliksir}\n`;
                msg += `💰 Kas Harta : +Rp ${gLoot.harta.toLocaleString('id-ID')}\n`;
                msg += `✨ Guild EXP : +${gLoot.exp}\n\n`;
            }

            msg += `_Kunci sesi telah dilepas. Command normal kembali aktif._`;
            return m.reply(msg);
        } else {
            await db.userDungeon.update({ where: { jid: m.sender }, data: { inSession: false } });
            return m.reply(`✅ Sesi error berhasil dilepas secara paksa.`);
        }
    }
};

handler.help = ['dungeon <args>', 'dg <args>'];
handler.tags = ['rpg'];
handler.command = /^(dungeon|dg)$/i;
handler.register = true;
module.exports = handler;