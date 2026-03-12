const { getUser, updateEconomy } = require('../../lib/database')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// AI Adaptif: Menentukan maksimal roll dadu berdasarkan riwayat W/L
function getDynamicRolls(netWinLoss) {
    let botMax = 100;
    let playerMax = 100;
    
    // Sensitivity Range (Berapa banyak kalah/menang buat memicu AI)
    let sensitivity = 5_000_000; 
    let aiBias = Math.tanh(netWinLoss / sensitivity); // Skala -1.0 sampai 1.0

    if (aiBias < -0.20) {
        // Player Rungkad (Kalah banyak): Kasih kemudahan
        playerMax = 120;
        botMax = 90;
    } else if (aiBias > 0.20) {
        // Player Gacor (Menang banyak): Bandar ngamuk
        botMax = 130;
        playerMax = 80;
    } else {
        // Normal (Bandar punya sedikit keunggulan layaknya kasino asli)
        botMax = 105;
        playerMax = 100;
    }
    
    return { botMax, playerMax };
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // 1. Lock Session (Biar nggak dispam)
    conn.judiSesi = conn.judiSesi || {};
    if (conn.judiSesi[m.sender]) return m.reply('⏳ Tunggu sebentar, dadumu masih dikocok!');
    
    // 2. Inisialisasi RAM untuk Cooldown & Analytics
    global.judi = global.judi || {};
    if (!global.judi[m.sender]) {
        global.judi[m.sender] = { judilast: 0, lastslot: 0, lastcasino: 0, judiNetWinLoss: 0 };
    }
    let state = global.judi[m.sender];

    try {
        let user = await getUser(m.sender);
        if (!user) return m.reply('Pengguna tidak ditemukan di database.');

        // 3. Cek Cooldown (5 Detik)
        let timeSinceLast = Date.now() - (state.judilast || 0);
        if (timeSinceLast < 5000) {
            let timeLeft = Math.ceil((5000 - timeSinceLast) / 1000);
            return m.reply(`⏳ Bandar sedang istirahat. Tunggu *${timeLeft} detik* lagi.`);
        }

        let currentMoney = user.money || 0;
        let count = args[0];

        if (!count) return m.reply(`❓ Format salah!\nContoh: *${usedPrefix + command} 5000* atau *${usedPrefix + command} all*`);

        count = count.toLowerCase() === 'all' ? currentMoney : parseInt(count);
        if (isNaN(count) || count <= 0) return m.reply('❌ Jumlah taruhan tidak valid!');
        if (currentMoney < count) return m.reply(`💰 Uang kamu tidak cukup untuk taruhan sebesar *${count.toLocaleString()}*.\nSaldo saat ini: *${currentMoney.toLocaleString()}*`);

        // Kunci sesi
        conn.judiSesi[m.sender] = true;

        // --- ANIMASI KOCOK DADU ---
        let uiText = `🎲 | *JUDI DADU* | 🎲\n────────────────────\n\n⏳ _Bandar sedang mengocok dadu..._ 🎲`;
        let { key } = await conn.sendMessage(m.chat, { text: uiText }, { quoted: m });
        await delay(1500); // Jeda animasi

        // AI Roll Calculation
        let netWinLoss = state.judiNetWinLoss || 0;
        let limits = getDynamicRolls(netWinLoss);

        let botRoll = Math.floor(Math.random() * limits.botMax) + 1;
        let playerRoll = Math.floor(Math.random() * limits.playerMax) + 1;

        let resultMessage = '';
        let payout = 0;
        let netProfit = 0;

        if (botRoll > playerRoll) {
            payout = 0;
            netProfit = -count;
            resultMessage = `💥 **KALAH!**\nDadu Bandar lebih besar. Kamu kehilangan taruhanmu.`;
        } else if (botRoll < playerRoll) {
            payout = count * 2;
            netProfit = count;
            resultMessage = `🎉 **MENANG!**\nDadu kamu lebih besar. Kamu mendapatkan 2x lipat!`;
        } else {
            payout = count;
            netProfit = 0;
            resultMessage = `🤝 **SERI!**\nAngka dadu sama. Uangmu dikembalikan.`;
        }

        // Update Ekonomi ke Database SQL
        await updateEconomy(m.sender, { money: currentMoney + netProfit });

        // Update Memori RAM
        state.judilast = Date.now();
        state.judiNetWinLoss = (state.judiNetWinLoss || 0) + netProfit;
        global.judi[m.sender] = state;

        let profitLabel = netProfit > 0 ? `+${netProfit.toLocaleString()} (PROFIT)` : (netProfit === 0 ? `0 (BALIK MODAL)` : `${netProfit.toLocaleString()} (RUNGKAD)`);

        // --- HASIL AKHIR (EDIT MESSAGE) ---
        let finalMessage = `🎲 | *JUDI DADU* | 🎲
────────────────────
🤖 *Dadu Bandar:* ${botRoll}
👤 *Dadu Kamu:* ${playerRoll}
────────────────────
${resultMessage}

💰 Taruhan: ${count.toLocaleString()}
📊 Hasil: *${profitLabel}*
💳 Saldo Akhir: *${(currentMoney + netProfit).toLocaleString()}*`;

        await conn.sendMessage(m.chat, { text: finalMessage, edit: key });

    } catch (e) {
        console.error(e);
        m.reply('❌ Terjadi kesalahan saat bermain judi. Saldo aman.');
    } finally {
        delete conn.judiSesi[m.sender]; // Buka kunci sesi
    }
}

handler.help = ['judi <jumlah|all>']
handler.tags = ['game']
handler.command = /^(judi)$/i
handler.group = true
handler.registered = true

module.exports = handler
