const { db, getUser, updateUser } = require('../../lib/database'); 

function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

const BIAYA_IPO = 50_000_000; 
const HARGA_AWAL = 1000;   
const TOTAL_SAHAM_IPO = 50_000; 
const PORSI_PUBLIK = 0.30; 
const FEE_BROKER = 0.0015; 
const VOLATILITAS = 0.05; 
const ARA_LIMIT = 1.35; 
const ARB_LIMIT = 0.65; 

function formatMoney(number) {
    return 'Rp ' + BigInt(Math.floor(number)).toLocaleString('id-ID');
}

function formatLargeNumber(number) {
    if (number >= 1e12) return (number / 1e12).toFixed(2) + ' T';
    if (number >= 1e9) return (number / 1e9).toFixed(2) + ' M';
    if (number >= 1e6) return (number / 1e6).toFixed(2) + ' Jt';
    return BigInt(Math.floor(number)).toLocaleString('id-ID');
}

async function getBursa() {
    const list = await db.bursa.findMany();
    let bursa = {};
    for (let pt of list) {
        bursa[pt.ownerJid] = {
            ticker: pt.ticker,
            name: pt.name,
            ownerId: pt.ownerJid,
            price: pt.price,
            sharesAvailable: Number(pt.sharesAvailable),
            totalShares: Number(pt.totalShares),
            funds: pt.funds
        };
    }
    return bursa;
}

async function updateBursaDB(ownerId, data) {
    await db.bursa.update({
        where: { ownerJid: ownerId },
        data: {
            price: data.price,
            sharesAvailable: BigInt(Math.floor(data.sharesAvailable)),
            totalShares: BigInt(Math.floor(data.totalShares)),
            funds: data.funds
        }
    });
}

function cariPT(bursa, tickerPencarian) {
    const query = tickerPencarian.toUpperCase().trim();
    for (const ownerId in bursa) {
        if (bursa[ownerId].ticker === query) return { ownerId, data: bursa[ownerId] };
    }
    return null;
}

