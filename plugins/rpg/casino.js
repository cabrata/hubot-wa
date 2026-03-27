const { getUser, updateEconomy } = require('../../lib/database')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const CONFIG = {
    COOLDOWN: 10000,       
    MIN_BET: 1000,
    MAX_BET_PERCENT: 0.25, 
    TARGET_SCORE: 21,
    DEALER_STANDS_ON: 17,  
    BLACKJACK_PAYOUT: 2.5, // Total return (Bet kembali + 1.5x profit)
    WIN_PAYOUT: 2.0,       // Total return (Bet kembali + 1x profit)
    SENSITIVITY_RANGE: 10_000 // Jangkauan AI membaca kekalahan/kemenangan
};

const CARDS = {
    'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, 
    '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
};
const cardKeys = Object.keys(CARDS);

// AI Adaptif: Memanipulasi isi tumpukan kartu berdasarkan performa player
/*function dealCard(isPlayer, netWinLoss) {
    let deck = [...cardKeys];
    
    // Hitung status W/L (-1.0 sampai 1.0)
    const scaled_x = netWinLoss / CONFIG.SENSITIVITY_RANGE;
    const aiBias = Math.tanh(scaled_x); 
    
    // Jika player sedang rugi besar (aiBias < -0.1), beri sedikit bantuan
    if (isPlayer && aiBias < -0.1) {
        deck.push('10', 'J', 'Q', 'K', 'A'); // Perbesar peluang dapat kartu bagus
    } 
    // Jika player menang terlalu banyak (aiBias > 0.2), bandar main lebih agresif
    else if (!isPlayer && aiBias > 0.2) {
        deck.push('10', 'J', 'Q', 'K'); 
    }

    const key = deck[Math.floor(Math.random() * deck.length)];
    return { key, value: CARDS[key] };
}*/
// AI Licik: Memanipulasi isi tumpukan kartu biar player selalu apes
function dealCard(isPlayer, netWinLoss) {
    let deck = [...cardKeys];
    
    if (isPlayer) {
        // Penuhi deck player dengan kartu kecil (2, 3, 4, 5) biar gampang BUST saat nambah kartu
        deck.push('2', '3', '4', '5', '6', '2', '3', '4'); 
    } else {
        // Penuhi deck bandar dengan kartu besar (10, J, Q, K, A) biar gampang Blackjack atau dapet 20
        deck.push('10', 'J', 'Q', 'K', 'A', '10', 'K'); 
    }

    const key = deck[Math.floor(Math.random() * deck.length)];
    return { key, value: CARDS[key] };
}

function getScore(hand) {
    let total = hand.reduce((sum, card) => sum + card.value, 0);
    let aceCount = hand.filter(card => card.key === 'A').length;

    while (total > CONFIG.TARGET_SCORE && aceCount > 0) {
        total -= 10; 
        aceCount--;
    }
    return total;
}

function getAIStatus(netWinLoss) {
    if (netWinLoss < -5_000_000) return 'Membantu Player 🥺';
    if (netWinLoss < -1_000_000) return 'Kasihan 😅';
    if (netWinLoss > 5_000_000) return 'Agresif 🔥';
    if (netWinLoss > 1_000_000) return 'Waspada 🧐';
    return 'Netral 🤖';
}

const formatHand = (hand, hideLast = false) => {
    if (hideLast) {
        return hand.map((c, i) => i === hand.length - 1 ? '[ ? ]' : `[ ${c.key} ]`).join('  ');
    }
    return hand.map(c => `[ ${c.key} ]`).join('  ');
};

