const { db, getUser, updateUser } = require('../../lib/database'); 

function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

const shop = {
    'permen': { harga: 50000, nama: 'Permen Karet 🍬', pts: 50, reaksi: "Yeayy permen! Makasih yaa 🍬" },
    'eskrim': { harga: 150000, nama: 'Es Krim Mixue 🍦', pts: 100, reaksi: "Dingin-dingin manis, makasih ya! 😋" },
    'boba': { harga: 300000, nama: 'Chatime Boba 🧋', pts: 250, reaksi: "Wah kebetulan lagi haus! Makasih ayanggg! 🥰" },
    'cokelat': { harga: 500000, nama: 'Cokelat Mahal 🍫', pts: 400, reaksi: "Wahh cokelat! Makasih ya maniskuuu 🥰" },
    'martabak': { harga: 1000000, nama: 'Martabak Spesial 🥞', pts: 800, reaksi: "Bikin gendut sih, tapi yaudah deh makasih sayang! 🤤" },
    'sushi': { harga: 3500000, nama: 'Paket Sushi Premium 🍣', pts: 2000, reaksi: "Aaaaa sushi! Enak bangettt! I love you! 🍣💖" },
    'wagyu': { harga: 15000000, nama: 'Steak Wagyu A5 🥩', pts: 5000, reaksi: "Dagingnya lumer di mulut... Makasih ya udah manjain perutku! 😍" },
    'boneka': { harga: 2000000, nama: 'Boneka Beruang Besar 🧸', pts: 1500, reaksi: "Bonekanya empuk banget! Bakal aku peluk tiap tidur 🧸❤️" },
    'bunga': { harga: 2500000, nama: 'Buket Bunga Mawar 💐', pts: 2000, reaksi: "Aww romantis banget sih kamu... bunganya wangi! 🥺💖" },
    'tiket': { harga: 25000000, nama: 'Tiket Konser VIP 🎫', pts: 8000, reaksi: "HAH SERIUS KITA NONTON INI VIP?! AAAAA MAKASIHH SAYANG!! 😭🎉" },
    'skincare': { harga: 8000000, nama: 'Paket Skincare ✨', pts: 3000, reaksi: "Tau aja skincare aku abis! Makin glowing deh aku nanti! 😍" },
    'sepatu': { harga: 35000000, nama: 'Sepatu Sneakers Ori 👟', pts: 10000, reaksi: "Sepatunya keren banget! Pas banget di kakiku, makasih cintaku! 👟🔥" },
    'lingerie': { harga: 50000000, nama: 'Lingerie Baju Haram 👙', pts: 25000, reaksi: "Ihh nakal banget beliin ginian! 😳 Nanti malem aku pakai ya... sssst! 🤫" },
    'tas': { harga: 500000000, nama: 'Tas Gucci / Dior 👜', pts: 50000, reaksi: "AAAAA SUMPAH?! TAS BRANDED?! MAKASIH SAYANG!! MAKIN CINTA DEHH 😭😭❤️" },
    'perhiasan': { harga: 2500000000, nama: 'Kalung Berlian 💎', pts: 150000, reaksi: "Astaga... ini berlian asli? Cantik banget... I love you so much! 🥺💍" },
    'tws': { harga: 10000000, nama: 'Airpods / TWS 🎧', pts: 4000, reaksi: "Makasih earphone-nya! Suaranya jernih banget 🎶" },
    'ps5': { harga: 85000000, nama: 'PlayStation 5 Pro 🎮', pts: 20000, reaksi: "Wahh bisa mabar kita sekarang! Makasih sayangku! 🎮🔥" },
    'iphone': { harga: 250000000, nama: 'iPhone 15 Pro Max 📱', pts: 40000, reaksi: "HAH IPHONE 15?! Beneran buat aku?! Makasih banyak sayang!! 😭❤️" },
    'pc': { harga: 750000000, nama: 'PC Gaming Rata Kanan 💻', pts: 80000, reaksi: "Spek dewa gilaaa!! Sayang kamu tuh the best banget!! 💻✨" },
    'nmax': { harga: 350000000, nama: 'Motor NMAX Baru 🛵', pts: 50000, reaksi: "Yey motor baru! Nanti kita sunmori bareng ya beb! 🛵💨" },
    'brio': { harga: 2000000000, nama: 'Mobil Honda Brio 🚗', pts: 100000, reaksi: "Mobil pertamaku?! Makasih banyak sayang, besok aku yang nyetir deh! 🚗❤️" },
    'sportcar': { harga: 50000000000, nama: 'Mobil Sport Ferrari 🏎️', pts: 300000, reaksi: "YA ALLAH SAYANG?! KAMU BELIIN AKU FERRARI?! HAAAA MAKASIH SULTANKU!! 😭😭🏎️💨" },
    'villa': { harga: 150000000000, nama: 'Villa Mewah di Bali 🏖️', pts: 800000, reaksi: "KITA PUNYA VILLA SENDIRI SEKARANG?! GILA KAMU TUH! SINI CIUM DULU!! 😭💋🏖️" },
    'privatejet': { harga: 1000000000000, nama: 'Private Jet 🛩️', pts: 2000000, reaksi: "UDAH GILA YA?! PUNYA JET PRIBADI?! AMPUN SULTAN MAHABENAR, AKU PADAMU SELAMANYA!! 🧎‍♀️✈️💖" },
    'pulau': { harga: 5000000000000, nama: 'Pulau Pribadi 🏝️', pts: 10000000, reaksi: "KITA JADI RAJA SAMA RATU DI PULAU SENDIRI?! KAMU BENERAN TUHANNYA UANG YA?! 😭😭😭🏝️👑" }
};

