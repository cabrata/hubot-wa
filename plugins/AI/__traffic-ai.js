const os = require('os');
const { updateChat, getUser, updateUser } = require('../../lib/database.js');

// ==========================================
// 1. KONFIGURASI HUKUMAN & AI (SUPER STRICT)
// ==========================================
const BAN_LEVELS = [
    { limit: 0, duration: 0, label: 'Aman' },
    { limit: 1, duration: 30 * 60 * 1000, label: '30 Menit' },
    { limit: 2, duration: 60 * 60 * 1000, label: '1 Jam' },
    { limit: 3, duration: 5 * 60 * 60 * 1000, label: '5 Jam' },
    { limit: 4, duration: 12 * 60 * 60 * 1000, label: '12 Jam' },
    { limit: 9, duration: 0, label: 'PERMANEN' }
];

const CONFIG = {
    SPAM_SCORE_LIMIT: 100,
    RESET_RECORD_TIME: 30 * 24 * 60 * 60 * 1000,
    SCORE_FAST: 15,
    SCORE_COPY: 25,
    COOLDOWN_RATE: 2
};

// ==========================================
// 2. OTAK AI TRAFFIC & SERVER MONITORING
// ==========================================
const AI_CONFIG = {
    MAX_RAM_MB: 1024, // 🔧 UBAH INI: Sesuaikan dengan limit RAM di Panel Pterodactyl lu (dalam MB)
    MIN_RPS: 2,
    MIN_RPM: 15,
    MIN_RPH: 300,
    LEARN_RATE: 0.2,
    SPIKE_MULTIPLIER: 1.5,
    BASE_PURGE_COOLDOWN: 5 * 60 * 1000, // 5 Menit
    MAX_PURGE_COOLDOWN: 60 * 60 * 1000  // 1 Jam
};

function getCpuInfo() {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
    }
    return { idle, total };
}

global.brainAI = global.brainAI || {
    currentRPS: 0, currentRPM: 0, currentRPH: 0,
    avgRPS: AI_CONFIG.MIN_RPS, avgRPM: AI_CONFIG.MIN_RPM, avgRPH: AI_CONFIG.MIN_RPH,
    suspects: {}, ticks: 0,
    threatLevel: 1,
    purgeMultiplier: 1,
    lastPurgeTime: 0,
    lastCpu: getCpuInfo()
};

global.botBusyUntil = global.botBusyUntil || 0;
global.hasSentBusyMessage = global.hasSentBusyMessage || {};
global.bannedChatsByAI = global.bannedChatsByAI || [];

