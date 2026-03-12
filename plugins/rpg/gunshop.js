//rpg-gunshop
const { getUser, updateEconomy, updateJob, addInventory } = require('../../lib/database')
const cooldown = 30000;

const items = {
    buygun: {
        tombak: { money: 50000000 },
        busur: { money: 10000000 },
        anakpanah: { money: 8000000 },
        glock: { dana: 3000000 },
        ammo: { gopay: 3500000 },
        ak47: { dana: 6400000 },
        m4: { dana: 3400000 },
        m16: { dana: 8400000 },
        ar15: { ovo: 7700000 },
        scar: { gopay: 9000000 },
        famas: { ovo: 9000000 },
        aug: { dana: 9400000 },
        uzi: { dana: 5500000 },
        mp5: { ovo: 5000000 },
        p90: { money: 6400000 },
        mac10: { money: 4000000 },
        vector: { gopay: 4200000 },
        barrettm82: { money: 19900000 },
        remington700: { ovo: 2000000 },
        dragunovsvd: { dana: 88000000 },
        m40: { ovo: 40000000 },
        m24: { ovo: 40000000 }
    },
    sellgun: {
        tombak: { money: 2500000 },
        busur: { money: 500000 },
        anakpanah: { money: 400000 },
        glock: { money: 1500000 },
        ammo: { money: 1750000 },
        ak47: { money: 3200000 },
        m4: { money: 170000 },
        m16: { money: 420000 },
        ar15: { money: 385000 },
        scar: { money: 450000 },
        famas: { money: 450000 },
        aug: { money: 470000 },
        uzi: { money: 275000 },
        mp5: { money: 250000 },
        p90: { money: 320000 },
        mac10: { money: 200000 },
        vector: { money: 210000 },
        barrettm82: { money: 9950000 },
        remington700: { money: 100000 },
        dragunovsvd: { money: 4400000 },
        m40: { money: 200000 },
        m24: { money: 200000 }
    }
};

const handler = async (m, { conn, command, usedPrefix, args, isPrems }) => {
    let user = await getUser(m.sender)
    if (!user) return

    if (user.jail === true) {
        throw '*Kamu tidak bisa melakukan aktivitas karena masih dalam penjara!*';
    }

    let pekerjaan3 = Number(user.pekerjaan3 || 0) // Mapping pekerjaantiga to pekerjaan3
    if (Date.now() - pekerjaan3 < cooldown) {
        const remainingTime = new Date(pekerjaan3 + cooldown) - new Date();
        const formattedTime = new Date(remainingTime).toISOString().substr(11, 8);
        throw `Kamu baru saja pergi ke toko! Tunggu selama *${formattedTime}*`;
    }

    if (command.toLowerCase() == 'gunshop') {
        let text = `*🏪 Gun Shop*\n\nIngin menggunakan *Toko Senjata*?\nKetik _.buygun_ bila ingin membeli senjata!\nKetik _.sellgun_ bila ingin menjual senjata!`.trim();
        return conn.reply(m.chat, text, m);
    }

    const info = `
*Contoh penggunaan:* ${usedPrefix}${command} ak47 1
    
*Daftar Senjata:* ${Object.keys(items[command.toLowerCase()]).map((v) => {
        let paymentMethod = Object.keys(items[command.toLowerCase()][v])[0];
        return `${emojis(v)}${capitalizeFirstLetter(v)} | ${toSimple(items[command.toLowerCase()][v][paymentMethod])} ${emojis(paymentMethod)}${capitalizeFirstLetter(paymentMethod)}`.trim();
    }).join('\n')}
`.trim();

    const item = (args[0] || '').toLowerCase();
    if (!items[command.toLowerCase()][item]) return m.reply(info);
    if (!args[1]) return m.reply(info);

    let total = Math.floor(isNumber(args[1]) ? Math.min(Math.max(parseInt(args[1]), 1)) : 1) * ({"K": 1e3, "M": 1e6, "B": 1e9, "T": 1e12}[args[1].toUpperCase().replace(/[^KMBT]/g, '')] || 1);

    if (command.toLowerCase() == 'buygun') {
        // Fix Bug Random: Dapatkan metode pembayaran asli dari object
        const paymentMethod = Object.keys(items['buygun'][item])[0];
        let price = items['buygun'][item][paymentMethod] * total;

        if ((user[paymentMethod] || 0) < price) {
            return m.reply(`Kamu tidak memiliki cukup ${emojis(paymentMethod)}${paymentMethod} untuk membeli *${toSimple(total)}* ${emojis(item)}${capitalizeFirstLetter(item)}.\nKamu memerlukan *${toSimple(price - (user[paymentMethod] || 0))}* ${paymentMethod} lagi.`);
        }

        await updateEconomy(m.sender, { [paymentMethod]: user[paymentMethod] - price });
        await addInventory(m.sender, item, total);
        await updateJob(m.sender, { pekerjaan3: Date.now() });

        return m.reply(`Kamu telah membeli *${toSimple(total)}* ${emojis(item)}${capitalizeFirstLetter(item)} menggunakan ${emojis(paymentMethod)}${paymentMethod}`);
        
    } else if (command.toLowerCase() == 'sellgun') {
        let userItemCount = user[item] || 0;
        if (isPrems && /all/i.test(args[1])) total = userItemCount;
        
        if (userItemCount < total) {
            return m.reply(`Kamu tidak memiliki cukup *${emojis(item)}${capitalizeFirstLetter(item)}* untuk dijual. Anda hanya memiliki ${toSimple(userItemCount)} item`);
        }

        const rewardKey = Object.keys(items['sellgun'][item])[0];
        let profit = items['sellgun'][item][rewardKey] * total;

        await addInventory(m.sender, item, -total);
        await updateEconomy(m.sender, { [rewardKey]: (user[rewardKey] || 0) + profit });
        await updateJob(m.sender, { pekerjaan3: Date.now() });

        return m.reply(`Kamu telah menjual *${toSimple(total)}* ${emojis(item)}${capitalizeFirstLetter(item)} dan mendapatkan *${toSimple(profit)}* ${emojis(rewardKey)}`);
    }
};

handler.help = ['gunshop'].map(v => v + '');
handler.tags = ['rpg'];
handler.command = /^(gunshop|buygun|sellgun)$/i;
handler.regsitered = true

module.exports = handler;

// Helpers dipertahankan dari ori
function isNumber(number) { return !isNaN(parseInt(number)); }
function toSimple(number) {
    if (isNaN(parseFloat(number))) return number;
    if (parseFloat(number) === 0) return '0';
    number = parseFloat(number).toFixed(0);
    const suffixes = ['', 'K', 'JT', 'M', 'T'];
    const base = 1000;
    const exponent = Math.floor(Math.log10(Math.abs(number)) / 3);
    const suffix = suffixes[exponent] || '';
    const simplified = number / Math.pow(base, exponent);
    return Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(simplified) + suffix;
}
function emojis(item) {
    switch (item.toLowerCase()) {
        case 'tombak': return '🪓'; case 'busur': return '🏹'; case 'anakpanah': return '🏹';
        case 'money': return '💵'; case 'dana': return '💰'; case 'gopay': return '💳'; case 'ovo': return '📱';
        default: return '🔫';
    }
}
function capitalizeFirstLetter(str) { return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); }