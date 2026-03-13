const { GoogleGenAI } = require('@google/genai')
const { db } = require('./database')

// ==========================================
// 🧠 MEMORY TRACKER (CCTV SPAM PER MENIT)
// ==========================================
// Bentuk data: { '628xxx@s...': { 'invest': [{ profit: 1000, time: 1678... }, ...] } }
const tracker = {}; 

// ⚙️ PENGATURAN RADAR ANTI-CHEAT
const TIME_WINDOW = 60 * 1000; // Jendela pantauan: 1 Menit (60.000 ms)
const MAX_PROFIT_PER_MIN = 2_000_000_000; // Maksimal dapet 2 Milyar PER MENIT dari 1 fitur
const MAX_SPAM_PROFIT_CMD = 15; // Maksimal spam fitur yang ngasilin duit 30x PER MENIT

async function generateAIWarning(name, profit, spamCount, command) {
    try {
        const ai = new GoogleGenAI({ apiKey: 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo' }); 
        
        let prompt = `Kamu adalah AI Keamanan "HuTao". 
        Player bernama *${name}* ketahuan mengeksploitasi bug. Dalam 1 menit terakhir, dia melakukan spam command '${command}' sebanyak ${spamCount} kali dan mendapatkan uang tidak wajar sebesar Rp ${profit.toLocaleString('id-ID')} secara instan.
        
        Tugasmu: Buat pesan eksekusi hukuman. Beritahu dia bahwa perilakunya tidak wajar dan sistem telah menghanguskan seluruh uangnya menjadi Rp 0. Gunakan nada dingin, kejam, dan menyindir. Tanpa basa-basi, maksimal 3 kalimat.`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) {
        return `🚨 *ANOMALY DETECTED* 🚨\n\nSelamat ${name}, sistem mendeteksi lonjakan uang aneh dari command ${command}. Seluruh hartamu telah dibakar menjadi debu oleh sistem.`;
    }
}

async function checkAnomaly(conn, m, jid, oldMoney, newMoney, pluginName) {
    // 🛡️ BYPASS KHUSUS OWNER: Lu bebas dari radar!
    let isOwner = global.owner && global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(jid);
    if (isOwner) return false;

    let profit = newMoney - oldMoney;
    
    // Kalau dia nggak dapet untung (atau malah rugi), aman, gak usah di-track
    if (profit <= 0 && newMoney !== Infinity && !isNaN(newMoney)) return false; 

    const now = Date.now();

    // 1. Inisialisasi Tracker buat user & command ini
    if (!tracker[jid]) tracker[jid] = {};
    if (!tracker[jid][pluginName]) tracker[jid][pluginName] = [];

    // 2. Masukkan riwayat profit baru ke dalam memori
    tracker[jid][pluginName].push({ profit: profit, time: now });

    // 3. Bersihkan memori yang lebih tua dari 1 menit (Biar gak menuh-menuhin RAM)
    tracker[jid][pluginName] = tracker[jid][pluginName].filter(log => now - log.time <= TIME_WINDOW);

    // 4. Kalkulasi Dosa dalam 1 menit terakhir
    let totalProfitInOneMinute = 0;
    let spamCountInOneMinute = tracker[jid][pluginName].length;

    for (let log of tracker[jid][pluginName]) {
        totalProfitInOneMinute += log.profit;
    }

    // 🚨 5. VONIS HAKIM (Cek Anomali Kecepatan & Spam)
    let isBugAbuser = false;

    if (isNaN(newMoney) || newMoney === Infinity) isBugAbuser = true; // Fix manipulasi angka
    if (totalProfitInOneMinute > MAX_PROFIT_PER_MIN) isBugAbuser = true; // Duit gak ngotak per menit
    if (spamCountInOneMinute > MAX_SPAM_PROFIT_CMD && totalProfitInOneMinute > 100_000_000) isBugAbuser = true; // Pake auto-clicker/spam bot

    if (isBugAbuser) {
        let userName = conn.getName(jid) || 'Player';
        let aiMessage = await generateAIWarning(userName, totalProfitInOneMinute, spamCountInOneMinute, pluginName);

        // ☠️ EKSEKUSI MATI: Bikin miskin 100%
        await db.user.update({
            where: { jid: jid },
            data: { money: 0, bank: 0 } 
        }).catch(() => {});

        // Bersihkan log dia (Biar gak ke-trigger dobel)
        tracker[jid][pluginName] = []; 

        // 📢 PERMALUKAN DI GRUP
        await conn.sendMessage(m.chat, { 
            text: `🤖 *[ AI OVERWATCH SYSTEM ]* 🤖\n\n${aiMessage}`,
            mentions: [jid]
        }, { quoted: m });

        return true; // Tangkap basah!
    }

    return false; // Aman
}

module.exports = { checkAnomaly }
