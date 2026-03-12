const { getUser, updateEconomy, updateRpg, updateJob, addInventory, getTool, setTool } = require('../../lib/database')

const fm = (number) => new Intl.NumberFormat('id-ID').format(number);

// =========================================================
// DATA BARANG TOKO & JALUR PENYIMPANAN DATABASE BARU
// =========================================================
const shopItems = {
    // Kategori: Kebutuhan
    limit: { buy: 2, sell: 20000, buyCurr: 'diamond', category: 'Kebutuhan', type: 'economy' },
    pet: { buy: 150000, sell: 1000, category: 'Kebutuhan', type: 'inventory' },
    cupon: { buy: 500, sell: 0, buyCurr: 'tiketcoin', category: 'Kebutuhan', type: 'economy' },

    // Kategori: Barang Investasi (Terkoneksi ke global.market dari rpg-invest.js)
    diamond: { buy: 100000, sell: 1000, marketKey: 'diamond', category: 'Investasi', type: 'economy' },
    emas: { buy: 150000, sell: 15000, marketKey: 'gold', category: 'Investasi', type: 'economy' }, 
    iron: { buy: 20000, sell: 5000, marketKey: 'iron', category: 'Investasi', type: 'economy' },

    // Kategori: Bibit
    bibitpisang: { buy: 550, sell: 50, category: 'Bibit', type: 'inventory' },
    bibitanggur: { buy: 550, sell: 50, category: 'Bibit', type: 'inventory' },
    bibitmangga: { buy: 550, sell: 50, category: 'Bibit', type: 'inventory' },
    bibitjeruk: { buy: 550, sell: 50, category: 'Bibit', type: 'inventory' },
    bibitapel: { buy: 550, sell: 50, category: 'Bibit', type: 'inventory' },
    gardenboxs: { buy: 10000, sell: 1000, category: 'Bibit', type: 'inventory' }, 

    // Kategori: Barang Umum & Mining
    potion: { buy: 20000, sell: 100, category: 'Barang', type: 'inventory' },
    coal: { buy: 1500, sell: 1000, category: 'Barang', type: 'inventory' },
    berlian: { buy: 150000, sell: 10000, category: 'Barang', type: 'economy' },
    sampah: { buy: 120, sell: 5, category: 'Barang', type: 'inventory' },
    kaleng: { buy: 400, sell: 100, category: 'Barang', type: 'inventory' },
    kardus: { buy: 400, sell: 50, category: 'Barang', type: 'inventory' },
    botol: { buy: 300, sell: 50, category: 'Barang', type: 'inventory' },
    kayu: { buy: 1000, sell: 400, category: 'Barang', type: 'inventory' },
    batu: { buy: 500, sell: 100, category: 'Barang', type: 'inventory' },
    string: { buy: 50000, sell: 5000, category: 'Barang', type: 'inventory' },
    bensin: { buy: 20000, sell: 10000, category: 'Barang', type: 'inventory' },

    // Kategori: Senjata & Crate
    common: { buy: 100000, sell: 1000, category: 'Loot Box', type: 'inventory' },
    uncommon: { buy: 100000, sell: 100, category: 'Loot Box', type: 'inventory' },
    mythic: { buy: 100000, sell: 1000, category: 'Loot Box', type: 'inventory' },
    legendary: { buy: 200000, sell: 5000, category: 'Loot Box', type: 'inventory' },
    weapon: { buy: 150000, sell: 15000, category: 'Equip', type: 'tool' },
    sword: { buy: 150000, sell: 15000, category: 'Equip', type: 'tool' },
    
    // Kategori: Makanan & Minuman
    pisang: { buy: 5500, sell: 100, category: 'Konsumsi', type: 'inventory' },
    anggur: { buy: 5500, sell: 150, category: 'Konsumsi', type: 'inventory' },
    mangga: { buy: 4600, sell: 150, category: 'Konsumsi', type: 'inventory' },
    jeruk: { buy: 6000, sell: 300, category: 'Konsumsi', type: 'inventory' },
    apel: { buy: 5500, sell: 400, category: 'Konsumsi', type: 'inventory' },
    aqua: { buy: 5000, sell: 1000, category: 'Konsumsi', type: 'inventory' },
    obat: { buy: 15000, sell: 0, category: 'Konsumsi', type: 'inventory' },
    tiketm: { buy: 20000, sell: 0, dbField: 'healthmonster', category: 'Konsumsi', type: 'rpg' }, 

    // Kategori: Makanan Pet
    makananpet: { buy: 50000, sell: 500, category: 'Pakan Pet', type: 'inventory' },
    makanannaga: { buy: 150000, sell: 10000, category: 'Pakan Pet', type: 'inventory' },
    makananphonix: { buy: 80000, sell: 5000, category: 'Pakan Pet', type: 'inventory' },
    makanankyubi: { buy: 150000, sell: 10000, category: 'Pakan Pet', type: 'inventory' },
    makanangriffin: { buy: 80000, sell: 5000, category: 'Pakan Pet', type: 'inventory' },
    makanancentaur: { buy: 150000, sell: 10000, category: 'Pakan Pet', type: 'inventory' },

    // Kategori: Pancingan
    umpan: { buy: 1500, sell: 100, category: 'Pancing', type: 'job' }, 
    pancingan: { buy: 5000000, sell: 500000, category: 'Pancing', type: 'tool', dbField: 'fishingrod' }
};

