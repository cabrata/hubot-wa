// Pastikan path database kamu bener ya
const { db, getUser, updateUser } = require('../../lib/database'); 

// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

// ==========================================
// DAFTAR TOKO (Taruh di LUAR handler biar sistem super ringan!)
// ==========================================
const shop = {
    // Kategori: Receh / Makanan Ringan
    'permen': { harga: 50000, nama: 'Permen Karet 🍬', pts: 1, reaksi: "Yeayy permen! Makasih yaa 🍬" },
    'eskrim': { harga: 150000, nama: 'Es Krim Mixue 🍦', pts: 2, reaksi: "Dingin-dingin manis, makasih ya! 😋" },
    'boba': { harga: 300000, nama: 'Chatime Boba 🧋', pts: 3, reaksi: "Wah kebetulan lagi haus! Makasih ayanggg! 🥰" },
    'cokelat': { harga: 500000, nama: 'Cokelat Mahal 🍫', pts: 5, reaksi: "Wahh cokelat! Makasih ya maniskuuu 🥰" },
    'martabak': { harga: 1000000, nama: 'Martabak Spesial 🥞', pts: 10, reaksi: "Bikin gendut sih, tapi yaudah deh makasih sayang! 🤤" },
    'sushi': { harga: 3500000, nama: 'Paket Sushi Premium 🍣', pts: 15, reaksi: "Aaaaa sushi! Enak bangettt! I love you! 🍣💖" },
    'wagyu': { harga: 15000000, nama: 'Steak Wagyu A5 🥩', pts: 20, reaksi: "Dagingnya lumer di mulut... Makasih ya udah manjain perutku! 😍" },

    // Kategori: Barang Lucu / Romantis
    'boneka': { harga: 2000000, nama: 'Boneka Beruang Besar 🧸', pts: 20, reaksi: "Bonekanya empuk banget! Bakal aku peluk tiap tidur 🧸❤️" },
    'bunga': { harga: 2500000, nama: 'Buket Bunga Mawar 💐', pts: 25, reaksi: "Aww romantis banget sih kamu... bunganya wangi! 🥺💖" },
    'tiket': { harga: 25000000, nama: 'Tiket Konser VIP 🎫', pts: 40, reaksi: "HAH SERIUS KITA NONTON INI VIP?! AAAAA MAKASIHH SAYANG!! 😭🎉" },

    // Kategori: Fashion & Beauty
    'skincare': { harga: 8000000, nama: 'Paket Skincare ✨', pts: 30, reaksi: "Tau aja skincare aku abis! Makin glowing deh aku nanti! 😍" },
    'sepatu': { harga: 35000000, nama: 'Sepatu Sneakers Ori 👟', pts: 50, reaksi: "Sepatunya keren banget! Pas banget di kakiku, makasih cintaku! 👟🔥" },
    'lingerie': { harga: 50000000, nama: 'Lingerie Baju Haram 👙', pts: 100, reaksi: "Ihh nakal banget beliin ginian! 😳 Nanti malem aku pakai ya... sssst! 🤫" },
    'tas': { harga: 500000000, nama: 'Tas Gucci / Dior 👜', pts: 150, reaksi: "AAAAA SUMPAH?! TAS BRANDED?! MAKASIH SAYANG!! MAKIN CINTA DEHH 😭😭❤️" },
    'perhiasan': { harga: 2500000000, nama: 'Kalung Berlian 💎', pts: 300, reaksi: "Astaga... ini berlian asli? Cantik banget... I love you so much! 🥺💍" },

    // Kategori: Elektronik
    'tws': { harga: 10000000, nama: 'Airpods / TWS 🎧', pts: 100, reaksi: "Makasih earphone-nya! Suaranya jernih banget 🎶" },
    'ps5': { harga: 85000000, nama: 'PlayStation 5 Pro 🎮', pts: 350, reaksi: "Wahh bisa mabar kita sekarang! Makasih sayangku! 🎮🔥" },
    'iphone': { harga: 250000000, nama: 'iPhone 15 Pro Max 📱', pts: 250, reaksi: "HAH IPHONE 15?! Beneran buat aku?! Makasih banyak sayang!! 😭❤️" },
    'pc': { harga: 750000000, nama: 'PC Gaming Rata Kanan 💻', pts: 500, reaksi: "Spek dewa gilaaa!! Sayang kamu tuh the best banget!! 💻✨" },

    // Kategori: Kendaraan & Properti (Untuk Late Game)
    'nmax': { harga: 350000000, nama: 'Motor NMAX Baru 🛵', pts: 350, reaksi: "Yey motor baru! Nanti kita sunmori bareng ya beb! 🛵💨" },
    'brio': { harga: 2000000000, nama: 'Mobil Honda Brio 🚗', pts: 400, reaksi: "Mobil pertamaku?! Makasih banyak sayang, besok aku yang nyetir deh! 🚗❤️" },
    'sportcar': { harga: 50000000000, nama: 'Mobil Sport Ferrari 🏎️', pts: 500, reaksi: "YA ALLAH SAYANG?! KAMU BELIIN AKU FERRARI?! HAAAA MAKASIH SULTANKU!! 😭😭🏎️💨" },
    'villa': { harga: 150000000000, nama: 'Villa Mewah di Bali 🏖️', pts: 600, reaksi: "KITA PUNYA VILLA SENDIRI SEKARANG?! GILA KAMU TUH! SINI CIUM DULU!! 😭💋🏖️" },
    'privatejet': { harga: 1000000000000, nama: 'Private Jet 🛩️', pts: 1000, reaksi: "UDAH GILA YA?! PUNYA JET PRIBADI?! AMPUN SULTAN MAHABENAR, AKU PADAMU SELAMANYA!! 🧎‍♀️✈️💖" },
    'pulau': { harga: 5000000000000, nama: 'Pulau Pribadi 🏝️', pts: 5000, reaksi: "KITA JADI RAJA SAMA RATU DI PULAU SENDIRI?! KAMU BENERAN TUHANNYA UANG YA?! 😭😭😭🏝️👑" }
};

