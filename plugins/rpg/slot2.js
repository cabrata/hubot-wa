const crypto = require('crypto')
const { getUser, updateEconomy } = require('../../lib/database')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const CONFIG = {
  COOLDOWN: 8000,           
  MIN_BET: 400,             
  MAX_BET_PERCENT: 0.20,    
  PERCENTAGE_LIMIT_THRESHOLD: 10_000_000, 
  HARD_CAP_BET: 1_000_000_000, 
  MAX_MULTIPLIER: 1024,     
  MAX_AUTO_SPIN: 20,
  // --- SISTEM BARU: JACKPOT PROGRESSIVE ---
  BASE_JACKPOT: 1_000_000_000_000_000_000_000_000, // Saldo awal brankas server (1 Miliar)
  JACKPOT_FEE: 0.15            // 5% dari tiap taruhan player masuk ke brankas
};

function calculateDynamicLuck(money, bet, maxBet, dynamicRich, dynamicPoor) {
    const isAggressive = bet >= (maxBet * 0.50); 
    // Volatilitas Tinggi: Luck base sedikit diturunkan agar sering 'zonk' di putaran awal, 
    // tapi ketika pecah akan memicu multiplier brutal
    if (money >= dynamicRich) return { factor: isAggressive ? 0.25 : 0.50 }; 
    if (money <= dynamicPoor) return { factor: isAggressive ? 0.70 : 1.00 }; 
    return { factor: isAggressive ? 0.65 : 0.90 }; 
}

function calculateAdaptiveBonus(netWinLoss, dynamicSensitivity) {
    const MAX_PENALTY = 0.75; // RTP Controller
    const scaled_x = netWinLoss / dynamicSensitivity;
    return -(Math.tanh(scaled_x)) * MAX_PENALTY;
}

const SPECIAL = { WILD: '🔥', SCAT: '🌟' };
const SYMBOLS = [
    { s: '🇯', w: 0.2, pay: 0.01 }, 
    { s: '🇶', w: 0.5, pay: 0.8 }, 
    { s: '🇰', w: 0.8, pay: 0.10 }, 
    { s: '🅰️', w: 1, pay: 0.15 }, 
    { s: '🍾', w: 3, pay: 0.25 },
    { s: '👒', w: 5, pay: 0.35 },
    { s: '🔫', w: 8,  pay: 0.50 },
    { s: '🤠', w: 7,  pay: 0.08 } 
];

const VALID_ROWS = [
    [1, 2, 3],       
    [1, 2, 3, 4],    
    [0, 1, 2, 3, 4], 
    [0, 1, 2, 3, 4], 
    [1, 2, 3, 4],    
    [1, 2, 3]        
];

function randomSymbol(luckFactor = 1, isVip = false, isGoldEligible = false) {
    let scatterChance = (isVip ? 3 : 2) * luckFactor; 
    let wildChance = (isVip ? 5 : 3) * luckFactor;   

    let rng = Math.random() * 100;
    if (rng < scatterChance) return { s: SPECIAL.SCAT, gold: false };
    if (rng < wildChance) return { s: SPECIAL.WILD, gold: false };

    const totalWeight = SYMBOLS.reduce((sum, sym) => sum + sym.w, 0);
    let rand = crypto.randomInt(0, totalWeight);
    let chosenSym = SYMBOLS[SYMBOLS.length - 1].s;
    
    for (const sym of SYMBOLS) {
        if (rand < sym.w) { chosenSym = sym.s; break; }
        rand -= sym.w;
    }

    let isGold = false;
    if (isGoldEligible && Math.random() < 0.25) isGold = true;

    return { s: chosenSym, gold: isGold };
}

function generateGrid(luckFactor = 1, isVip = false) {
    let grid = Array(6).fill(null).map(() => Array(5).fill(null));
    for (let c = 0; c < 6; c++) {
        let isGoldEligible = (c === 2 || c === 3);
        for (let r of VALID_ROWS[c]) {
            grid[c][r] = randomSymbol(luckFactor, isVip, isGoldEligible);
        }
    }
    return grid;
}