// =========================================================
// FUNGSI MENDAPATKAN HARGA (Normal vs Investasi)
// =========================================================
function getPrice(itemName, type) {
    let item = shopItems[itemName];
    if (!item) return 0;
    
    // Tarik harga dinamis dari Pasar Investasi di RAM
    if (item.marketKey && global.market?.assets?.[item.marketKey]) {
        const currentMarket = global.market.assets[item.marketKey].currentPrice;
        return type === 'buy' ? currentMarket : Math.floor(currentMarket * 0.7); 
    }
    
    return type === 'buy' ? item.buy : item.sell;
}

// =========================================================
// FUNGSI AUTO-GENERATE MENU TOKO
// =========================================================
function generateShopMenu() {
    let menu = `╸╸━━━「 *TOKO RPG* 」━━━╺╺\n`;
    menu += `⚠️ _Harga dengan (📈) mengikuti Pasar Investasi_\n\n`;
    
    const categories = {};
    for (const key in shopItems) {
        const cat = shopItems[key].category || 'Lainnya';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ name: key, ...shopItems[key] });
    }

    for (const cat in categories) {
        menu += `> *${cat}*\n`;
        categories[cat].forEach(item => {
            let nama = item.name.charAt(0).toUpperCase() + item.name.slice(1);
            let hBuy = fm(getPrice(item.name, 'buy'));
            let hSell = fm(getPrice(item.name, 'sell'));
            
            let currTag = item.buyCurr === 'diamond' ? ' (Diamond)' : (item.buyCurr === 'tiketcoin' ? ' (Kupon)' : '');
            let trend = item.marketKey ? ' 📈' : '';
            
            if (item.sell > 0 || item.marketKey) {
                menu += `🛒 ${nama}: Beli ${hBuy}${currTag} | Jual ${hSell}${trend}\n`;
            } else {
                menu += `🛒 ${nama}: Beli ${hBuy}${currTag} | (Tidak bisa dijual)\n`;
            }
        });
        menu += `\n`;
    }
    
    menu += `=======================\n*Penggunaan:* .shop <buy/sell> <item> <jumlah>\nContoh: *.buy potion 2*`;
    return menu;
}


