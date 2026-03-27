const { GoogleGenAI } = require('@google/genai')
const { db } = require('./database')

// 🛡️ DAFTAR FITUR YANG DIKECUALIKAN DARI RADAR (Bebas Profit Triliunan)
const EXCLUDED_PLUGINS = ['judi', 'judi2', 'slot', 'slot2', 'casino', 'judipvp', 'redeem', 'reg', 'daftar', 'daget', 'giftaway', 'shop', 'toko', 'sell', 'jual', 'buy', 'buylimit'];

// ==========================================
// 🧠 MEMORY TRACKER (CCTV SPAM PER MENIT)
// ==========================================
const tracker = {}; 

// ⚙️ PENGATURAN RADAR ANTI-CHEAT
const TIME_WINDOW = 60 * 1000; // 1 Menit
const SUSPICIOUS_PROFIT_THRESHOLD = 50_000_000_000; // 50 Miliar per menit (Batas Radar AI nyala)
const MAX_SPAM_PROFIT_CMD = 8; // Maks 8 spam cmd berprofit per menit

// ==========================================
// 🤖 AI SEBAGAI HAKIM DAN EKSEKUTOR
// ==========================================
async function evaluateSuspiciousActivity(name, userData, profit, spamCount, command) {
    try {
        // Ganti dengan API Key lu, atau lebih baik pakai process.env.GEMINI_API_KEY
        const ai = new GoogleGenAI({ apiKey: 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo' }); 
        
        let prompt = `Kamu adalah AI Keamanan "HuTao". Analisis player berikut:
        
        *Data Player:*
        - Nama: ${name}
        - Level: ${userData.level || 1}
        - Saldo Normal: Rp ${(userData.money || 0).toLocaleString('id-ID')}
        
        *Aktivitas Mencurigakan:*
        - Command: '${command}'
        - Spam: ${spamCount} kali dalam 1 menit
        - Keuntungan instan: Rp ${profit.toLocaleString('id-ID')}
        
        *Tugasmu:*
        Apakah ini bug/cheat atau wajar? Jawab HANYA dengan format JSON valid:
        {"keputusan": "BANNED" atau "SAFE", "alasan": "Berikan alasan logis dan sarkastik maksimal 3 kalimat."}`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        
        // Membersihkan output AI memastikan murni JSON
        let textResult = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(textResult);
    } catch (e) {
        console.error("AI Error:", e);
        // Fallback kalau AI ngambek/limit, jangan langsung ban (mencegah korban salah sasaran lagi)
        return { keputusan: "SAFE", alasan: "Sistem AI sedang offline, pengadilan ditunda." };
    }
}

// ==========================================
// 🚨 FUNGSI UTAMA PENGECEKAN ANOMALI
// ==========================================
async function checkAnomaly(conn, m, jid, oldMoney, newMoney, pluginName) {
    // 1. CEK WHITELIST: Kalau ini fitur judi/redeem, biarin aja!
    if (!pluginName) return false;
    if (EXCLUDED_PLUGINS.some(cmd => pluginName.toLowerCase().includes(cmd))) {
        return false; 
    }

    // 2. BYPASS KHUSUS OWNER
    let isOwner = global.owner && global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(jid);
    if (isOwner) return false;

    let profit = newMoney - oldMoney;
    
    // Kalau nggak dapet untung, skip
    if (profit <= 0 && newMoney !== Infinity && !isNaN(newMoney)) return false; 

    const now = Date.now();

    // Setup memori tracker buat player ini
    if (!tracker[jid]) tracker[jid] = {};
    if (!tracker[jid][pluginName]) tracker[jid][pluginName] = [];

    // Catat log keuntungan
    tracker[jid][pluginName].push({ profit: profit, time: now });
    // Hapus log yang udah lewat 1 menit
    tracker[jid][pluginName] = tracker[jid][pluginName].filter(log => now - log.time <= TIME_WINDOW);

    let totalProfitInOneMinute = 0;
    let spamCountInOneMinute = tracker[jid][pluginName].length;

    for (let log of tracker[jid][pluginName]) {
        totalProfitInOneMinute += log.profit;
    }

    // 🚨 PENENTUAN STATUS PELANGGARAN
    let needsInvestigation = false;
    let violationType = "";

    if (isNaN(newMoney) || newMoney === Infinity) {
        needsInvestigation = true; 
        violationType = "Infinity/NaN Glitch";
    } else if (totalProfitInOneMinute > SUSPICIOUS_PROFIT_THRESHOLD) {
        needsInvestigation = true; 
        violationType = "Massive Profit Spiking";
    } else if (spamCountInOneMinute >= MAX_SPAM_PROFIT_CMD && totalProfitInOneMinute > 1_000_000) {
        needsInvestigation = true;
        violationType = `Spamming Command '${pluginName}'`;
    }

    // ⚖️ PROSES PENGADILAN
    if (needsInvestigation) {
        // Ambil nama player
        let userName = m.pushName || 'Player';
        try {
            let fetchedName = await conn.getName(jid);
            if (typeof fetchedName === 'string') userName = fetchedName;
        } catch (e) {}

        // Tarik data profil player dari database (sesuaikan dengan skema DB lu)
        const userData = await db.user.findUnique({ where: { jid: jid } }) || {};

        // Panggil AI buat nge-judge
        let aiVerdict = await evaluateSuspiciousActivity(userName, userData, totalProfitInOneMinute, spamCountInOneMinute, pluginName);

        // Kalau kata AI dia BANNED atau dia kena bug Infinity (Bypass AI)
        if (aiVerdict.keputusan === "BANNED" || violationType === "Infinity/NaN Glitch") {
            
            // ☠️ EKSEKUSI MATI
            await db.user.update({
                where: { jid: jid },
                data: { money: 0, bank: 0, banned: true } // Tambahin banned: true
            }).catch(() => {});

            // Bersihkan jejak di memori
            delete tracker[jid]; 

            // Kirim pesan ke grup
            await conn.sendMessage(m.chat, { 
                text: `🤖 *[ AI OVERWATCH SYSTEM ]* 🤖\n\n⚠️ *Tindakan:* Akun di-Banned\n🔍 *Tipe Pelanggaran:* ${violationType}\n────────────────────\n*Vonis HuTao:*\n"${aiVerdict.alasan}"`,
                mentions: [jid]
            }, { quoted: m });

            return true; // Beri sinyal nge-block command
        } else {
            // Kalau AI bilang SAFE (Misal dia level tinggi wajar dapet segitu)
            delete tracker[jid]; // Hapus jejak biar aman
            return false;
        }
    }

    return false; 
}

module.exports = { checkAnomaly }
