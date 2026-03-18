const { db, getUser, updateUser, updateEconomy } = require('../../lib/database');

function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

const MARKET_UPDATE_INTERVAL = 5 * 60 * 1000; 
const TRANSACTION_FEE = 0.007;

function formatMoney(number) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.floor(number)); }
function formatPercent(decimal) { return `${(decimal * 100 >= 0 ? '+' : '')}${(decimal * 100).toFixed(2)}%`; }

function calculatePassivePrice(currentPrice, basePrice, volatility) {
    const change = (Math.random() * (volatility * 2)) - volatility;
    let newPrice = currentPrice * (1 + change);
    if (newPrice < basePrice * 0.10) newPrice = basePrice * 0.10 + (Math.random() * basePrice * 0.05);
    if (newPrice > basePrice * 10) newPrice = basePrice * 10 - (Math.random() * basePrice * 0.05);
    return Math.floor(newPrice);
}

function applyMarketImpactLocale(market, itemKey, amount, isBuying) {
    const assetConfig = market.assetsConfig[itemKey];
    
    // 🛡️ FIX RUMUS: Impact Market Crypto dibikin sangat berat
    // Dibagi 10.000 biar butuh triliunan buat gerakin harga
    let impactRatio = amount / (assetConfig.vLiq * 10000); 
    
    // MAKSIMAL harga cuma boleh goyang 0.5% per transaksi (Nggak bisa spam spike lagi)
    if (impactRatio > 0.005) impactRatio = 0.005; 
    
    let cp = market.assets[itemKey].currentPrice;
    let newPrice = Math.floor(cp * (isBuying ? (1 + impactRatio) : (1 - impactRatio)));
    market.assets[itemKey].currentPrice = Math.max(Math.floor(assetConfig.basePrice * 0.10), newPrice);
}


async function getMarketState() {
    let globalState = await db.marketGlobal.findUnique({ where: { id: 1 } });
    if (!globalState) {
        globalState = await db.marketGlobal.create({ data: { id: 1, lastUpdate: BigInt(Date.now()) } });
        await db.marketAsset.create({
            data: { id: 'btc', name: 'Bitcoin', basePrice: 50000000, volatility: 0.05, vLiq: 1000, currentPrice: 50000000, previousPrice: 50000000 }
        });
    }
    
    let assets = await db.marketAsset.findMany();
    let market = { assetsConfig: {}, assets: {}, lastUpdate: Number(globalState.lastUpdate) };
    for (let a of assets) {
        market.assetsConfig[a.id] = { name: a.name, basePrice: a.basePrice, volatility: a.volatility, vLiq: a.vLiq };
        market.assets[a.id] = { currentPrice: a.currentPrice, previousPrice: a.previousPrice };
    }
    return market;
}

