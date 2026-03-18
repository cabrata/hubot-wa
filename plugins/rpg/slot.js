const crypto = require('crypto')
const { getUser, updateEconomy } = require('../../lib/database') // updateCooldown dicabut
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const SPECIAL_GROUP_ID = '120363424163211474@g.us';

const DEFAULT_CONFIG = {
  COOLDOWN: 8000,
  MIN_BET: 5000,
  MAX_BET_PERCENT: 0.20,
  MAX_PAYOUT_MULTIPLIER: 120,
  RICH_THRESHOLD: 100_000_000,
  POOR_THRESHOLD: 100_000,
  PERCENTAGE_LIMIT_THRESHOLD: 10_000_000,
  LUCK_BONUS: 0.1,
};

const SPECIAL_GROUP_CONFIG = {
  ...DEFAULT_CONFIG,
  COOLDOWN: 4000,
  MAX_BET_PERCENT: 0.25,
  RICH_THRESHOLD: 500_000_000,
  POOR_THRESHOLD: 1_000_000,
  PERCENTAGE_LIMIT_THRESHOLD: 50_000_000,
  LUCK_BONUS: 0.3,
};

const SIMULATE = false;

const ADAPTIVE_CONFIG = {
  MAX_BONUS_PENALTY: 0.35, 
  SENSITIVITY_RANGE: 15_000_000 
};

const SYMBOLS_BASE = [
  { s: '🍒', w: 50, tier: 'common' },
  { s: '🍋', w: 40, tier: 'common' },
  { s: '🔔', w: 35, tier: 'uncommon' },
  { s: '⭐', w: 20, tier: 'uncommon' },
  { s: '💎', w: 15, tier: 'rare' },
  { s: '👑', w: 5, tier: 'legendary' }
];

const PAYOUT = {
  '👑': { three: { min: 45, max: 80 }, two: { min: 7, max: 10 } },
  '💎': { three: { min: 20, max: 45 },  two: { min: 3, max: 7 } },
  '⭐': { three: { min: 10, max: 20 },  two: { min: 1.5, max: 3 } },
  '🔔': { three: { min: 6,  max: 15 },  two: { min: 0.95, max: 1.2 } },
  '🍋': { three: { min: 3,  max: 7 },   two: { min: 0.90, max: 1 } },
  '🍒': { three: { min: 2,  max: 5 },   two: { min: 0.70, max: 0.90 } }
};

function getRandomMultiplier(min, max) { return Math.random() * (max - min) + min; }
function isLuckyHour() {
  const hour = new Date().getUTCHours() + 7;
  return (hour >= 12 && hour < 13) || (hour >= 23 && hour < 24);
}

function calculateDynamicLuck(money, bet, maxBet, config) {
  const { POOR_THRESHOLD, RICH_THRESHOLD, LUCK_BONUS } = config;
  let totalLuckBonus = LUCK_BONUS;
  if (isLuckyHour()) totalLuckBonus += (Math.random() * 0.2 + 0.4);

  const isAggressive = bet >= (maxBet * 0.40);

  if (money >= RICH_THRESHOLD) {
    return { factor: isAggressive ? 0.70 + totalLuckBonus : 0.95 + totalLuckBonus, status: isAggressive ? 'Sultan Beringas' : 'Sultan Main Aman' };
  } else if (money <= POOR_THRESHOLD) {
    return { factor: isAggressive ? 1.05 + totalLuckBonus : 1.12 + totalLuckBonus, status: isAggressive ? 'Pejuang Nekat' : 'Pejuang Hati-hati' };
  } else {
    return { factor: isAggressive ? 1.02 + totalLuckBonus : 1.10 + totalLuckBonus, status: isAggressive ? 'Pemain Agresif' : 'Pemain Normal' };
  }
}

function calculateAdaptiveBonus(netWinLoss) {
  const scaled_x = netWinLoss / ADAPTIVE_CONFIG.SENSITIVITY_RANGE;
  const tanh_val = Math.tanh(scaled_x);
  const bonus = -tanh_val * ADAPTIVE_CONFIG.MAX_BONUS_PENALTY;
  
  let status = 'Netral';
  if (bonus > 0.20) status = 'Sangat Rungkad';
  else if (bonus > 0.10) status = 'Cukup Rungkad';
  else if (bonus > 0.02) status = 'Mulai Rungkad';
  else if (bonus < -0.05) status = 'Sangat Gacor';
  else if (bonus < -0.02) status = 'Cukup Gacor';
  else if (bonus < 0) status = 'Mulai Gacor';
  
  return { bonus, status };
}