function evaluateGridWays(grid, bet, multiplier) {
    let linesWon = [];
    let totalWinStep = 0;
    let symbolsToDestroy = []; 
    
    let checkedSymbols = new Set();
    VALID_ROWS[0].forEach(r => {
        let sym = grid[0][r].s;
        if (sym !== SPECIAL.WILD && sym !== SPECIAL.SCAT) checkedSymbols.add(sym);
    });
    if (VALID_ROWS[0].some(r => grid[0][r].s === SPECIAL.WILD)) {
        VALID_ROWS[1].forEach(r => {
            let sym = grid[1][r].s;
            if (sym !== SPECIAL.WILD && sym !== SPECIAL.SCAT) checkedSymbols.add(sym);
        });
    }

    checkedSymbols.forEach(targetSym => {
        let consecutiveReels = 0;
        let coordsInWays = [];
        let wayMultiplier = 1;

        for (let c = 0; c < 6; c++) {
            let foundInCol = [];
            for (let r of VALID_ROWS[c]) {
                if (grid[c][r].s === targetSym || grid[c][r].s === SPECIAL.WILD) {
                    foundInCol.push({ c, r, gold: grid[c][r].gold });
                }
            }
            if (foundInCol.length > 0) {
                consecutiveReels++;
                coordsInWays.push(foundInCol);
                wayMultiplier *= foundInCol.length; 
            } else {
                break; 
            }
        }

        if (consecutiveReels >= 3) {
            let payData = SYMBOLS.find(s => s.s === targetSym);
            if (payData) {
                let winAmount = Math.floor(bet * payData.pay * consecutiveReels * wayMultiplier * multiplier);
                totalWinStep += winAmount;
                linesWon.push(`• ${targetSym} ${consecutiveReels} reel x${multiplier} (+${winAmount.toLocaleString()})`);
                coordsInWays.forEach(colArr => colArr.forEach(coord => symbolsToDestroy.push(coord)));
            }
        }
    });

    let uniqueDestroy = symbolsToDestroy.filter((v, i, a) => a.findIndex(t => (t.c === v.c && t.r === v.r)) === i);
    return { totalWinStep, linesWon, uniqueDestroy };
}

function applyTumble(grid, destroyCoords, luckFactor = 1, isVip = false) {
    let newGrid = JSON.parse(JSON.stringify(grid)); 
    
    destroyCoords.forEach(coord => { 
        if (newGrid[coord.c][coord.r].gold) {
            newGrid[coord.c][coord.r] = { s: SPECIAL.WILD, gold: false }; 
        } else {
            newGrid[coord.c][coord.r] = '💥'; 
        }
    });

    for (let c = 0; c < 6; c++) {
        let validRows = VALID_ROWS[c];
        let isGoldEligible = (c === 2 || c === 3);
        let surviving = [];
        
        for (let r of validRows) { 
            if (newGrid[c][r] !== '💥') surviving.push(newGrid[c][r]); 
        }
        
        while (surviving.length < validRows.length) { 
            surviving.unshift(randomSymbol(luckFactor, isVip, isGoldEligible)); 
        }
        
        for (let i = 0; i < validRows.length; i++) {
            newGrid[c][validRows[i]] = surviving[i];
        }
    }
    return newGrid;
}

function countScatter(grid) {
    let count = 0;
    for (let c = 0; c < 6; c++) {
        for (let r of VALID_ROWS[c]) {
            if (grid[c][r].s === SPECIAL.SCAT) count++;
        }
    }
    return count;
}