// ==========================================
// 3. DETAK JANTUNG AI & SELF-CHECK MECHANISM
// ==========================================
if (!global.aiInterval) {
    global.aiInterval = setInterval(() => {
        const ai = global.brainAI;
        let now = Date.now();
        ai.ticks++;

        // --- CEK CPU & RAM PTERODACTYL (Tiap 2 detik) ---
        if (ai.ticks % 2 === 0) {
            // FIX: Pake memoryUsage.rss biar akurat ngebaca RAM bot di container Pterodactyl!
            let ramUsedMB = process.memoryUsage().rss / 1024 / 1024;
            let ramUsagePercent = (ramUsedMB / AI_CONFIG.MAX_RAM_MB) * 100;

            let currentCpu = getCpuInfo();
            let idleDiff = currentCpu.idle - ai.lastCpu.idle;
            let totalDiff = currentCpu.total - ai.lastCpu.total;
            let cpuUsage = totalDiff === 0 ? 0 : 100 - Math.floor(100 * idleDiff / totalDiff);
            ai.lastCpu = currentCpu;

            if (cpuUsage > 90 || ramUsagePercent > 90) {
                ai.threatLevel = Math.max(ai.threatLevel, 5);
                console.log(`[BRAIN AI] 🚨 SERVER OVERLOAD! CPU: ${cpuUsage}% | RAM: ${ramUsedMB.toFixed(0)}MB (${ramUsagePercent.toFixed(1)}%). Naikin ke SIAGA 5!`);
            } else if (cpuUsage > 80 || ramUsagePercent > 80) {
                ai.threatLevel = Math.max(ai.threatLevel, 4);
            }
        }

        // --- GARBAGE COLLECTOR / TUKANG SAPU RAM (Tiap 10 Menit) ---
        if (ai.ticks % 600 === 0 && global.connCache) {
            let limitTime = now - 3600000; // Hapus data user yg AFK lebih dari 1 jam
            ['lastCmdTime', 'warnMacet', 'userCd', 'spamData'].forEach(key => {
                let obj = global.connCache[key];
                if (obj) {
                    for (let jid in obj) {
                        let lastActive = (key === 'spamData') ? obj[jid].lastMsgTime : global.connCache.lastCmdTime[jid];
                        if (!lastActive || lastActive < limitTime) {
                            delete obj[jid]; // 🧹 Bersihkan RAM!
                        }
                    }
                }
            });
        }

        // --- SELF-CHECK: KALO SPAM UDAH BERHENTI, LEPAS GEMBOK LEBIH CEPAT ---
        if (global.botBusyUntil > 0) {
            if (ai.currentRPM <= Math.max(AI_CONFIG.MIN_RPM, ai.avgRPM)) {
                 global.botBusyUntil = 0; 
            }
            
            if (now > global.botBusyUntil) {
                console.log(`[BRAIN AI] 🟢 Kondisi Aman. Membuka gembok grup...`);
                for (let chatId of global.bannedChatsByAI) {
                    updateChat(chatId, { isBanned: false }).catch(() => { });
                }
                global.bannedChatsByAI = [];
                global.botBusyUntil = 0;
                global.hasSentBusyMessage = {};

                if (ai.threatLevel > 1 && (now - ai.lastPurgeTime > 15 * 60 * 1000)) {
                    ai.threatLevel = 1;
                    ai.purgeMultiplier = 1;
                    console.log(`[BRAIN AI] 📉 Threat Level kembali normal (Level 1).`);
                }
            }
        }

        // --- LEARNING SYSTEM ---
        ai.avgRPS = (ai.currentRPS * AI_CONFIG.LEARN_RATE) + (ai.avgRPS * (1 - AI_CONFIG.LEARN_RATE));
        ai.currentRPS = 0; 

        if (ai.ticks % 60 === 0) {
            ai.avgRPM = (ai.currentRPM * AI_CONFIG.LEARN_RATE) + (ai.avgRPM * (1 - AI_CONFIG.LEARN_RATE));
            ai.currentRPM = 0; 
            ai.suspects = {};  
        }

        if (ai.ticks % 3600 === 0) {
            ai.avgRPH = (ai.currentRPH * AI_CONFIG.LEARN_RATE) + (ai.avgRPH * (1 - AI_CONFIG.LEARN_RATE));
            ai.currentRPH = 0;
            ai.ticks = 0;
        }
    }, 1000);
}

const handler = (m) => m;

