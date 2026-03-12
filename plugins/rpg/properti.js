const { db, getUser, updateUser } = require('../../lib/database'); // Sesuaikan path jika berbeda

// Data Katalog Properti (Patokan Harga & Lokasi Jabodetabek)
const katalog = {
    // 🏚️ TIER 1 - Kelas Rendah
    t1_petak: { kategori: 'tier1', nama: '🏚️ Rumah Petak Sederhana', tipe: 'dual', base: 45000000, baseMonthly: 800000, max: 5000, maintenance: 50000 },
    t1_kayu: { kategori: 'tier1', nama: '🪵 Pondok Kayu Pinggiran', tipe: 'beli', base: 35000000, max: 2000, maintenance: 40000 },
    t1_kontrakan: { kategori: 'tier1', nama: '🚪 Kontrakan Tiga Pintu', tipe: 'sewa', baseMonthly: 1200000, max: 3000, maintenance: 100000 },
    t1_bata: { kategori: 'tier1', nama: '🏠 Hunian Batu Bata', tipe: 'beli', base: 85000000, max: 1500, maintenance: 100000 },
    t1_seng: { kategori: 'tier1', nama: '🌧️ Rumah Atap Seng', tipe: 'dual', base: 25000000, baseMonthly: 500000, max: 4000, maintenance: 30000 },

    // 🏠 TIER 2 - Menengah Bawah
    t2_harmoni: { kategori: 'tier2', nama: '🌿 Graha Harmoni Kecil', tipe: 'beli', base: 250000000, max: 800, maintenance: 250000 },
    t2_cottage: { kategori: 'tier2', nama: '🌸 Cottage Taman Rindu', tipe: 'beli', base: 350000000, max: 600, maintenance: 300000 },
    t2_cendana: { kategori: 'tier2', nama: '🌳 Kediaman Cendana', tipe: 'beli', base: 450000000, max: 500, maintenance: 350000 },
    t2_bukit: { kategori: 'tier2', nama: '🌇 Rumah Bukit Senja', tipe: 'beli', base: 550000000, max: 400, maintenance: 450000 },
    t2_villa: { kategori: 'tier2', nama: '🍃 Villa Angin Timur', tipe: 'beli', base: 700000000, max: 300, maintenance: 500000 },

    // 🏡 TIER 3 - Menengah
    t3_lunaris: { kategori: 'tier3', nama: '🌙 Residensi Lunaris', tipe: 'beli', base: 1200000000, max: 200, maintenance: 1000000 },
    t3_emerald: { kategori: 'tier3', nama: '💎 Emerald Terrace', tipe: 'beli', base: 1500000000, max: 150, maintenance: 1200000 },
    t3_mahardika: { kategori: 'tier3', nama: '🏘️ Mahardika Estate', tipe: 'beli', base: 2000000000, max: 100, maintenance: 1500000 },
    t3_aetheria: { kategori: 'tier3', nama: '✨ Graha Aetheria', tipe: 'beli', base: 2500000000, max: 80, maintenance: 2000000 },
    t3_skyview: { kategori: 'tier3', nama: '🌤️ Skyview Manor', tipe: 'beli', base: 3500000000, max: 50, maintenance: 2500000 },

    // 🏰 TIER 4 - Elite
    t4_arcadia: { kategori: 'tier4', nama: '👑 Arcadia Palace', tipe: 'beli', base: 6000000000, max: 30, maintenance: 4000000 },
    t4_celestium: { kategori: 'tier4', nama: '💠 Celestium Crown Hall', tipe: 'beli', base: 8500000000, max: 25, maintenance: 5000000 },
    t4_nocturne: { kategori: 'tier4', nama: '🌌 Imperial Nocturne Vill', tipe: 'beli', base: 12000000000, max: 20, maintenance: 7000000 },
    t4_astral: { kategori: 'tier4', nama: '🔮 Astral Dominion Estate', tipe: 'beli', base: 18000000000, max: 15, maintenance: 10000000 },
    t4_valoria: { kategori: 'tier4', nama: '🛡️ Valoria Grand Citadel', tipe: 'beli', base: 25000000000, max: 10, maintenance: 15000000 },

    // 👑 TIER 5 - Legendaris
    t5_elysium: { kategori: 'tier5', nama: '🌠 Elysium Sovereign Sanctum', tipe: 'beli', base: 50000000000, max: 5, maintenance: 25000000 },
    t5_chronoverse: { kategori: 'tier5', nama: '🪐 Chronoverse Apex Palace', tipe: 'beli', base: 75000000000, max: 4, maintenance: 35000000 },
    t5_omnistar: { kategori: 'tier5', nama: '⭐ Omnistar Thronehall', tipe: 'beli', base: 120000000000, max: 3, maintenance: 50000000 },
    t5_empyrean: { kategori: 'tier5', nama: '🔱 Empyrean Infinity Keep', tipe: 'beli', base: 200000000000, max: 2, maintenance: 80000000 },
    t5_deus: { kategori: 'tier5', nama: '🌟 Deus Astra Imperium', tipe: 'beli', base: 500000000000, max: 1, maintenance: 150000000 },

    // 🏢 APARTEMEN JABODETABEK
    apt_mrg_std: { kategori: 'apartemen', nama: '🏢 Margonda Res. (Tower 3) - Studio', tipe: 'dual', base: 200000000, baseMonthly: 1500000, max: 1000, maintenance: 250000 },
    apt_mkt_std: { kategori: 'apartemen', nama: '🏢 Meikarta (Tower Yellow) - Studio', tipe: 'dual', base: 250000000, baseMonthly: 2000000, max: 800, maintenance: 300000 },
    apt_bks_1br: { kategori: 'apartemen', nama: '🏢 Summarecon Bekasi (Tower B) - 1BR', tipe: 'dual', base: 450000000, baseMonthly: 3500000, max: 400, maintenance: 500000 },
    apt_kbt_2br: { kategori: 'apartemen', nama: '🏢 Kalibata City (Tower Ebony) - 2BR', tipe: 'dual', base: 650000000, baseMonthly: 5000000, max: 300, maintenance: 700000 },
    apt_pkw_pnt: { kategori: 'apartemen', nama: '🏙️ Pakuwon Res. (Tower Bella) - Penthouse', tipe: 'dual', base: 12000000000, baseMonthly: 60000000, max: 15, maintenance: 8000000 }
};