function getDynamicSymbols(luckFactor) {
  const finalFactor = Math.max(0.5, luckFactor);
  return SYMBOLS_BASE.map(symbol => {
    const newWeight = { ...symbol };
    if (symbol.tier === 'rare' || symbol.tier === 'legendary') newWeight.w = Math.max(1, Math.round(symbol.w * finalFactor));
    return newWeight;
  });
}

function weightedRandomSymbol(symbols) {
  const totalWeight = symbols.reduce((sum, sym) => sum + sym.w, 0);
  let random = crypto.randomInt(0, totalWeight);
  for (const sym of symbols) {
    if (random < sym.w) return sym.s;
    random -= sym.w;
  }
  return symbols[symbols.length - 1].s;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  // 1. Anti Spam Lock
  conn.slotSesi = conn.slotSesi || {};
  if (conn.slotSesi[m.sender]) return m.reply('⏳ Spin sebelumnya masih diproses, mohon tunggu sebentar.');

  // 2. Inisialisasi global.judi untuk Cooldown (RAM)
  global.judi = global.judi || {};
  if (!global.judi[m.sender]) {
      global.judi[m.sender] = { judilast: 0, lastslot: 0, lastcasino: 0 };
  }

  // 3. Memory RAM Database untuk AI (Menghindari Prisma Crash)
  global.slotState = global.slotState || {};
  if (!global.slotState[m.sender]) {
      global.slotState[m.sender] = { freespin: 0, fsBet: 0, slotNetWinLoss: 0 };
  }
  let state = global.slotState[m.sender];

  let user = await getUser(m.sender);
  if (!user) return m.reply('Pengguna tidak ditemukan di database.');

  const config = m.chat === SPECIAL_GROUP_ID ? SPECIAL_GROUP_CONFIG : DEFAULT_CONFIG;
  const { COOLDOWN, MIN_BET, MAX_BET_PERCENT, PERCENTAGE_LIMIT_THRESHOLD, MAX_PAYOUT_MULTIPLIER } = config;
  
  // Cek cooldown menggunakan global.judi
  const timeSinceLastSlot = Date.now() - (global.judi[m.sender].lastslot || 0);
  if (timeSinceLastSlot < COOLDOWN) {
    return m.reply(`⏳ Tenang dulu, bos! Mesin masih panas. Tunggu *${Math.ceil((COOLDOWN - timeSinceLastSlot)/1000)} detik* lagi.`);
  }

  let currentMoney = user.money || 0;
  let maxBet = currentMoney > PERCENTAGE_LIMIT_THRESHOLD ? Math.floor(currentMoney * MAX_BET_PERCENT) : currentMoney;
  
  if (!args[0]) return m.reply(`❓ Gunakan format: *${usedPrefix + command} <jumlah|allin>*\nContoh: *${usedPrefix + command} 10000*`);
  
  let bet = args[0].toLowerCase() === 'allin' ? maxBet : Math.floor(Number(args[0]));
  if (isNaN(bet)) return m.reply(`❌ Input tidak valid. Gunakan angka atau "allin".`);
  if (bet <= 0) return m.reply('❌ Taruhan harus lebih dari nol!');
  if (bet < MIN_BET) return m.reply(`💸 Taruhan minimal adalah *${MIN_BET.toLocaleString()}*.`);
  if (bet > maxBet) return m.reply(`🚫 Taruhanmu terlalu besar! Maksimal taruhanmu saat ini adalah *${maxBet.toLocaleString()}*.`);
  if (currentMoney < bet) return m.reply(`💰 Duitmu tidak cukup! Saldo kamu saat ini: *${currentMoney.toLocaleString()}*.`);

  conn.slotSesi[m.sender] = true; // Kunci Sesi

  try {
    const beforeBalance = currentMoney;
    let netWinLoss = state.slotNetWinLoss;

    const baseLuck = calculateDynamicLuck(beforeBalance, bet, maxBet, config);
    const adaptive = calculateAdaptiveBonus(netWinLoss);
    const finalLuckFactor = baseLuck.factor + adaptive.bonus;
    const currentSymbols = getDynamicSymbols(finalLuckFactor);

    const reel = [weightedRandomSymbol(currentSymbols), weightedRandomSymbol(currentSymbols), weightedRandomSymbol(currentSymbols)];
    const [a, b, c] = reel;

    let reward = 0, payout = 0, messageDetail = '', multiplier = 0;

    if (a === b && b === c) {
      multiplier = getRandomMultiplier(PAYOUT[a].three.min, PAYOUT[a].three.max);
      payout = Math.floor(bet * Math.min(multiplier, MAX_PAYOUT_MULTIPLIER));
      reward = payout - bet;
      messageDetail = `🎉🎊 JACKPOT!! (x${multiplier.toFixed(2)})\nKamu dapat ${a}${b}${c} dan untung bersih *+${reward.toLocaleString()}*!`;
    } else if (a === b || a === c || b === c) {
      const matchingSymbol = (a === b || a === c) ? a : b;
      multiplier = getRandomMultiplier(PAYOUT[matchingSymbol].two.min, PAYOUT[matchingSymbol].two.max);
      payout = Math.floor(bet * multiplier);
      reward = payout - bet;
      messageDetail = reward > 0 ? `✨ Menang! (x${multiplier.toFixed(2)})\nDapat ${matchingSymbol}${matchingSymbol} dan untung bersih *+${reward.toLocaleString()}*.` : `😅 Hadiah Kecil! (x${multiplier.toFixed(2)})\nTaruhan kembali sebagian, kamu rugi *${Math.abs(reward).toLocaleString()}*.`;
    } else {
      reward = -bet;
      messageDetail = `😔 Yah, belum beruntung.\nKamu kalah *-${bet.toLocaleString()}*. Coba lagi!`;
    }
    
    // --- ANIMASI SPIN SLOT ---
    let spinTxt = `🎰 | *SLOT MACHINE* | 🎰\n────────────────────\n`;
    let { key } = await conn.sendMessage(m.chat, { text: spinTxt + `      *🔄   🔄   🔄*\n────────────────────\n\n⏳ Mesin sedang berputar...` }, { quoted: m });
    await delay(800);
    await conn.sendMessage(m.chat, { text: spinTxt + `      *${a}   🔄   🔄*\n────────────────────\n\n⏳ Mesin sedang berputar...`, edit: key });
    await delay(800);
    await conn.sendMessage(m.chat, { text: spinTxt + `      *${a}   ${b}   🔄*\n────────────────────\n\n⏳ Mesin sedang berputar...`, edit: key });
    await delay(1000);

    // --- UPDATE DATABASE & RAM ---
    if (!SIMULATE) {
        await updateEconomy(m.sender, { money: Math.max(0, beforeBalance + reward) });
        
        // Simpan cooldown ke RAM!
        global.judi[m.sender].lastslot = Date.now(); 

        state.slotNetWinLoss = netWinLoss + reward; // Update RAM AI
        global.slotState[m.sender] = state;
    }
    
    const luckMessage = `Status Permainan: *${baseLuck.status}*` + (isLuckyHour() ? `\n🍀 *LUCKY HOUR AKTIF!*` : '');
    
    const resultMessage = `🎰 | *SLOT MACHINE* | 🎰
────────────────────
      *${a}   ${b}   ${c}*
────────────────────

${messageDetail}

💰 Saldo Awal: ${beforeBalance.toLocaleString()}
📈 Perubahan: ${reward > 0 ? '+' : ''}${reward.toLocaleString()}
💳 Saldo Akhir: ${Math.max(0, beforeBalance + reward).toLocaleString()}

────────────────────
*Sistem Keberuntungan Adaptif*
${luckMessage}
Status AI Adaptif: *${adaptive.status}*
📊 Total Net (W/L): *${(state.slotNetWinLoss).toLocaleString()}*
${SIMULATE ? '\n\n⚠️ *MODE SIMULASI: Saldo tidak berubah.*' : ''}`;
    
    // Final Result Edit
    await conn.sendMessage(m.chat, { text: resultMessage, edit: key });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '❌ Terjadi kesalahan internal pada mesin slot. Saldo aman.', m);
  } finally {
    delete conn.slotSesi[m.sender]; // Buka kunci sesi
  }
};

handler.help = ['slot <jumlah taruhan|allin>'];
handler.tags = ['game'];
handler.command = /^(slot|slots)$/i;
handler.group = true;
//handler.rowner = true;

module.exports = handler;