function formatGrid(grid) { 
    let output = '';
    for (let r = 0; r < 5; r++) {
        let rowArr = [];
        for (let c = 0; c < 6; c++) {
            if (grid[c][r] === null) {
                rowArr.push(' ⬛ '); 
            } else {
                let sObj = grid[c][r];
                if (sObj.gold) {
                    rowArr.push(`[${sObj.s}]`);
                } else {
                    rowArr.push(` ${sObj.s} `);
                }
            }
        }
        output += `| ${rowArr.join('')} |\n`;
    }
    return output.trim(); 
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    conn.slotAutoSesi = conn.slotAutoSesi || {};
    let session = conn.slotAutoSesi[m.sender] || { slotSpinning: false, cancelAutoSpin: false, isAutoSpinning: false };

    global.judi = global.judi || {};
    if (!global.judi[m.sender]) {
        global.judi[m.sender] = { judilast: 0, lastslot: 0, lastcasino: 0 };
    }

    global.slotState = global.slotState || {};
    if (!global.slotState[m.sender]) {
        global.slotState[m.sender] = { freespin: 0, fsBet: 0, slotNetWinLoss: 0 };
    }
    let state = global.slotState[m.sender];
    
    // Inisialisasi Jackpot Server
    global.progressiveJackpot = global.progressiveJackpot || CONFIG.BASE_JACKPOT;

    let user = await getUser(m.sender);
    if (!user) return m.reply('Pengguna tidak ada di database.');

    let isVip = global.owner && global.owner.includes(m.sender.split('@')[0]);

    if (session.slotSpinning) {
        if (session.isAutoSpinning && !session.cancelAutoSpin) {
            session.cancelAutoSpin = true;
            conn.slotAutoSesi[m.sender] = session;
            return m.reply('🛑 *EMERGENCY STOP AKTIF!*\n\nBot akan menghentikan putaran otomatis setelah runtuhan pada ronde ini selesai.');
        } else {
            return m.reply('⏳ Tunggu putaranmu selesai...');
        }
    }

    let timeSinceLastSlot = Date.now() - (global.judi[m.sender].lastslot || 0);
    if (state.freespin === 0 && timeSinceLastSlot < CONFIG.COOLDOWN) {
        return m.reply(`⏳ Mesin masih panas! Tunggu *${Math.ceil((CONFIG.COOLDOWN - timeSinceLastSlot) / 1000)} detik* lagi.`);
    }

    if (!args[0] && state.freespin === 0) {
        return m.reply(`❓ Format: *${usedPrefix + command} <jumlah|allin> <opsional: auto-spin>*\nContoh Normal: *${usedPrefix + command} 5000*\nContoh Auto 10x: *${usedPrefix + command} 5000 10*`);
    }

    let betArg = args[0] ? args[0].toLowerCase() : '0';
    let autoSpinArg = args[1];
    let autoSpinCount = 1;

    if (autoSpinArg && !isNaN(autoSpinArg)) {
        autoSpinCount = parseInt(autoSpinArg);
        if (autoSpinCount < 1) autoSpinCount = 1;
        if (autoSpinCount > CONFIG.MAX_AUTO_SPIN) return m.reply(`Maksimal auto-spin adalah ${CONFIG.MAX_AUTO_SPIN}x bos!`);
    }

    let currentMoney = user.money || 0;
    let maxBet = currentMoney > CONFIG.PERCENTAGE_LIMIT_THRESHOLD ? Math.floor(currentMoney * CONFIG.MAX_BET_PERCENT) : currentMoney;
    if (maxBet > CONFIG.HARD_CAP_BET) maxBet = CONFIG.HARD_CAP_BET; 
    
    let targetBet = betArg === 'allin' ? maxBet : parseInt(betArg);
    if (targetBet > CONFIG.HARD_CAP_BET) targetBet = CONFIG.HARD_CAP_BET;

    session.slotSpinning = true;
    session.isAutoSpinning = autoSpinCount > 1;
    session.cancelAutoSpin = false;
    conn.slotAutoSesi[m.sender] = session;

    let dynamicRich = 50_000_000;
    let dynamicPoor = 100_000;
    let dynamicSensitivity = 10_000_000;

    let activeMessageKey = null; 

    try {
        for (let spinIndex = 1; spinIndex <= autoSpinCount; spinIndex++) {
            
            if (session.cancelAutoSpin) {
                await conn.sendMessage(m.chat, { text: `🛑 *AUTO-SPIN DIBATALKAN* pada putaran ke-${spinIndex - 1}.` }, { quoted: m });
                break;
            }

            let currentUser = await getUser(m.sender);
            let userMoney = currentUser.money || 0;
            let isFSMode = state.freespin > 0;
            let currentBet = isFSMode ? state.fsBet : targetBet;

            const baseLuck = calculateDynamicLuck(userMoney, currentBet, maxBet, dynamicRich, dynamicPoor);
            const adaptiveBonus = calculateAdaptiveBonus(state.slotNetWinLoss, dynamicSensitivity);
            
            let finalLuckFactor = Math.max(0.01, baseLuck.factor + adaptiveBonus);
            if (isFSMode) finalLuckFactor += 0.05; 

            if (!isFSMode) {
                if (isNaN(currentBet) || currentBet < CONFIG.MIN_BET) {
                    let errMsg = `💸 Taruhan minimal: *${CONFIG.MIN_BET.toLocaleString()}*`;
                    if (!activeMessageKey) await conn.sendMessage(m.chat, { text: errMsg }, { quoted: m });
                    else await conn.sendMessage(m.chat, { text: errMsg, edit: activeMessageKey });
                    break;
                }
                if (userMoney < currentBet) {
                    let errMsg = `💸 Auto-Spin berhenti! Uang tidak cukup.\nSaldo: *${userMoney.toLocaleString()}*`;
                    if (!activeMessageKey) await conn.sendMessage(m.chat, { text: errMsg }, { quoted: m });
                    else await conn.sendMessage(m.chat, { text: errMsg, edit: activeMessageKey });
                    break;
                }
                
                // Potong Fee untuk masuk ke brankas Progressive Jackpot
                let jpContribution = Math.floor(currentBet * CONFIG.JACKPOT_FEE);
                global.progressiveJackpot += jpContribution;
                
                await updateEconomy(m.sender, { money: userMoney - currentBet });
            }

            let currentGrid = generateGrid(finalLuckFactor, isVip);
            let totalWinRound = 0;
            let currentMultiplier = isFSMode ? 8 : 1;
            let isCascading = true;
            let tumbleCount = 1;
            let gotFSTrigger = false;
            let gotMegaJackpot = false;
            let addedSpins = 0;
            let jpWinAmount = 0;

            let autoSpinHeader = session.isAutoSpinning ? `\n🔄 *AUTO-SPIN: ${spinIndex} / ${autoSpinCount}*\n_(Ketik .bounty lagi untuk stop)_\n` : '';
            let jpHeader = `💰 *GLOBAL JACKPOT:* **${global.progressiveJackpot.toLocaleString()}** 💰\n`;
            let txt = `🏜️ *WILD BOUNTY SHOWDOWN* 🏜️\n- *\`User: ${currentUser.name || 'Player'}\`*\n${jpHeader}\n${isFSMode ? `🌟 *FREE SPIN MODE* (${state.freespin} tersisa) 🌟\n` : ''}${autoSpinHeader}────────────────────\n`;

            let initText = txt + formatGrid(currentGrid) + `\n────────────────────\nMultiplier : *x${currentMultiplier}*\n⏳ Mengkalkulasi putaran...`;

            if (!activeMessageKey) {
                let sentMsg = await conn.sendMessage(m.chat, { text: initText }, { quoted: m });
                activeMessageKey = sentMsg.key;
            } else {
                await conn.sendMessage(m.chat, { text: initText, edit: activeMessageKey });
            }

            await delay(1000); 

            while (isCascading && tumbleCount <= 30) {
                let result = evaluateGridWays(currentGrid, currentBet, currentMultiplier);
                let currentScatters = countScatter(currentGrid);
                
                // Trigger Jackpot Progressive (6 Scatters) & Normal FS (3+ Scatters)
                if (currentScatters >= 6 && !gotFSTrigger && !isFSMode) {
                    jpWinAmount = global.progressiveJackpot;
                    totalWinRound += jpWinAmount;
                    global.progressiveJackpot = CONFIG.BASE_JACKPOT; // Reset brankas
                    
                    addedSpins = 16;
                    state.freespin += addedSpins;
                    state.fsBet = currentBet;
                    gotFSTrigger = true;
                    gotMegaJackpot = true;
                } else if (currentScatters >= 3 && !gotFSTrigger) { 
                    addedSpins = 10 + ((currentScatters - 3) * 2);
                    state.freespin += addedSpins;
                    state.fsBet = currentBet;
                    gotFSTrigger = true;
                }

                let spinMsg = txt + formatGrid(currentGrid) + '\n────────────────────\n';
                spinMsg += `Multiplier : *x${currentMultiplier}*\n`;
                
                if (result.totalWinStep > 0 || gotMegaJackpot) {
                    if (result.totalWinStep > 0) {
                        totalWinRound += result.totalWinStep;
                        spinMsg += `\n💥 *PECAH COMBO!* (+${result.totalWinStep.toLocaleString()})\n${result.linesWon.join('\n')}`;
                    }
                    
                    if (gotMegaJackpot) {
                        spinMsg += `\n\n🚨🚨 **MEGA JACKPOT PECAH!!!** 🚨🚨\nKamu menyapu bersih brankas server senilai **+${jpWinAmount.toLocaleString()}**!!!`;
                    } else if (gotFSTrigger) {
                        spinMsg += `\n\n🌟 *SCATTER HIT! +${addedSpins} FREE SPINS!* 🌟`;
                    }
                    
                    try { await conn.sendMessage(m.chat, { text: spinMsg, edit: activeMessageKey }); } catch (e) {}
                    await delay(2000); 

                    currentGrid = applyTumble(currentGrid, result.uniqueDestroy, finalLuckFactor, isVip);
                    currentMultiplier = Math.min(currentMultiplier * 2, CONFIG.MAX_MULTIPLIER);
                    tumbleCount++;
                } else {
                    isCascading = false;
                    
                    if (isFSMode) state.freespin = Math.max(0, state.freespin - 1); 
                    
                    let finalUser = await getUser(m.sender);
                    let netProfit = isFSMode ? totalWinRound : (totalWinRound - currentBet);
                    
                    await updateEconomy(m.sender, { money: (finalUser.money || 0) + totalWinRound });
                    global.judi[m.sender].lastslot = Date.now();

                    state.slotNetWinLoss += netProfit;
                    global.slotState[m.sender] = state;

                    let freshUser = await getUser(m.sender); 

                    let profitLabel = netProfit > 0 ? `+${netProfit.toLocaleString()} (PROFIT)` : `${netProfit.toLocaleString()} (RUNGKAD)`;

                    spinMsg += `\n🛑 *TIDAK ADA PECAHAN LAGI*\n\n`;
                    spinMsg += `Taruhan : -${currentBet.toLocaleString()}\n`;
                    spinMsg += `Menang : +${totalWinRound.toLocaleString()}\n`;
                    spinMsg += `Net : *${profitLabel}*\n\n`;
                    spinMsg += `💳 Saldo Sekarang:\n*${(freshUser.money || 0).toLocaleString()}*`;
                    
                    if (gotFSTrigger && !gotMegaJackpot) spinMsg += `\n\n🎁 *SIAP-SIAP! KAMU MENDAPAT ${addedSpins} FREE SPIN!*`;

                    try { await conn.sendMessage(m.chat, { text: spinMsg, edit: activeMessageKey }); } catch (e) {}
                }
            }
            if (spinIndex < autoSpinCount && !session.cancelAutoSpin) await delay(3000);
        }

    } catch (e) {
        console.error(e);
        m.reply('❌ Mesin slot sedang dalam perbaikan. Sistem database error.');
    } finally {
        delete conn.slotAutoSesi[m.sender];
    }
};

handler.help = ['bounty <taruhan> <auto-spin>'];
handler.tags = ['game'];
handler.command = /^(slot2|judi2|bounty|wildbounty)$/i;

module.exports = handler;
