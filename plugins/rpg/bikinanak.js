const { getUser, updateUser, updateEconomy } = require('../../lib/database')

// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    if (!user) return m.reply("❌ User tidak ditemukan di database.");

    // KONFIGURASI WAKTU RPG
    let yearMs = 3 * 24 * 60 * 60 * 1000; 
    let monthMs = yearMs / 12; 
    let masaHamilMs = 25.7 * 60 * 60 * 1000; 
    let monthKandunganMs = masaHamilMs / 9; 

    // Safe Parsing JSON
    let pasanganChar = parseJSON(user.pasanganChar);
    let anak = parseJSON(user.anak) || [];
    if (!Array.isArray(anak)) anak = [];

    let now = Date.now();

    switch (command) {
        case 'bikinanak': {
            if (!pasanganChar) return m.reply(`Kamu belum punya pasangan 💔\nGunakan command *${usedPrefix}charpas* untuk mencari pasangan.`);
            if (user.hamil) return m.reply("Heii aku lagi hamil tauu 😤 sabar dikit napa! Tunggu lahir dulu.");
            
            // LIMIT ANAK MAKSIMAL 3
            let anakCount = anak.length;
            if (anakCount >= 3) {
                return m.reply(`"Sayang, anak kita udah ${anakCount} loh... KB dulu dong ah, biaya susu mahal tau!" 🙅‍♀️🍼`);
            }

            // CEK SYARAT POIN (Anak 1 = 250k, Anak 2 = 300k, Anak 3 = 350k)
            let currentPoint = pasanganChar.point || 0;
            let requiredPoint = 250000 + (anakCount * 50000);

            if (currentPoint < requiredPoint) {
                let teksPoin = `⚠️ *POIN CINTA BELUM CUKUP!* ⚠️\n\n`;
                if (currentPoint < 100000) teksPoin += `Kalian bahkan belum nikah resmi! (Butuh 100k Poin untuk Menikah).\n`;
                else teksPoin += `Istrimu belum siap untuk punya anak ke-${anakCount + 1}.\n`;
                
                teksPoin += `\n🎯 Syarat Point: *${requiredPoint.toLocaleString('id-ID')} Pts*`;
                teksPoin += `\n💖 Point Kamu: *${currentPoint.toLocaleString('id-ID')} Pts*`;
                teksPoin += `\n\n_Sering-sering ngajak kencan atau kasih gift dulu sana!_`;
                return m.reply(teksPoin);
            }

            // KALO LOLOS SYARAT POIN, LANGSUNG HAMILIN
            await updateUser(m.sender, {
                hamil: true,
                hamilStart: now
            });

            m.reply(`💞 Kamu dan ${pasanganChar.name} menghabiskan malam yang panas dan penuh keringat... 🥵💦\n\n🤰 *Status: Istri Hamil Anak ke-${anakCount + 1}!*\n⏳ Perkiraan kelahiran: ±25 Jam\n\n> Gunakan *${usedPrefix}ck* untuk mengecek perkembangan kandungan.`);
            break;
        }

        case 'ck': {
            if (user.hamil) {
                let hamilStart = Number(user.hamilStart || 0);
                let elapsed = now - hamilStart;

                if (elapsed >= masaHamilMs) {
                    anak.push({
                        id: "3275" + (now.toString().slice(-8)) + "000" + (anak.length + 1),
                        nama: `Anak ke-${anak.length + 1}`,
                        gender: Math.random() > 0.5 ? 'Laki-laki 👦' : 'Perempuan 👧',
                        lahir: now,
                        lastRawat: now 
                    });

                    await updateUser(m.sender, {
                        hamil: false,
                        hamilStart: 0,
                        anak: JSON.stringify(anak)
                    });

                    return m.reply(`🎉 *Oaekk... oaekkk...!*\n\nSelamat! Anak ke-${anak.length} kamu dan ${pasanganChar?.name || 'istrimu'} telah lahir ke dunia. 👶\n\nJangan lupa rutin bayar biaya perawatan menggunakan *${usedPrefix}rawatanak* tiap 6 jam!`);
                } else {
                    let usiaBulan = Math.floor(elapsed / monthKandunganMs);
                    let sisaMs = masaHamilMs - elapsed;
                    let jam = Math.floor(sisaMs / (1000 * 60 * 60));
                    let menit = Math.floor((sisaMs % (1000 * 60 * 60)) / (1000 * 60));
                    let progress = '⬛'.repeat(usiaBulan) + '⬜'.repeat(9 - Math.max(0, usiaBulan));

                    return m.reply(`🤰 *STATUS KANDUNGAN*\n\n🩺 Kondisi: Sehat\n👶 Usia Kandungan: *${usiaBulan} Bulan*\n📊 Perkembangan: [${progress}]\n⏳ HPL (Real-time): ${jam} jam ${menit} menit lagi.`);
                }
            } else {
                return m.reply(`Istrimu sedang tidak hamil.\nGunakan *${usedPrefix}bikinanak* kalau poin cinta kalian sudah cukup!`);
            }
        }

        case 'rawatanak': {
            if (anak.length === 0) return m.reply(`Kamu belum punya anak yang lahir!\nCek status kehamilan menggunakan *${usedPrefix}ck*.`);

            let currentMoney = Number(user.economy?.money || user.money || 0);
            let totalBiaya = 0, totalIncome = 0;
            let logTeks = `📝 *LAPORAN KEUANGAN KELUARGA*\n\n`;
            let isAdaTagihan = false;
            let anakUpdate = []; 

            anak.forEach((a, i) => {
                let ageMs = now - Number(a.lahir);
                let umurTahun = Math.floor(ageMs / yearMs);
                let lastRawat = Number(a.lastRawat || a.lahir);
                let waktuDitelantarkanMs = now - lastRawat;
                let siklusLewat = Math.floor(waktuDitelantarkanMs / monthMs);
                let tarifPerSiklus = 0;
                let namaFase = "";

                if (umurTahun < 6) { tarifPerSiklus = 50000; namaFase = "Balita 🍼"; }
                else if (umurTahun < 13) { tarifPerSiklus = 100000; namaFase = "SD 🎒"; }
                else if (umurTahun < 18) { tarifPerSiklus = 250000; namaFase = "Remaja 📱"; }
                else if (umurTahun < 21) { tarifPerSiklus = 500000; namaFase = "Kuliah 🎓"; }

                if (umurTahun >= 21) {
                    if (siklusLewat > 0) {
                        let gajiAnak = 1000000 * siklusLewat;
                        totalIncome += gajiAnak;
                        logTeks += `💼 ${a.nama} (Dewasa): Ngasih jatah ${siklusLewat} siklus (+Rp${gajiAnak.toLocaleString('id-ID')})\n`;
                        isAdaTagihan = true;
                    }
                } else {
                    if (siklusLewat > 0) {
                        let tagihanAnak = tarifPerSiklus * siklusLewat;
                        totalBiaya += tagihanAnak;
                        logTeks += `${namaFase.slice(-2)} ${a.nama}: Nunggak biaya ${siklusLewat} siklus (-Rp${tagihanAnak.toLocaleString('id-ID')})\n`;
                        isAdaTagihan = true;
                    }
                }

                if (siklusLewat > 0) a.lastRawat = now;
                anakUpdate.push(a);
            });

            if (!isAdaTagihan) return m.reply(`✅ Semua anakmu sudah terurus.\nTidak ada tagihan saat ini. Cek lagi nanti setelah 6 jam.`);

            if (totalBiaya > 0 && currentMoney < totalBiaya) {
                return m.reply(`🚨 *TAGIHAN MENUMPUK!* 🚨\n\n💸 Uang kamu tidak cukup untuk membayar biaya hidup anak-anakmu!\n\n📉 Total Nunggak: *Rp${totalBiaya.toLocaleString('id-ID')}*\n💰 Uangmu Saat Ini: *Rp${currentMoney.toLocaleString('id-ID')}*\n\n_Segera cari uang sebelum istrimu ngamuk!_`);
            }

            let netMoney = totalIncome - totalBiaya;
            await updateEconomy(m.sender, { money: currentMoney + netMoney });
            await updateUser(m.sender, { anak: JSON.stringify(anakUpdate) });

            logTeks += `\n───────────────────\n`;
            if (totalBiaya > 0) logTeks += `📉 Pengeluaran: -Rp${totalBiaya.toLocaleString('id-ID')}\n`;
            if (totalIncome > 0) logTeks += `📈 Pemasukan: +Rp${totalIncome.toLocaleString('id-ID')}\n`;
            logTeks += `💰 Sisa Dompet: Rp${(currentMoney + netMoney).toLocaleString('id-ID')}\n\n`;
            logTeks += `_Keluargamu kembali sejahtera untuk 6 jam ke depan._ 🏡`;

            m.reply(logTeks);
            break;
        }
    }
};

handler.help = ['bikinanak', 'ck', 'rawatanak'];
handler.tags = ['fun', 'rpg'];
handler.command = /^(bikinanak|ck|rawatanak)$/i;
handler.register = true;

module.exports = handler;