let handler = async (m, { conn, args, usedPrefix }) => {
    conn.casino = conn.casino || {};
    if (conn.casino[m.sender]) {
        return m.reply("⏳ Selesaikan dulu permainan kasinamu sebelumnya!");
    }

    // 1. Inisialisasi Memory RAM untuk Cooldown & AI Analytics
    global.judi = global.judi || {};
    if (!global.judi[m.sender]) {
        global.judi[m.sender] = { judilast: 0, lastslot: 0, lastcasino: 0, casinoNetWinLoss: 0 };
    }
    let state = global.judi[m.sender];

    let user = await getUser(m.sender);
    if (!user) return m.reply("Pengguna tidak ada di database.");

    // Cek Cooldown Kasino via RAM
    const timeSinceLast = Date.now() - (state.lastcasino || 0);
    if (timeSinceLast < CONFIG.COOLDOWN) {
        const timeLeft = Math.ceil((CONFIG.COOLDOWN - timeSinceLast) / 1000);
        return m.reply(`⏳ Bandar sedang mengocok kartu, tunggu *${timeLeft} detik* lagi.`);
    }

        let currentMoney = user.money || 0;
    
    // 🛡️ BIKIN LIMIT: Maksimal bet di kasino adalah 1 Miliar biar kalkulator JS ga meledak
    const ABSOLUTE_MAX_BET = 1000000000; 
    
    let calculatedMaxBet = Math.floor(currentMoney * CONFIG.MAX_BET_PERCENT);
    const maxBet = Math.min(calculatedMaxBet, ABSOLUTE_MAX_BET); // Ambil limit teraman

    if (args.length < 1) return m.reply(`❓ Gunakan format: *${usedPrefix}casino <jumlah|all>*\nContoh: *${usedPrefix}casino 5000*`);
    
    let bet = args[0].toLowerCase() === 'all' ? maxBet : Math.floor(Number(args[0]));

    // 🛡️ ANTI-CHEAT: Cek kalau angkanya minus, huruf, atau kelewatan batas
    if (isNaN(bet) || !Number.isSafeInteger(bet) || bet <= 0) return m.reply('❌ Jumlah taruhan tidak valid! Angka terlalu besar atau format salah.');
    if (bet > ABSOLUTE_MAX_BET) return m.reply(`🚫 Batas maksimal taruhan kasino adalah *Rp 1.000.000.000* per sesi untuk mencegah eksploitasi bug.`);
    if (bet < CONFIG.MIN_BET) return m.reply(`💸 Taruhan minimal adalah *${CONFIG.MIN_BET.toLocaleString()}*.`);
    if (bet > maxBet) return m.reply(`🚫 Taruhanmu melebihi batas! Maksimal taruhanmu saat ini adalah *${maxBet.toLocaleString()}* (25% dari saldo).`);
    if (currentMoney < bet) return m.reply(`💰 Uangmu tidak cukup. Saldo saat ini: *${currentMoney.toLocaleString()}*.`);


    // Kunci Sesi Player
    conn.casino[m.sender] = true;

    try {
        let netWinLoss = state.casinoNetWinLoss || 0;

        // Bagi 2 Kartu Awal (Dengan pantauan AI Bandar)
        const playerHand = [dealCard(true, netWinLoss), dealCard(true, netWinLoss)];
        const dealerHand = [dealCard(false, netWinLoss), dealCard(false, netWinLoss)];

        let playerScore = getScore(playerHand);
        let dealerScore = getScore(dealerHand);

        // --- ANIMASI DEALING KARTU ---
        let uiText = `🃏 | *BLACKJACK CASINO* | 🃏\n────────────────────\n\n⏳ _Bandar sedang membagikan kartu..._`;
        let { key } = await conn.sendMessage(m.chat, { text: uiText }, { quoted: m });
        await delay(1000);

        // Menampilkan kartu (Kartu dealer ditutup 1)
        uiText = `🃏 | *BLACKJACK CASINO* | 🃏\n────────────────────\n👤 *Kartu Kamu:* ${formatHand(playerHand)}\n   └─ Skor: *${playerScore}*\n\n🤖 *Kartu Bandar:* ${formatHand(dealerHand, true)}\n   └─ Skor: *?*\n────────────────────\n⏳ _Mengevaluasi hasil..._`;
        await conn.sendMessage(m.chat, { text: uiText, edit: key });
        await delay(1500);

        let resultMessage = "";
        let payout = 0;

        const playerBlackjack = playerScore === CONFIG.TARGET_SCORE && playerHand.length === 2;
        const dealerBlackjack = dealerScore === CONFIG.TARGET_SCORE && dealerHand.length === 2;

        if (playerBlackjack && !dealerBlackjack) {
            payout = Math.floor(bet * CONFIG.BLACKJACK_PAYOUT);
            resultMessage = `🎉 **BLACKJACK!** 🎉\nKamu menang mutlak dengan bayaran spesial!`;
        } else {
            // Simulasi AI Bandar narik kartu kalau skor di bawah 17
            let dealerDrawing = false;
            while (getScore(dealerHand) < CONFIG.DEALER_STANDS_ON && playerScore <= CONFIG.TARGET_SCORE && !playerBlackjack) {
                dealerDrawing = true;
                dealerHand.push(dealCard(false, netWinLoss));
                dealerScore = getScore(dealerHand);
                
                // Efek Animasi Bandar Narik Kartu
                uiText = `🃏 | *BLACKJACK CASINO* | 🃏\n────────────────────\n👤 *Kartu Kamu:* ${formatHand(playerHand)}\n   └─ Skor: *${playerScore}*\n\n🤖 *Bandar Draw:* ${formatHand(dealerHand)}\n   └─ Skor: *${dealerScore}*\n────────────────────\n⏳ _Bandar mengambil kartu..._`;
                await conn.sendMessage(m.chat, { text: uiText, edit: key });
                await delay(1200);
            }

            dealerScore = getScore(dealerHand);

            if (playerScore > CONFIG.TARGET_SCORE) {
                payout = 0; 
                resultMessage = `💥 **BUST!** (Skor > 21)\nKamu melebihi batas, taruhan hangus.`;
            } else if (dealerScore > CONFIG.TARGET_SCORE) {
                payout = Math.floor(bet * CONFIG.WIN_PAYOUT); 
                resultMessage = `🌟 **BANDAR BUST!** (Skor > 21)\nBandar kecolongan, kamu menang!`;
            } else if (playerScore > dealerScore) {
                payout = Math.floor(bet * CONFIG.WIN_PAYOUT); 
                resultMessage = `🏆 **MENANG!**\nSkor kamu lebih tinggi dari Bandar.`;
            } else if (playerScore < dealerScore) {
                payout = 0; 
                resultMessage = `😔 **KALAH!**\nSkor Bandar lebih tinggi.`;
            } else {
                payout = bet; // Push (Balik Modal)
                resultMessage = `🤝 **SERI!** (Push)\nSkor sama, taruhan kamu dikembalikan.`;
            }
        }
        
        let netProfit = payout - bet;

        // --- UPDATE DATABASE SQL & RAM ---
        await updateEconomy(m.sender, { money: Math.max(0, currentMoney + netProfit) });
        
        state.lastcasino = Date.now();
        state.casinoNetWinLoss = (state.casinoNetWinLoss || 0) + netProfit;
        global.judi[m.sender] = state; // Save to RAM

        // --- TAMPILAN AKHIR (EDIT MESSAGE) ---
        let profitLabel = netProfit > 0 ? `+${netProfit.toLocaleString()} (PROFIT)` : (netProfit === 0 ? `0 (BALIK MODAL)` : `${netProfit.toLocaleString()} (RUNGKAD)`);

        const finalMessage = `🃏 | *BLACKJACK CASINO* | 🃏
────────────────────
👤 *Kartu Kamu:* ${formatHand(playerHand)}
   └─ Skor: *${playerScore}*

🤖 *Kartu Bandar:* ${formatHand(dealerHand)}
   └─ Skor: *${dealerScore}*
────────────────────
${resultMessage}

💰 Taruhan: -${bet.toLocaleString()}
💸 Hadiah: +${payout.toLocaleString()}
📊 Net: *${profitLabel}*
💳 Saldo Akhir: *${Math.max(0, currentMoney + netProfit).toLocaleString()}*

_Status AI Bandar: ${getAIStatus(state.casinoNetWinLoss)}_`;

        await conn.sendMessage(m.chat, { text: finalMessage, edit: key });

    } catch (e) {
        console.error(e);
        m.reply('❌ Terjadi kesalahan internal pada kasino. Saldo aman.');
    } finally {
        delete conn.casino[m.sender]; // Buka sesi
    }
};

handler.help = ['casino <jumlah|all>'];
handler.tags = ['game'];
handler.command = /^(casino|blackjack|bj)$/i;
handler.group = true;

module.exports = handler;