let handler = async (m, { conn, command, args, usedPrefix }) => {
    let user = await getUser(m.sender);
    if (!user) return;

    let action = '';
    let itemReq = '';
    let count = 1;

    if (/shop|toko/i.test(command)) {
        action = (args[0] || '').toLowerCase();
        itemReq = (args[1] || '').toLowerCase();
        count = parseInt(args[2]);
    } else if (/beli|buy/i.test(command)) {
        action = 'buy';
        itemReq = (args[0] || '').toLowerCase();
        count = parseInt(args[1]);
    } else if (/sell|jual/i.test(command)) {
        action = 'sell';
        itemReq = (args[0] || '').toLowerCase();
        count = parseInt(args[1]);
    }

    count = (count && count > 0) ? Math.min(999999999999999, count) : 1;

    if (!action || !itemReq) return conn.reply(m.chat, generateShopMenu(), m);

    // =========================================================
    // LOGIKA KHUSUS ARMOR (Karena beli bertahap / Leveling)
    // =========================================================
    if (itemReq === 'armor' && action === 'buy') {
        let toolArmor = await getTool(m.sender, 'armor');
        const _armor = toolArmor ? (toolArmor.level || 0) : 0;
        
        if (_armor >= 5) return m.reply('Armormu sudah *Level Max*');
        const armorPrice = (_armor === 0 ? 20000 : _armor === 1 ? 49999 : _armor === 2 ? 99999 : _armor === 3 ? 149999 : 299999);
        
        if ((user.money || 0) >= armorPrice) {
            await updateEconomy(m.sender, { money: (user.money || 0) - armorPrice });
            await setTool(m.sender, 'armor', { level: _armor + 1, durability: (_armor + 1) * 50 });
            return m.reply(`✅ Sukses membeli armor level selanjutnya seharga ${fm(armorPrice)} money.`);
        } else {
            return m.reply(`❌ Uangmu tidak cukup. Butuh ${fm(armorPrice)} money.`);
        }
    }

    // =========================================================
    // LOGIKA UMUM TRANSAKSI (Otomatis deteksi jenis penyimpanan)
    // =========================================================
    let itemData = shopItems[itemReq];
    if (!itemData) return conn.reply(m.chat, `❌ Barang *${itemReq}* tidak dijual di toko ini.\nKetik *.shop* untuk melihat daftar barang.`, m);

    let dbField = itemData.dbField || itemReq; 
    let buyCurr = itemData.buyCurr || 'money';
    let sellCurr = itemData.sellCurr || 'money';

    let economyCurrencies = ['money', 'diamond', 'tiketcoin', 'poin', 'emas', 'iron', 'cupon', 'berlian'];

    if (action === 'buy') {
        let pricePerItem = getPrice(itemReq, 'buy');
        if (pricePerItem === 0) return m.reply(`❌ Item ini tidak bisa dibeli.`);
        let totalPrice = pricePerItem * count;

        let isBuyCurrEcon = economyCurrencies.includes(buyCurr);
        let userCurr = isBuyCurrEcon ? (user[buyCurr] || 0) : (user[buyCurr] || 0);

        if (userCurr < totalPrice) {
            return m.reply(`💰 *${buyCurr}* kamu tidak cukup! Butuh *${fm(totalPrice)}*, saldo kamu hanya *${fm(userCurr)}*.`);
        }

        // 1. Kurangi Mata Uang
        if (isBuyCurrEcon) {
            await updateEconomy(m.sender, { [buyCurr]: userCurr - totalPrice });
        } else {
            await addInventory(m.sender, buyCurr, -totalPrice);
        }

        // 2. Berikan Barang ke Database yang Sesuai
        if (itemData.type === 'economy') {
            await updateEconomy(m.sender, { [dbField]: (user[dbField] || 0) + count });
        } else if (itemData.type === 'inventory') {
            await addInventory(m.sender, dbField, count);
        } else if (itemData.type === 'rpg') {
            await updateRpg(m.sender, { [dbField]: (user[dbField] || 0) + count });
        } else if (itemData.type === 'job') {
            await updateJob(m.sender, { [dbField]: (user[dbField] || 0) + count });
        } else if (itemData.type === 'tool') {
            // Berikan tool dengan durability penuh
            await setTool(m.sender, dbField, { level: 1, durability: 50 });
        }

        m.reply(`✅ Sukses membeli *${fm(count)} ${itemReq}* seharga *${fm(totalPrice)} ${buyCurr}*`);
        
    } else if (action === 'sell') {
        let pricePerItem = getPrice(itemReq, 'sell');
        if (pricePerItem === 0) return m.reply(`❌ Item *${itemReq}* tidak bisa dijual ke toko.`);
        let totalRevenue = pricePerItem * count;

        // Hitung stok yang dimiliki
        let userItemCount = 0;
        if (itemData.type === 'tool') {
            let toolObj = await getTool(m.sender, dbField);
            userItemCount = toolObj ? 1 : 0;
            if (count > 1) count = 1; // Tool hanya bisa dijual 1 per 1
        } else {
            userItemCount = user[dbField] || 0;
        }

        if (userItemCount < count) {
            return m.reply(`📦 *${itemReq}* kamu tidak cukup untuk dijual sebanyak itu. Kamu hanya punya *${fm(userItemCount)}*.`);
        }

        // 1. Tarik Barang dari Database
        if (itemData.type === 'economy') {
            await updateEconomy(m.sender, { [dbField]: userItemCount - count });
        } else if (itemData.type === 'inventory') {
            await addInventory(m.sender, dbField, -count);
        } else if (itemData.type === 'rpg') {
            await updateRpg(m.sender, { [dbField]: userItemCount - count });
        } else if (itemData.type === 'job') {
            await updateJob(m.sender, { [dbField]: userItemCount - count });
        } else if (itemData.type === 'tool') {
            await setTool(m.sender, dbField, null);
        }

        // 2. Berikan Uang ke Player
        let isSellCurrEcon = economyCurrencies.includes(sellCurr);
        if (isSellCurrEcon) {
            await updateEconomy(m.sender, { [sellCurr]: (user[sellCurr] || 0) + totalRevenue });
        } else {
            await addInventory(m.sender, sellCurr, totalRevenue);
        }

        m.reply(`✅ Sukses menjual *${fm(count)} ${itemReq}*, kamu mendapatkan *${fm(totalRevenue)} ${sellCurr}*`);
    } else {
        return conn.reply(m.chat, generateShopMenu(), m);
    }
}

handler.help = ['shop <sell|buy> <args>']
handler.tags = ['rpg']
handler.command = /^(shop|toko|buy|beli|sell|jual)$/i
handler.registered = true
handler.group = true

module.exports = handler;