// Fungsi menghitung harga dinamis
function getHargaDinamis(basePrice, terjual, maxStok) {
    let multiplier = 1 + (2 * (terjual / maxStok)); 
    return Math.floor(basePrice * multiplier);
}

// Konversi format uang
function formatRupiah(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

// Menghitung jumlah properti terjual REAL-TIME dari database SQL
async function getTerjualGlobal(id) {
    let count = 0;
    try {
        let allUsers = await db.user.findMany({ where: { registered: true } });
        for (let u of allUsers) {
            if (u.properti) {
                let p = parseJSON(u.properti);
                if (p && p.id === id) count++;
            }
        }
    } catch (e) {
        console.error("Gagal menarik data dari database SQL:", e);
    }
    return count;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Ambil data user dari SQL
    let user = await getUser(m.sender);
    if (!user) return m.reply("Data user kamu tidak ditemukan di database.");

    let userProp = parseJSON(user.properti);
    let uangUser = user.money || 0;

    // --- SISTEM PENGUSIRAN OTOMATIS ---
    if (userProp && userProp.status === 'Sewa') {
        if (Date.now() > userProp.sewaHabis) {
            await updateUser(m.sender, { properti: "" }); // Hapus dari SQL
            return m.reply(`🚨 *PENGUMUMAN PENGUSIRAN* 🚨\n\nMasa sewa properti kamu sudah habis!\nBarang-barangmu sudah dikeluarkan paksa. Sekarang kamu kembali menjadi gelandangan.`);
        }
    }

    switch (command) {
        case 'listproperti': {
            let kategoriMap = {
                'tier1': '🏚️ Kelas Rendah',
                'tier2': '🏠 Menengah Bawah',
                'tier3': '🏡 Menengah',
                'tier4': '🏰 Elite',
                'tier5': '👑 Legendaris',
                'apartemen': '🏢 Apartemen & Penthouse'
            };

            let pil = args[0] ? args[0].toLowerCase() : '';
            if (!kategoriMap[pil]) {
                let txt = `🏙️ *PASAR PROPERTI JABODETABEK* 🏙️\n_Gunakan format: ${usedPrefix}listproperti [kategori]_\n\n*Daftar Kategori:*\n`;
                for (let k in kategoriMap) {
                    txt += `🔸 ${usedPrefix}listproperti ${k} (${kategoriMap[k]})\n`;
                }
                return m.reply(txt);
            }

            let teks = `🏙️ *PROPERTI: ${kategoriMap[pil].toUpperCase()}* 🏙️\n_Harga otomatis naik sesuai sisa stok!_\n\n`;
            
            for (let [id, prop] of Object.entries(katalog)) {
                if (prop.kategori !== pil) continue;

                let terjual = await getTerjualGlobal(id);
                let stokSisa = prop.max - terjual;
                
                teks += `*${prop.nama}*\n`;
                teks += `🆔 ID: *${id}*\n`;
                teks += `📦 Stok: ${stokSisa}/${prop.max}\n`;
                
                if (prop.tipe === 'beli' || prop.tipe === 'dual') {
                    teks += `💰 Harga Beli: ${formatRupiah(getHargaDinamis(prop.base, terjual, prop.max))}\n`;
                }
                if (prop.tipe === 'sewa' || prop.tipe === 'dual') {
                    teks += `📄 Harga Sewa: ${formatRupiah(getHargaDinamis(prop.baseMonthly, terjual, prop.max))}/bln\n`;
                }
                teks += `⚡ IPL/Listrik: ${formatRupiah(prop.maintenance)}\n\n`;
            }
            
            teks += `*Cara Beli:* ${usedPrefix}beliproperti [ID]\n`;
            teks += `*Cara Sewa:* ${usedPrefix}sewaproperti [ID] [bulan/tahun]\n`;
            m.reply(teks);
            break;
        }

        case 'beliproperti': {
            if (userProp) return m.reply("Kamu sudah memiliki properti! Jual/tinggalkan dulu yang lama.");
            let id = args[0];
            if (!id || !katalog[id]) return m.reply(`ID properti tidak valid. Ketik *${usedPrefix}listproperti*`);
            
            let prop = katalog[id];
            if (prop.tipe === 'sewa') return m.reply("Properti ini hanya bisa disewa!");
            
            let terjual = await getTerjualGlobal(id);
            if (terjual >= prop.max) return m.reply("Maaf, stok properti ini sudah habis terjual!");

            let hargaFinal = getHargaDinamis(prop.base, terjual, prop.max);
            
            if (uangUser < hargaFinal) return m.reply(`Uang kamu tidak cukup!\nHarga: ${formatRupiah(hargaFinal)}\nUangmu: ${formatRupiah(uangUser)}`);
            
            // Simpan perubahan uang dan properti secara bersamaan ke SQL
            await updateUser(m.sender, {
                money: uangUser - hargaFinal,
                properti: JSON.stringify({
                    id: id,
                    nama: prop.nama,
                    status: 'Milik Pribadi',
                    maintenance: prop.maintenance,
                    lastTagihan: Date.now()
                })
            });
            
            m.reply(`🎉 Selamat! Kamu resmi membeli *${prop.nama}* seharga ${formatRupiah(hargaFinal)}.`);
            break;
        }

        case 'sewaproperti': {
            if (userProp) return m.reply("Kamu sudah memiliki properti/sedang menyewa tempat lain!");
            let id = args[0];
            let durasi = args[1] ? args[1].toLowerCase() : 'bulan'; 
            
            if (!id || !katalog[id]) return m.reply(`ID properti tidak valid. Ketik *${usedPrefix}listproperti*`);
            
            let prop = katalog[id];
            if (prop.tipe === 'beli') return m.reply("Properti ini hanya dijual, tidak bisa disewa!");
            
            let terjual = await getTerjualGlobal(id);
            if (terjual >= prop.max) return m.reply("Maaf, properti ini sudah full disewa!");

            let hargaSewaBulan = getHargaDinamis(prop.baseMonthly, terjual, prop.max);
            let totalBayar = durasi === 'tahun' ? (hargaSewaBulan * 12) : hargaSewaBulan; 
            let masaAktif = durasi === 'tahun' ? (24 * 3600 * 1000 * 12) : (24 * 3600 * 1000); 

            if (uangUser < totalBayar) return m.reply(`Uang kamu tidak cukup!\nBiaya Sewa (${durasi}): ${formatRupiah(totalBayar)}\nUangmu: ${formatRupiah(uangUser)}`);
            
            // Update uang dan properti ke SQL
            await updateUser(m.sender, {
                money: uangUser - totalBayar,
                properti: JSON.stringify({
                    id: id,
                    nama: prop.nama,
                    status: 'Sewa',
                    sewaHabis: Date.now() + masaAktif,
                    maintenance: prop.maintenance,
                    lastTagihan: Date.now()
                })
            });
            
            m.reply(`🔑 Kamu berhasil menyewa *${prop.nama}* untuk 1 ${durasi}.\nBiaya: ${formatRupiah(totalBayar)}`);
            break;
        }

                case 'perpanjangsewa': {
            if (!userProp) return m.reply("Kamu tidak punya properti untuk diperpanjang!");
            if (userProp.status !== 'Sewa') return m.reply("Ini hak milikmu, tidak perlu perpanjang sewa! Cukup bayar IPL saja.");
            
            let id = userProp.id;
            let prop = katalog[id];
            let durasi = args[0] ? args[0].toLowerCase() : 'bulan'; 
            
            let terjual = await getTerjualGlobal(id);
            let hargaSewaBulan = getHargaDinamis(prop.baseMonthly, terjual, prop.max);
            let totalBayar = durasi === 'tahun' ? (hargaSewaBulan * 12) : hargaSewaBulan; 
            
            // Konfigurasi waktu: 1 Bulan Sewa = 24 Jam Real-time
            let tambahanWaktu = durasi === 'tahun' ? (24 * 3600 * 1000 * 12) : (24 * 3600 * 1000); 

            if (uangUser < totalBayar) return m.reply(`Uang tidak cukup!\nBiaya Perpanjang (${durasi}): ${formatRupiah(totalBayar)}\nUangmu: ${formatRupiah(uangUser)}`);
            
            // Tambahkan waktu sewa
            userProp.sewaHabis += tambahanWaktu;
            
            // Hitung sisa hari buat ditampilin di pesan
            let sisaWaktuTotal = userProp.sewaHabis - Date.now();
            let sisaHari = Math.floor(sisaWaktuTotal / (1000 * 60 * 60 * 24));
            let sisaJam = Math.floor((sisaWaktuTotal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            // Simpan perubahan ke SQL
            await updateUser(m.sender, {
                money: uangUser - totalBayar,
                properti: JSON.stringify(userProp)
            });
            
            m.reply(`✅ Berhasil memperpanjang sewa *${prop.nama}* selama 1 ${durasi}.\n💰 Biaya: -${formatRupiah(totalBayar)}\n\n⌛ Total masa sewa kamu sekarang: *${sisaHari} Hari ${sisaJam} Jam* (Real-time)`);
            break;
        }


                case 'bayartagihan': {
            if (!userProp) return m.reply("Kamu gelandangan, tidak ada tagihan!");
            
            let now = Date.now();
            let cycleMs = 12 * 60 * 60 * 1000; // Siklus tagihan: 12 Jam Real-time
            
            // Hitung berapa lama dia nunggak
            let elapsed = now - userProp.lastTagihan;
            let siklusTerlewat = Math.floor(elapsed / cycleMs);

            // Kalau belum waktunya bayar
            if (siklusTerlewat <= 0) {
                let sisaWaktu = cycleMs - elapsed;
                let sisaJam = Math.floor(sisaWaktu / (1000 * 60 * 60));
                let sisaMenit = Math.floor((sisaWaktu % (1000 * 60 * 60)) / (1000 * 60));
                return m.reply(`✅ Semua tagihan IPL/Listrik sudah lunas.\nTagihan berikutnya muncul dalam *${sisaJam} jam ${sisaMenit} menit*.`);
            }

            // Hitung total hutang (Biaya x Jumlah siklus yang dilewati)
            let totalTagihan = userProp.maintenance * siklusTerlewat;

            // Validasi uang
            if (uangUser < totalTagihan) {
                return m.reply(`🚨 *TAGIHAN MENUMPUK!* 🚨\n\nKamu menunggak IPL/Listrik selama *${siklusTerlewat} siklus* (per 12 jam).\n\n💸 Total Tagihan: ${formatRupiah(totalTagihan)}\n💰 Uangmu: ${formatRupiah(uangUser)}\n\n_Cari kerja woy! Cepat lunasi sebelum propertimu disita!_`);
            }
            
            // Lunasi semua hutang dan reset waktu tagihan ke sekarang
            userProp.lastTagihan = now;

            // Update SQL
            await updateUser(m.sender, {
                money: uangUser - totalTagihan,
                properti: JSON.stringify(userProp)
            });
            
            m.reply(`⚡ Tagihan IPL/Listrik *${userProp.nama}* untuk *${siklusTerlewat} siklus* telah berhasil dilunasi!\n💵 Saldo terpotong: -${formatRupiah(totalTagihan)}`);
            break;
        }

        case 'propertiku': {
            if (!userProp) return m.reply(`🏠 Kamu masih gelandangan!\nGunakan *${usedPrefix}listproperti* untuk mencari tempat tinggal.`);
            
            let p = userProp;
            let teks = `🏠 *PROPERTI KAMU*\n\n`;
            teks += `Nama: ${p.nama}\n`;
            teks += `Status: ${p.status}\n`;
            teks += `Biaya IPL: ${formatRupiah(p.maintenance)} / 12 Jam\n`;
            
            // Tampilkan Info Nunggak di Profil Properti
            let cycleMs = 12 * 60 * 60 * 1000;
            let elapsed = Date.now() - p.lastTagihan;
            let siklusTerlewat = Math.floor(elapsed / cycleMs);
            let totalTagihan = p.maintenance * siklusTerlewat;

            if (siklusTerlewat > 0) {
                teks += `\n🚨 *Hutang IPL:* ${formatRupiah(totalTagihan)} (${siklusTerlewat} siklus)\n`;
                teks += `_Ketik ${usedPrefix}bayartagihan untuk melunasi._\n`;
            } else {
                teks += `\n✅ *Hutang IPL:* Lunas\n`;
            }

            if (p.status === 'Sewa') {
                let sisaWaktu = Math.max(0, p.sewaHabis - Date.now());
                let sisaJam = Math.floor(sisaWaktu / (1000 * 60 * 60));
                let sisaHari = Math.floor(sisaJam / 24);
                teks += `\n⌛ Sewa Habis Dalam: ${sisaHari} Hari ${sisaJam % 24} Jam`;
            }

            m.reply(teks);
            break;
        }


        case 'propertiku': {
            if (!userProp) return m.reply(`🏠 Kamu masih gelandangan!\nGunakan *${usedPrefix}listproperti* untuk mencari tempat tinggal.`);
            
            let p = userProp;
            let teks = `🏠 *PROPERTI KAMU*\n\n`;
            teks += `Nama: ${p.nama}\n`;
            teks += `Status: ${p.status}\n`;
            teks += `Tagihan IPL: ${formatRupiah(p.maintenance)} / 12 Jam\n`;
            
            if (p.status === 'Sewa') {
                let sisaWaktu = Math.max(0, p.sewaHabis - Date.now());
                let sisaJam = Math.floor(sisaWaktu / (1000 * 60 * 60));
                teks += `\n⌛ Sewa Habis Dalam: ${sisaJam} Jam (Waktu Nyata)`;
            }

            m.reply(teks);
            break;
        }

        case 'jualproperti':
        case 'tinggalkanproperti': {
            if (!userProp) return m.reply("Kamu tidak punya properti!");
            
            let id = userProp.id;
            let propAsli = katalog[id];
            
            if (userProp.status === 'Sewa') {
                await updateUser(m.sender, { properti: "" }); // Hapus dari SQL
                return m.reply("Kamu telah angkat kaki dari tempat sewamu.");
            } else {
                let terjual = await getTerjualGlobal(id);
                let hargaPasarSaatIni = getHargaDinamis(propAsli.base, terjual, propAsli.max);
                let hargaJual = Math.floor(hargaPasarSaatIni * 0.7); 

                await updateUser(m.sender, {
                    money: uangUser + hargaJual,
                    properti: "" // Kosongin properti
                });

                m.reply(`🏠 Properti *${propAsli.nama}* berhasil dijual!\n💵 Diterima: ${formatRupiah(hargaJual)} (Potongan 30%)`);
            }
            break;
        }
    }
};

handler.help = ['listproperti', 'beliproperti', 'sewaproperti', 'perpanjangsewa', 'bayartagihan', 'propertiku', 'jualproperti'];
handler.tags = ['rpg'];
handler.command = ['listproperti', 'beliproperti', 'sewaproperti', 'perpanjangsewa', 'bayartagihan', 'propertiku', 'jualproperti', 'tinggalkanproperti'];

module.exports = handler;