// ==========================================
// HANDLER UTAMA
// ==========================================
let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Tarik data langsung dari SQL biar fresh
    let user = await getUser(m.sender);
    if (!user) return m.reply("User tidak ditemukan di database.");

    // Parse Data JSON
    let pasData = parseJSON(user.pasanganChar);
    let userGift = parseJSON(user.gift) || {};
    let uangUser = user.money || 0;

    switch (command) {
        // =====================================
        // COMMAND: BELI GIFT
        // =====================================
        case 'beligift': {
            if (!args[0]) {
                let list = `🎁 *TOKO HADIAH PASANGAN* 🎁\n\n`;
                for (let i in shop) {
                    list += `*${i}* - ${shop[i].nama}\n`;
                    list += `  💰 Harga: Rp${shop[i].harga.toLocaleString('id-ID')}\n`;
                    list += `  ❤️ +${shop[i].pts.toLocaleString('id-ID')} Love Pts\n\n`;
                }
                list += `*Cara Beli:* ${usedPrefix}beligift <item> <jumlah>\n*Contoh:* ${usedPrefix}beligift iphone 2\n\n`;
                list += `💵 Uangmu: Rp${uangUser.toLocaleString('id-ID')}`;
                return m.reply(list);
            }

            let item = args[0].toLowerCase();
            let jumlah = parseInt(args[1]) || 1;

            if (!shop[item]) return m.reply(`❌ Barang *${item}* tidak ada di toko!\nKetik *${usedPrefix}beligift* untuk melihat daftar barang.`);
            if (jumlah < 1) return m.reply("❌ Jumlah tidak valid!");

            let totalHarga = shop[item].harga * jumlah;
            if (uangUser < totalHarga) {
                return m.reply(`💸 Uangmu tidak cukup!\nHarga ${jumlah}x ${shop[item].nama}: Rp${totalHarga.toLocaleString('id-ID')}\nUangmu: Rp${uangUser.toLocaleString('id-ID')}`);
            }

            // Eksekusi Beli: Masukin ke Tas (Local Variable)
            userGift[item] = (userGift[item] || 0) + jumlah;

            // Wajib Hit Database pakai updateUser untuk Simpan
            await updateUser(m.sender, {
                money: uangUser - totalHarga,
                gift: JSON.stringify(userGift)
            });

            m.reply(`🛒 Berhasil membeli *${jumlah}x ${shop[item].nama}*\n💸 Total Biaya: Rp${totalHarga.toLocaleString('id-ID')}\n\n> Gunakan *${usedPrefix}kasihgift ${item}* untuk memberikan ke pasanganmu.`);
            break;
        }

        // =====================================
        // COMMAND: KASIH GIFT
        // =====================================
        case 'kasihgift': {
            if (!pasData) return m.reply(`Kamu belum punya pasangan 💔`);
            if (!args[0]) return m.reply(`Mau kasih barang apa?\nContoh: *${usedPrefix}kasihgift bunga*\n\nCek barangmu dengan *${usedPrefix}tasgift*`);

            let item = args[0].toLowerCase();
            let jumlah = parseInt(args[1]) || 1;

            if (!userGift[item] || userGift[item] < jumlah) {
                return m.reply(`❌ Kamu tidak punya *${jumlah}x ${item}* di tasmu!\nBeli dulu pakai *${usedPrefix}beligift*`);
            }

            // Kurangi item dari inventory
            userGift[item] -= jumlah;
            if (userGift[item] <= 0) delete userGift[item];

            // Tambah poin pasangan
            let totalPts = shop[item].pts * jumlah;
            pasData.point = (pasData.point || 0) + totalPts;

            // Wajib Hit Database pakai updateUser untuk Simpan Barang Berkurang dan Poin Nambah
            await updateUser(m.sender, {
                gift: JSON.stringify(userGift),
                pasanganChar: JSON.stringify(pasData)
            });

            let teks = `🎁 *MEMBERIKAN HADIAH* 🎁\n\n`;
            teks += `Kamu memberikan *${jumlah}x ${shop[item].nama}* kepada *${pasData.name}*.\n\n`;
            teks += `💬 *${pasData.name}:*\n"${shop[item].reaksi}"\n\n`;
            teks += `❤️ Love Pts Bertambah: +${totalPts.toLocaleString('id-ID')}\n`;
            teks += `Total Love Pts: ${pasData.point.toLocaleString('id-ID')} Pts`;

            m.reply(teks);
            break;
        }

        // =====================================
        // COMMAND: CEK TAS GIFT
        // =====================================
        case 'tasgift': {
            let keys = Object.keys(userGift);
            if (keys.length === 0) return m.reply(`👜 Tas hadiahmu kosong!\nKetik *${usedPrefix}beligift* untuk belanja.`);

            let teks = `👜 *ISI TAS HADIAHMU* 👜\n\n`;
            for (let i of keys) {
                teks += `• ${shop[i].nama} : *${userGift[i]}* buah\n`;
            }
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