async function updateMarketPassive() {
    let market = await getMarketState();
    const now = Date.now();

    if (now - market.lastUpdate >= MARKET_UPDATE_INTERVAL) {
        let intervalsMissed = Math.min(24, Math.floor((now - market.lastUpdate) / MARKET_UPDATE_INTERVAL));
        for (const key in market.assetsConfig) {
            market.assets[key].previousPrice = market.assets[key].currentPrice;
            for (let i = 0; i < intervalsMissed; i++) {
                market.assets[key].currentPrice = calculatePassivePrice(market.assets[key].currentPrice, market.assetsConfig[key].basePrice, market.assetsConfig[key].volatility);
            }
            await db.marketAsset.update({
                where: { id: key },
                data: { currentPrice: market.assets[key].currentPrice, previousPrice: market.assets[key].previousPrice }
            });
        }
        market.lastUpdate = now;
        await db.marketGlobal.update({ where: { id: 1 }, data: { lastUpdate: BigInt(now) } });
    }
    return market;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let userSql = await getUser(m.sender);
    if (!userSql) return m.reply("Data tidak ditemukan.");

  /*  // 🛡️ CEK ANTI CHEAT: Kalau duit udah nyentuh triliunan, reset jadi 0 (Hukuman buat cheater)
    let userMoney = Number(userSql.economy?.money || userSql.money || 0);
    if (userMoney > 1_000_000_000_000_000 || isNaN(userMoney) || userMoney === Infinity) {
        await updateEconomy(m.sender, { money: 0 });
        return m.reply("🚨 *SISTEM ANTI-CHEAT AKTIF* 🚨\n\nTerdeteksi eksploitasi bug uang tak terbatas. Saldo kamu telah di-reset menjadi Rp 0.");
    }*/

    let investData = parseJSON(userSql.invest) || {};

    const market = await updateMarketPassive();
    const action = args[0] ? args[0].toLowerCase() : 'porto';

    if (action === 'porto' || action === 'info') {
        let portoDisplay = `💼 *PORTOFOLIO INVESTASI*\n────────────────────\n\n`;
        let totalValue = 0;

        for (const key in investData) {
            if (market.assetsConfig[key] && market.assets[key]) {
                const amount = investData[key].amount;
                const netVal = (amount * market.assets[key].currentPrice) * (1 - TRANSACTION_FEE);
                totalValue += netVal;
                portoDisplay += `➥ *${market.assetsConfig[key].name}* : ${amount} lbr\n💰 Estimasi: ${formatMoney(netVal)}\n\n`;
            }
        }
        portoDisplay += `────────────────────\n📈 *Total Saldo: ${formatMoney(totalValue)}*`;
        return m.reply(portoDisplay.trim());
    }

    else if (action === 'list' || action === 'market') {
        let marketDisplay = `🏛️ *DAFTAR ASET BURSA*\n────────────────────\n\n`;
        for (const key in market.assetsConfig) {
            if (market.assets[key]) {
                const pctChange = (market.assets[key].currentPrice - market.assets[key].previousPrice) / market.assets[key].previousPrice;
                marketDisplay += `➥ *${market.assetsConfig[key].name} [${key.toUpperCase()}]*\n   Harga: ${formatMoney(market.assets[key].currentPrice)} (${formatPercent(pctChange)})\n\n`;
            }
        }
        return m.reply(marketDisplay.trim());
    }

    else if (action === 'buy' || action === 'beli') {
        const item = args[1]?.toLowerCase();
        let amountRaw = args[2]?.toLowerCase();
        
        if (!item || !market.assetsConfig[item]) return m.reply(`❓ Kode aset salah.`);
        
        // 🛡️ FIX: Parsing ketat buat nahan angka absurd
        let amount = 0;
        const price = market.assets[item].currentPrice;

        if (amountRaw === 'all') {
            amount = Math.floor(userMoney / (price * (1 + TRANSACTION_FEE)));
        } else {
            amount = Number(amountRaw); 
        }

        // 🛡️ BATASAN: Gak boleh beli kurang dari 1, gak boleh beli lebih dari 1 juta lot sekali transaksi
        if (isNaN(amount) || !Number.isSafeInteger(amount) || amount < 1) return m.reply(`❌ Jumlah koin tidak valid!`);
        if (amount > 1000000) return m.reply(`🚫 Transaksi ditolak! Maksimal pembelian adalah 1.000.000 koin per transaksi untuk mencegah manipulasi pasar.`);

        const totalCost = Math.floor((price * amount) * (1 + TRANSACTION_FEE));
        if (userMoney < totalCost) return m.reply(`💰 Uang kurang! Butuh *${formatMoney(totalCost)}*`);

        if (!investData[item]) investData[item] = { amount: 0, totalCost: 0 };
        investData[item].amount += amount;
        investData[item].totalCost += totalCost; 

        await updateEconomy(m.sender, { money: userMoney - totalCost });
        await updateUser(m.sender, { invest: JSON.stringify(investData) });

        applyMarketImpactLocale(market, item, amount, true);
        await db.marketAsset.update({
            where: { id: item },
            data: { currentPrice: market.assets[item].currentPrice }
        });
        return m.reply(`✅ Membeli *${amount} ${market.assetsConfig[item].name}* seharga total *${formatMoney(totalCost)}*`);
    }

    else if (action === 'sell' || action === 'jual') {
        const item = args[1]?.toLowerCase();
        let amountRaw = args[2]?.toLowerCase();

        if (!item || !market.assetsConfig[item]) return m.reply(`❓ Kode aset salah.`);
        if (!investData[item]) return m.reply(`📦 Kamu tidak punya aset ini.`);

        // 🛡️ FIX: Parsing ketat
        let amount = 0;
        if (amountRaw === 'all') {
            amount = investData[item].amount;
        } else {
            amount = Number(amountRaw);
        }

        if (isNaN(amount) || !Number.isSafeInteger(amount) || amount < 1 || amount > investData[item].amount) return m.reply(`❌ Jumlah aset tidak valid atau tidak cukup.`);

        const netRev = Math.floor((market.assets[item].currentPrice * amount) * (1 - TRANSACTION_FEE));
        const avgCost = investData[item].totalCost / investData[item].amount;
        
        investData[item].amount -= amount;
        investData[item].totalCost -= (avgCost * amount);
        if (investData[item].amount <= 0) delete investData[item];

        await updateEconomy(m.sender, { money: userMoney + netRev });
        await updateUser(m.sender, { invest: JSON.stringify(investData) });

        applyMarketImpactLocale(market, item, amount, false);
        await db.marketAsset.update({
            where: { id: item },
            data: { currentPrice: market.assets[item].currentPrice }
        });
        return m.reply(`✅ Menjual *${amount} ${market.assetsConfig[item].name}*. Bersih didapat: *${formatMoney(netRev)}*`);
    }

    else if (action === 'create' || action === 'add') {
        let isStaff = global.owner?.includes(m.sender.split('@')[0]) || (userSql.role && userSql.role.toLowerCase().includes('moderator'));
        if (!isStaff) return m.reply('❌ Khusus Owner!');
        
        const key = args[1]?.toLowerCase();
        let basePrice = parseInt(args[3]), liq = parseInt(args[4]);
        if (!key || isNaN(basePrice) || isNaN(liq)) return m.reply(`❓ Format: *${usedPrefix}ind create btc Bitcoin 15000 50000*`);

        await db.marketAsset.create({
            data: {
                id: key, name: args[2].replace(/_/g, ' '), basePrice, volatility: (Math.floor(Math.random() * 11) + 5) / 100, vLiq: liq, currentPrice: basePrice, previousPrice: basePrice
            }
        });
        return m.reply(`🎉 Aset *${key.toUpperCase()}* dilisting dengan harga ${formatMoney(basePrice)}!`);
    }

    else if (action === 'hapus' || action === 'del') {
        let isStaff = global.owner?.includes(m.sender.split('@')[0]);
        if (!isStaff) return m.reply('❌ Khusus Owner!');
        const key = args[1]?.toLowerCase();
        
        try {
            await db.marketAsset.delete({ where: { id: key } });
            return m.reply(`⚠️ Aset *${key.toUpperCase()}* di-delisting!`);
        } catch {
            return m.reply('❓ Kode aset tidak ditemukan.');
        }
    } else {
        return m.reply(`*Market Exchange*\n- ${usedPrefix+command} beli <kode> <jumlah>\n- ${usedPrefix+command} jual <kode> <jumlah>\n- ${usedPrefix+command} list\n- ${usedPrefix+command} porto`);
    }
};

handler.help = ['ind'];
handler.tags = ['rpg'];
handler.command = /^(ind|invest|market)$/i;
module.exports = handler;