handler.before = async function all(m, { conn }) {
    if (!m.message || m.fromMe || !m.text) return;
    
    // Save conn to global cache for the Garbage Collector
    global.connCache = conn; 

    // ==========================================
    // 1. FILTERING COMMAND (FIX: LAZY DB QUERY)
    // ==========================================
    // 🚀 Bot ngecek apakah ini Command atau Chat Biasa DULUAN sebelum nanya ke Database SQL!
    let isCommand = false;
    const prefixRegex = global.prefix;
    let textStr = m.text.trim();
    let hasPrefix = prefixRegex.test(textStr);
    
    let cmdName = hasPrefix ? textStr.slice(1).split(/ +/).shift().toLowerCase() : textStr.split(/ +/).shift().toLowerCase();
    let fullText = textStr.toLowerCase(); 

    if (global.plugins) {
        for (let name in global.plugins) {
            let plugin = global.plugins[name];
            if (!plugin || !plugin.command) continue;

            let cmds = plugin.command;
            if (Array.isArray(cmds)) {
                if (cmds.some(cmd => cmd instanceof RegExp ? cmd.test(cmdName) || cmd.test(fullText) : cmd === cmdName)) {
                    isCommand = true; break;
                }
            } else if (cmds instanceof RegExp) {
                if (cmds.test(cmdName) || cmds.test(fullText)) {
                    isCommand = true; break;
                }
            } else if (typeof cmds === 'string') {
                if (cmds === cmdName) {
                    isCommand = true; break;
                }
            }
        }
    }

    // Kalau bukan command (cuma ngobrol biasa), langsung RETURN! Database SQL aman dari spam query.
    if (!isCommand) return;
    
    const txt = m.text.toLowerCase();
    if (txt.includes('jadibot') || txt.includes('stopbot')) return;

    // ==========================================
    // 2. AMBIL DATA USER & CEK KASTA DEWA
    // ==========================================
    let user = await getUser(m.sender, m.pushName) || {};
    
    let senderWa = m.sender.split('@')[0];
    const isOwner = global.owner.map(v => v.replace(/[^0-9]/g, '')).includes(senderWa);
  //  const isMods = user.moderator || false;
//    const isTS = user.timSupport || false;
    const isPremium = user.premium && (Number(user.premium) > Date.now());
    
    const isDewa = isOwner || isPremium;
    let now = Date.now();

    // ==========================================
    // 3. PENGECEKAN MODE SIBUK (SELF MODE)
    // ==========================================
    if (!isDewa && now < global.botBusyUntil) {
        if (!global.hasSentBusyMessage[m.chat]) {
            let sisaMenit = Math.ceil((global.botBusyUntil - now) / 60000);
            conn.sendMessage(m.chat, {
                text: `💤 *BOT MODE SIBUK (THREAT LEVEL ${global.brainAI.threatLevel})*\n\nServer menahan serangan spam. Bot sementara hanya merespon perintah *VIP (Owner, Staff, Premium)*.\n\n> Beli premium untuk akses prioritas. Ketik #buyprem`
            }, { quoted: m }).catch(() => { });
            global.hasSentBusyMessage[m.chat] = true;
        }
        m.text = '';
        return true;
    }

    // ==========================================
    // 4. AI MENCATAT TRAFIK & TRIGGER PURGE
    // ==========================================
    const ai = global.brainAI;
    
    if (!isDewa) {
        ai.suspects[m.sender] = (ai.suspects[m.sender] || 0) + 1;
        ai.currentRPS++; ai.currentRPM++; ai.currentRPH++;
    }

    if (!isDewa && (ai.currentRPS > Math.max(AI_CONFIG.MIN_RPS, ai.avgRPS * AI_CONFIG.SPIKE_MULTIPLIER)) ||
        (ai.currentRPM > Math.max(AI_CONFIG.MIN_RPM, ai.avgRPM * AI_CONFIG.SPIKE_MULTIPLIER))) {

        if (now - ai.lastPurgeTime < 15 * 60 * 1000) {
            ai.purgeMultiplier = Math.min(ai.purgeMultiplier * 2, 8);
            ai.threatLevel = Math.min(ai.threatLevel + 1, 5); 
        } else {
            ai.purgeMultiplier = 1;
            ai.threatLevel = 2; 
        }
        ai.lastPurgeTime = now;

        let dynamicPurgeTime = Math.min(AI_CONFIG.BASE_PURGE_COOLDOWN * ai.purgeMultiplier, AI_CONFIG.MAX_PURGE_COOLDOWN);
        global.botBusyUntil = now + dynamicPurgeTime;
        global.hasSentBusyMessage = {};

        let topSpammer = null;
        let highestSpam = 0;
        for (const [suspectJid, spamCount] of Object.entries(ai.suspects)) {
            if (spamCount > highestSpam && spamCount > 5) { 
                highestSpam = spamCount; 
                topSpammer = suspectJid; 
            }
        }

        if (topSpammer) {
            let guiltyUser = await getUser(topSpammer);
            if (guiltyUser) {
                let banLevel = Math.min((guiltyUser.banLevel || 0) + 2, 9);
                let updateData = {
                    banLevel: banLevel,
                    bannedTime: BigInt(now),
                    banned: true,
                    bannedReason: `Dibanned AI: Lonjakan Trafik / DDOS (Threat Lvl ${ai.threatLevel})`
                };
                if (banLevel < 9) updateData.bannedUntil = BigInt(now + BAN_LEVELS[banLevel].duration);
                
                await updateUser(topSpammer, updateData).catch(() => { });
            }

            await updateChat(m.chat, { isBanned: true }).catch(() => { });
            if (!global.bannedChatsByAI.includes(m.chat)) global.bannedChatsByAI.push(m.chat);

            conn.sendMessage(m.chat, {
                text: `🤖 *AI SYSTEM INTERVENTION (LVL ${ai.threatLevel})* 🤖\n\n🎯 *Target:* @${topSpammer.split('@')[0]}\n📂 *Tindakan:* User di-Banned & Grup di-Mute!\n\n_Bot mengaktifkan Self-Mode. Jika trafik normal kembali, mode ini akan dibatalkan otomatis._\n\n> Akses tanpa batas? Ketik #buyprem`,
                mentions: [topSpammer]
            }, { quoted: m }).catch(() => { });
        }

        m.text = '';
        return true;
    }

    // ==========================================
    // 5. ANTI-MACET & SCORING (BYPASS DEWA)
    // ==========================================
    if (isDewa) return; 

    if (!conn.lastCmdTime) conn.lastCmdTime = {};
    if (!conn.warnMacet) conn.warnMacet = {};
    if (!conn.userCd) conn.userCd = {}; 

    let baseCd = 1200; 
    let currentCd = conn.userCd[m.sender] || baseCd;

    if (now - (conn.lastCmdTime[m.sender] || 0) < currentCd) {
        conn.userCd[m.sender] = Math.min(currentCd * 2, 15000);

        if (now - (conn.warnMacet[m.sender] || 0) > 5000) {
            let cdSec = (conn.userCd[m.sender] / 1000).toFixed(1);
            conn.sendMessage(m.chat, { text: `⚡ *Santai Bang!* Jeda perintahmu naik jadi *${cdSec} detik* karena nyepam.\n> Ketik #buyprem biar bebas delay.` }, { quoted: m }).catch(() => { });
            conn.warnMacet[m.sender] = now;
        }
        m.text = '';
        return true;
    }

    if (conn.userCd[m.sender] && conn.userCd[m.sender] > baseCd) {
        conn.userCd[m.sender] = Math.max(baseCd, conn.userCd[m.sender] - 500);
    }
    conn.lastCmdTime[m.sender] = now;

    let needsUpdate = false;
    let updateData = {};
    let userBannedUntil = Number(user.bannedUntil || 0n);
    let userBannedTime = Number(user.bannedTime || 0n);

    if (user.banned && userBannedUntil > 0 && now > userBannedUntil) {
        user.banned = false;
        updateData.bannedUntil = 0n;
        updateData.banned = false;
        updateData.bannedReason = '';
        needsUpdate = true;
    }

    if (user.banned || (userBannedUntil > now)) {
        if (needsUpdate) await updateUser(m.sender, updateData).catch(() => { });
        m.text = ''; return true;
    }

    if (user.banLevel > 0 && (now - userBannedTime > CONFIG.RESET_RECORD_TIME)) {
        user.banLevel = 0;
        updateData.banLevel = 0;
        updateData.bannedTime = 0n;
        needsUpdate = true;
    }

    conn.spamData = conn.spamData || {};
    if (!conn.spamData[m.sender]) {
        conn.spamData[m.sender] = { score: 0, lastMsgTime: 0, lastMsgContent: '' };
    }

    let spam = conn.spamData[m.sender];
    let timeDiff = (now - spam.lastMsgTime) / 1000;

    if (timeDiff > 0.5) {
        let reduction = Math.floor(timeDiff * CONFIG.COOLDOWN_RATE);
        spam.score = Math.max(0, spam.score - reduction);
    }

    let penaltyMultiplier = ai.threatLevel;
    let addedScore = 1 * penaltyMultiplier;
    
    if (timeDiff < 0.8) addedScore += (CONFIG.SCORE_FAST * penaltyMultiplier);
    if (m.text === spam.lastMsgContent && m.text.length > 2) addedScore += (CONFIG.SCORE_COPY * penaltyMultiplier);

    spam.score += addedScore;
    spam.lastMsgTime = now;
    spam.lastMsgContent = m.text;

    if (spam.score >= CONFIG.SPAM_SCORE_LIMIT) {
        user.banLevel = Math.min((user.banLevel || 0) + 1, 9);
        spam.score = 0;

        let finalUpdate = { ...updateData, banLevel: user.banLevel, bannedTime: BigInt(now) };

        if (user.banLevel >= 9) {
            finalUpdate.banned = true;
            finalUpdate.bannedUntil = 0n;
            finalUpdate.bannedReason = 'Banned Permanen (Extrem Spam)';
            await updateUser(m.sender, finalUpdate).catch(() => { });
            await conn.sendMessage(m.chat, { text: `⛔ *BANNED PERMANEN*\n\nKamu diblokir permanen karena spam ekstrem.` }, { quoted: m }).catch(() => { });
        } else {
            const penalty = BAN_LEVELS[user.banLevel];
            finalUpdate.bannedUntil = BigInt(now + penalty.duration);
            finalUpdate.banned = true;
            finalUpdate.bannedReason = `Banned Sementara (${penalty.label})`;
            await updateUser(m.sender, finalUpdate).catch(() => { });
            await conn.sendMessage(m.chat, { text: `⚠ *ANTISPAM TRIGGERED*\n\nAkunmu di-banned selama ${penalty.label}.` }, { quoted: m }).catch(() => { });
        }
        m.text = '';
        return true;
    } else if (needsUpdate) {
        await updateUser(m.sender, updateData).catch(() => { });
    }
};

module.exports = handler;