function cekNamaPT(bursa, nama) {
    const query = nama.toLowerCase().trim();
    for (const ownerId in bursa) {
        if (bursa[ownerId].name.toLowerCase() === query) return true;
    }
    return false;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let userSql = await getUser(m.sender);
    if (!userSql) return m.reply("Data user tidak ditemukan di database.");

    let userMoney = Number(userSql.money) || Number(userSql.economy?.money) || 0;
    let userPorto = parseJSON(userSql.portofolio) || {};

    let bursa = await getBursa();
    let bursaUpdatedOps = {};

    let action = command.toLowerCase() === 'listsaham' ? 'list' : (args[0] ? args[0].toLowerCase() : 'info');

    // =================================================================
    // 🗞️ SISTEM EVENT PASAR REALISTIS & NPC TRADER
    // =================================================================
    const ptKeys = Object.keys(bursa);
    if (ptKeys.length > 0 && action !== 'buat') {
        
        if (Math.random() < 0.10) { 
            let ptId = ptKeys[Math.floor(Math.random() * ptKeys.length)];
            let ptHoki = bursa[ptId];
            let marketEvents = [
                { tipe: 'good', nama: "Laporan Keuangan Kuartal Memuaskan", danaMin: 100000000, danaMax: 500000000, efek: 1.10 }, 
                { tipe: 'good', nama: "Memenangkan Tender Proyek Pemerintah", danaMin: 500000000, danaMax: 1000000000, efek: 1.15 }, 
                { tipe: 'bad', nama: "Skandal Korupsi Jajaran Direksi", danaMin: -500000000, danaMax: -100000000, efek: 0.80 }, 
                { tipe: 'bad', nama: "Pabrik / Kantor Cabang Terbakar", danaMin: -300000000, danaMax: -50000000, efek: 0.85 } 
            ];
            
            let ev = marketEvents[Math.floor(Math.random() * marketEvents.length)];
            let danaSuntikan = Math.floor(Math.random() * (Math.abs(ev.danaMax) - Math.abs(ev.danaMin)) + Math.abs(ev.danaMin));
            
            let berita = `📰 *BREAKING NEWS BURSA SAHAM*\n\n`;
            if (ev.tipe === 'good') {
                ptHoki.funds += danaSuntikan;
                ptHoki.price = Math.floor(ptHoki.price * ev.efek);
                berita += `📈 Emiten *[${ptHoki.ticker}]* mengalami *${ev.nama}*!\n💰 Kas bertambah *${formatLargeNumber(danaSuntikan)}*.\n🚀 Harga saham naik menjadi *${formatMoney(ptHoki.price)}/lbr*!`;
            } else {
                ptHoki.funds = Math.max(0, ptHoki.funds - danaSuntikan); 
                ptHoki.price = Math.max(50, Math.floor(ptHoki.price * ev.efek));
                berita += `📉 Emiten *[${ptHoki.ticker}]* tertimpa musibah: *${ev.nama}*!\n💸 Kerugian kas sebesar *${formatLargeNumber(danaSuntikan)}*.\n⚠️ Harga anjlok menjadi *${formatMoney(ptHoki.price)}/lbr*!`;
            }
            bursaUpdatedOps[ptId] = true;
            setTimeout(() => conn.reply(m.chat, berita, null), 1000); 
        }

        let jumlahNPC = Math.floor(Math.random() * 3) + 1; 
        for (let i = 0; i < jumlahNPC; i++) {
            let ptId = ptKeys[Math.floor(Math.random() * ptKeys.length)];
            let ptTarget = bursa[ptId];
            let isNPCBuying = Math.random() > 0.5; 
            let volumeNPC = Math.floor(Math.random() * 3000) + 100; 
            
            if (isNPCBuying && ptTarget.sharesAvailable >= volumeNPC) {
                ptTarget.sharesAvailable -= volumeNPC; 
                ptTarget.price = Math.floor(ptTarget.price * Math.min(ARA_LIMIT, 1 + (VOLATILITAS * (volumeNPC / 1000))));
                bursaUpdatedOps[ptId] = true;
            } else if (!isNPCBuying) {
                ptTarget.sharesAvailable += volumeNPC; 
                ptTarget.price = Math.max(50, Math.floor(ptTarget.price * Math.max(ARB_LIMIT, 1 - (VOLATILITAS * (volumeNPC / 1000))))); 
                bursaUpdatedOps[ptId] = true;
            }
        }
        
        for (const [ptId, updated] of Object.entries(bursaUpdatedOps)) {
            if (updated) await updateBursaDB(ptId, bursa[ptId]);
        }
    }

    if (action === 'buat' || action === 'create') {
        if (bursa[m.sender]) return m.reply(`❌ Kamu sudah punya PT! Ketik *${usedPrefix}saham pt*`);
        if (args.length < 3) return m.reply(`❓ Format: *${usedPrefix}saham buat <KODE> <Nama PT>*`);

        const ticker = args[1].toUpperCase();
        const ptName = args.slice(2).join(' ').trim();
        
        if (ticker.length < 3 || ticker.length > 5) return m.reply(`❌ Kode saham harus 3-5 huruf.`);
        if (cariPT(bursa, ticker)) return m.reply(`❌ Kode *${ticker}* sudah dipakai!`);
        if (cekNamaPT(bursa, ptName)) return m.reply(`❌ Nama PT sudah terdaftar!`);
        if (userMoney < BIAYA_IPO) return m.reply(`💰 Modal tidak cukup! Butuh *${formatMoney(BIAYA_IPO)}*`);

        const sahamPublik = Math.floor(TOTAL_SAHAM_IPO * PORSI_PUBLIK);
        const sahamOwner = TOTAL_SAHAM_IPO - sahamPublik;

        userPorto[m.sender] = sahamOwner; 

        await db.bursa.create({
            data: {
                ownerJid: m.sender,
                ticker,
                name: ptName,
                price: HARGA_AWAL,
                sharesAvailable: BigInt(sahamPublik),
                totalShares: BigInt(TOTAL_SAHAM_IPO),
                funds: BIAYA_IPO
            }
        });

        await updateUser(m.sender, { money: userMoney - BIAYA_IPO, portofolio: JSON.stringify(userPorto) });

        return m.reply(`🎉 *IPO BERHASIL!*\n*${ptName} [${ticker}]* resmi melantai di Bursa.`);
    }

    else if (action === 'pt') {
        const myPT = bursa[m.sender];
        if (!myPT) return m.reply(`❌ Kamu belum memiliki perusahaan.`);

        const subAction = args[1] ? args[1].toLowerCase() : '';

        if (subAction === 'tarik') {
            const amount = parseInt(args[2]);
            if (isNaN(amount) || amount < 1) return m.reply(`❓ Contoh: *${usedPrefix}saham pt tarik 50000*`);
            if (myPT.funds < amount) return m.reply(`❌ Kas PT tidak cukup!`);

            const minKas = BIAYA_IPO * 0.1; 
            if ((myPT.funds - amount) < minKas) return m.reply(`❌ OJK Menolak!\nSisa kas minimal adalah *${formatMoney(minKas)}*`);

            myPT.funds -= amount;
            await updateUser(m.sender, { money: userMoney + amount });
            await updateBursaDB(m.sender, myPT);
            return m.reply(`✅ Menarik *${formatLargeNumber(amount)}* dari kas PT ke dompetmu!`);
        }
        else if (subAction === 'setor') {
            const amount = parseInt(args[2]);
            if (isNaN(amount) || amount < 1) return m.reply(`❓ Contoh: *${usedPrefix}saham pt setor 50000*`);
            if (userMoney < amount) return m.reply(`❌ Uang pribadimu tidak cukup!`);

            myPT.funds += amount;
            await updateUser(m.sender, { money: userMoney - amount });
            await updateBursaDB(m.sender, myPT);
            return m.reply(`✅ Menyetor *${formatLargeNumber(amount)}* ke kas PT!`);
        }
        else if (subAction === 'terbit') {
            const amount = parseInt(args[2]);
            if (isNaN(amount) || amount < 1) return m.reply(`❓ Contoh: *${usedPrefix}saham pt terbit 10000*`);
            
            const oldTotalShares = myPT.totalShares;
            const oldPrice = myPT.price;

            const newTotalShares = oldTotalShares + amount;
            myPT.price = Math.max(50, Math.floor((oldTotalShares / newTotalShares) * oldPrice));
            myPT.totalShares += amount;
            myPT.sharesAvailable += amount;

            await updateBursaDB(m.sender, myPT);
            return m.reply(`📄 *RIGHT ISSUE BERHASIL*\nBerhasil mencetak saham baru.\n⚠️ *DILUSI:* Harga sahammu turun jadi *${formatMoney(myPT.price)}*/lbr!`);
        }

        let mcap = myPT.price * myPT.totalShares;
        let ptInfo = `🏢 *DASHBOARD PERUSAHAAN [${myPT.ticker}]*\n────────────────────\n📝 Nama PT : *${myPT.name}*\n🏷️ Harga Pasar : *${formatMoney(myPT.price)}* / lbr\n💼 Market Cap : *${formatLargeNumber(mcap)}*\n📊 Beredar di Publik : *${myPT.sharesAvailable.toLocaleString()}* lbr\n💰 Kas Internal PT : *${formatMoney(myPT.funds)}*\n\n*Panel Direksi:*\n• *${usedPrefix}saham pt setor/tarik <jumlah>*\n• *${usedPrefix}saham pt terbit <jumlah>*`;
        return m.reply(ptInfo.trim());
    }

    else if (action === 'beli') {
        const ticker = (args[1] || '').toUpperCase();
        const amount = parseInt(args[2]);
        if (!ticker || isNaN(amount) || amount < 1) return m.reply(`❓ Format: *${usedPrefix}saham beli <KODE> <Jumlah>*`);

        const ptTarget = cariPT(bursa, ticker);
        if (!ptTarget) return m.reply(`❌ Kode saham tidak ditemukan.`);
        if (ptTarget.ownerId === m.sender) return m.reply(`❌ Tidak bisa membeli saham perusahaan sendiri di pasar sekunder!`);

        const ptData = ptTarget.data;
        if (ptData.sharesAvailable < amount) return m.reply(`📉 Suplai tidak cukup!`);

        let newPrice = Math.floor(ptData.price * Math.min(ARA_LIMIT, 1 + (VOLATILITAS * (amount / 1000))));
        let avgExecutionPrice = Math.floor((ptData.price + newPrice) / 2); 

        const subtotal = avgExecutionPrice * amount;
        const fee = Math.floor(subtotal * FEE_BROKER);
        const totalCost = subtotal + fee; 

        if (userMoney < totalCost) return m.reply(`💰 Uang kurang! Butuh *${formatMoney(totalCost)}*`);

        userPorto[ptTarget.ownerId] = (userPorto[ptTarget.ownerId] || 0) + amount;
        ptData.sharesAvailable -= amount;
        ptData.price = newPrice;

        await updateUser(m.sender, { money: userMoney - totalCost, portofolio: JSON.stringify(userPorto) });
        await updateBursaDB(ptTarget.ownerId, ptData);

        return m.reply(`✅ *BUY MATCHED*\nMembeli *${amount.toLocaleString()} lbr [${ticker}]*.\nTotal Bayar: *${formatMoney(totalCost)}*`);
    }

    else if (action === 'jual') {
        const ticker = (args[1] || '').toUpperCase();
        let amount = (args[2] || '').toLowerCase() === 'all' ? 'all' : parseInt(args[2]);
        
        const ptTarget = cariPT(bursa, ticker);
        if (!ptTarget) return m.reply(`❌ Kode saham tidak ditemukan.`);

        const ownedShares = userPorto[ptTarget.ownerId] || 0;
        if (amount === 'all') amount = ownedShares;
        if (isNaN(amount) || amount < 1 || ownedShares < amount) return m.reply(`📦 Saham tidak cukup.`);

        const ptData = ptTarget.data;
        let newPrice = Math.max(50, Math.floor(ptData.price * Math.max(ARB_LIMIT, 1 - (VOLATILITAS * (amount / 1000))))); 
        let avgExecutionPrice = Math.floor((ptData.price + newPrice) / 2); 

        const subtotal = avgExecutionPrice * amount;
        const fee = Math.floor(subtotal * FEE_BROKER);
        const totalRevenue = subtotal - fee; 

        userPorto[ptTarget.ownerId] -= amount;
        if (userPorto[ptTarget.ownerId] <= 0) delete userPorto[ptTarget.ownerId];
        
        ptData.sharesAvailable += amount; 
        ptData.price = newPrice;

        await updateUser(m.sender, { money: userMoney + totalRevenue, portofolio: JSON.stringify(userPorto) });
        await updateBursaDB(ptTarget.ownerId, ptData);

        return m.reply(`✅ *SELL MATCHED*\nMenjual *${amount.toLocaleString()} lbr [${ticker}]*.\nBersih didapat: *${formatMoney(totalRevenue)}*`);
    }

    else if (action === 'list') {
        let daftarBursa = Object.values(bursa).sort((a, b) => (b.price * b.totalShares) - (a.price * a.totalShares));
        let display = `📈 *PAPAN UTAMA BURSA EFEK* 📉\n────────────────────\n\n`;
        daftarBursa.forEach((pt, index) => {
            let rank = index === 0 ? '👑' : '🏢';
            display += `${rank} *[${pt.ticker}] ${pt.name}*\n🏷️ Harga: ${formatMoney(pt.price)}/lbr\n💼 Market Cap: ${formatLargeNumber(pt.price * pt.totalShares)}\n\n`;
        });
        return m.reply(display.trim() || 'Kosong.');
    }

    else if (action === 'porto' || action === 'portofolio') {
        let display = `📊 *PORTOFOLIO SAHAM KAMU* 📊\n────────────────────\n\n`;
        let totalValue = 0;
        for (const ptId in userPorto) {
            if (bursa[ptId]) {
                const pt = bursa[ptId];
                const amount = userPorto[ptId];
                const netValue = (amount * pt.price) - Math.floor((amount * pt.price) * FEE_BROKER);
                totalValue += netValue;
                display += `🏢 *[${pt.ticker}]* : ${amount.toLocaleString()} lbr\n💰 Estimasi: ${formatMoney(netValue)}\n\n`;
            }
        }
        display += `────────────────────\n📈 *Total Kekayaan: ${formatMoney(totalValue)}*`;
        return m.reply(display.trim());
    } else {
        return m.reply(`*Saham Exchange*\n- ${usedPrefix+command} buat\n- ${usedPrefix+command} beli\n- ${usedPrefix+command} jual\n- ${usedPrefix+command} pt\n- ${usedPrefix+command} list\n- ${usedPrefix+command} porto`);
    }
};

handler.help = ['saham'];
handler.tags = ['rpg'];
handler.command = /^(saham)$/i;
module.exports = handler;