const LIMIT_PER_BARANG = 5; // LIMIT MAKSIMAL BARANG DI TAS

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    if (!user) return m.reply("User tidak ditemukan di database.");

    let pasData = parseJSON(user.pasanganChar);
    let userGift = parseJSON(user.gift) || {};
    let uangUser = user.money || 0;

    switch (command) {
        case 'beligift': {
            if (!args[0]) {
                let list = `🎁 *TOKO HADIAH PASANGAN* 🎁\n\n`;
                for (let i in shop) {
                    list += `*${i}* - ${shop[i].nama}\n`;
                    list += `  💰 Harga: Rp${shop[i].harga.toLocaleString('id-ID')}\n`;
                    list += `  ❤️ +${shop[i].pts.toLocaleString('id-ID')} Love Pts\n\n`;
                }
                list += `*Cara Beli:* ${usedPrefix}beligift <item> <jumlah>\n*Contoh:* ${usedPrefix}beligift iphone 2\n_(Maksimal nyimpen ${LIMIT_PER_BARANG} item per jenis)_\n\n`;
                list += `💵 Uangmu: Rp${uangUser.toLocaleString('id-ID')}`;
                return m.reply(list);
            }

            let item = args[0].toLowerCase();
            let jumlah = parseInt(args[1]) || 1;

            if (!shop[item]) return m.reply(`❌ Barang *${item}* tidak ada di toko!`);
            if (jumlah < 1) return m.reply("❌ Jumlah tidak valid!");

            // CEK LIMIT TAS BIAR GA MARUK
            let barangSekarang = userGift[item] || 0;
            if (barangSekarang + jumlah > LIMIT_PER_BARANG) {
                return m.reply(`🎒 Tas kamu ga muat boss! Kamu cuma boleh nyimpen maksimal *${LIMIT_PER_BARANG}* ${shop[item].nama} di dalam tas.\nSaat ini kamu punya: ${barangSekarang}.\n\nKasihin dulu ke ayang pakai *.kasihgift* baru beli lagi!`);
            }

            let totalHarga = shop[item].harga * jumlah;
            if (uangUser < totalHarga) {
                return m.reply(`💸 Uangmu tidak cukup!\nHarga ${jumlah}x ${shop[item].nama}: Rp${totalHarga.toLocaleString('id-ID')}\nUangmu: Rp${uangUser.toLocaleString('id-ID')}`);
            }

            userGift[item] = barangSekarang + jumlah;
            await updateUser(m.sender, { money: uangUser - totalHarga, gift: JSON.stringify(userGift) });

            m.reply(`🛒 Berhasil membeli *${jumlah}x ${shop[item].nama}*\n💸 Total Biaya: Rp${totalHarga.toLocaleString('id-ID')}\n\n> Gunakan *${usedPrefix}kasihgift ${item}* untuk memberikan ke pasanganmu.`);
            break;
        }

        case 'kasihgift': {
            if (!pasData) return m.reply(`Kamu belum punya pasangan 💔`);
            if (!args[0]) return m.reply(`Mau kasih barang apa?\nContoh: *${usedPrefix}kasihgift bunga*\n\nCek barangmu dengan *${usedPrefix}tasgift*`);

            let item = args[0].toLowerCase();
            let jumlah = parseInt(args[1]) || 1;

            if (!userGift[item] || userGift[item] < jumlah) {
                return m.reply(`❌ Kamu tidak punya *${jumlah}x ${item}* di tasmu!\nBeli dulu pakai *${usedPrefix}beligift*`);
            }

            userGift[item] -= jumlah;
            if (userGift[item] <= 0) delete userGift[item];

            let totalPts = shop[item].pts * jumlah;
            pasData.point = (pasData.point || 0) + totalPts;

            await updateUser(m.sender, { gift: JSON.stringify(userGift), pasanganChar: JSON.stringify(pasData) });

            let teks = `🎁 *MEMBERIKAN HADIAH* 🎁\n\nKamu memberikan *${jumlah}x ${shop[item].nama}* kepada *${pasData.name}*.\n\n💬 *${pasData.name}:*\n"${shop[item].reaksi}"\n\n❤️ Love Pts Bertambah: +${totalPts.toLocaleString('id-ID')}\nTotal Love Pts: ${pasData.point.toLocaleString('id-ID')} Pts`;
            m.reply(teks);
            break;
        }

        case 'tasgift': {
            let keys = Object.keys(userGift);
            if (keys.length === 0) return m.reply(`👜 Tas hadiahmu kosong!\nKetik *${usedPrefix}beligift* untuk belanja.`);
            let teks = `👜 *ISI TAS HADIAHMU* 👜\n\n`;
            for (let i of keys) { teks += `• ${shop[i].nama} : *${userGift[i]}* buah (Max ${LIMIT_PER_BARANG})\n`; }
            teks += `\n> Gunakan *${usedPrefix}kasihgift <item>* untuk ngasih ke ayang.`;
            m.reply(teks);
            break;
        }
    }
};

handler.help = ['beligift', 'kasihgift', 'tasgift'];
handler.tags = ['fun', 'rpg'];
handler.command = ['beligift', 'kasihgift', 'tasgift'];

module.exports = handler;