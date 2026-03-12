const { getUser, updateUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    if (!user) return m.reply("❌ User tidak ditemukan di database.");

    let pushname = user.name || m.sender.split('@')[0];

    // ==========================================
    // KONFIGURASI WAKTU RPG (Jalur Magic & Normal)
    // ==========================================
    // Umur Anak & Tagihan: 3 Hari Real-time = 1 Tahun Game
    let yearMs = 3 * 24 * 60 * 60 * 1000; 
    
    // 🔥 INI YANG ILANG TADI: 1 Bulan Game (buat tagihan) = 6 Jam Real-time
    let monthMs = yearMs / 12; 
    
    // Masa Hamil: Fix ±25 Jam Real-time (Biar gak kelamaan nunggu brojol)
    let masaHamilMs = 25.7 * 60 * 60 * 1000; 
    
    // UI Kandungan (Biar bar 9 bulannya tetep jalan pas .ck)
    // 25.7 Jam dibagi 9 bulan = ±2.8 Jam per bulan kandungan
    let monthKandunganMs = masaHamilMs / 9; 


    // Safe Parsing JSON
    let pasanganChar = user.pasanganChar;
    if (typeof pasanganChar === 'string') {
        try { pasanganChar = JSON.parse(pasanganChar) } catch (e) { pasanganChar = null }
    }

    let anak = user.anak;
    if (typeof anak === 'string') {
        try { anak = JSON.parse(anak) } catch (e) { anak = [] }
    }
    if (!Array.isArray(anak)) anak = [];

    let now = Date.now();

    switch (command) {
        // =====================================
        // COMMAND 1: BIKIN ANAK
        // =====================================
        case 'bikinanak': {
            if (!pasanganChar) return m.reply(`Kamu belum punya pasangan 💔\nGunakan command *${usedPrefix}char* untuk mencari pasangan.`);
            if (user.hamil) return m.reply("Heii aku lagi hamil tauu 😤 sabar dikit napa!");

            await updateUser(m.sender, {
                hamil: true,
                hamilStart: now
            });

            m.reply(`💞 Kamu dan ${pasanganChar.name || 'pasanganmu'} sedang ahh ahh~, km mainnya hebat sampe aku hamil🤤\n\n🤰 Status: Hamil\n⏳ Perkiraan kelahiran: ±25 Jam (Jalur Cepat)\n\n> Gunakan *${usedPrefix}ck* untuk mengecek perkembangan.`);
            break;
        }

        // =====================================
        // COMMAND 2: CEK KANDUNGAN / ANAK (CK)
        // =====================================
        case 'ck': {
            if (user.hamil) {
                let hamilStart = Number(user.hamilStart || 0);
                let elapsed = now - hamilStart;

                if (elapsed >= masaHamilMs) {
                    // Proses Melahirkan
                    anak.push({
                        id: "3275" + (now.toString().slice(-8)) + "000" + (anak.length + 1),
                        nama: `Anak ke-${anak.length + 1}`,
                        gender: Math.random() > 0.5 ? 'Laki-laki 👦' : 'Perempuan 👧',
                        lahir: now,
                        lastRawat: now // Set waktu rawat pertama kali saat lahir
                    });

                    await updateUser(m.sender, {
                        hamil: false,
                        hamilStart: 0,
                        anak: JSON.stringify(anak) // Simpan balik ke SQL
                    });

                    return m.reply(`🎉 *Oaekk... oaekkk...!*\n\nSelamat! Bayi kamu dan ${pasanganChar?.name || 'pasanganmu'} telah lahir ke dunia. 👶\n\nGunakan *${usedPrefix}kk* untuk melihat detail anakmu.`);
                } else {
                    // Masih Hamil
                    let usiaBulan = Math.floor(elapsed / monthKandunganMs); // Pake rumus kandungan fast-track
                    let sisaMs = masaHamilMs - elapsed;

                    let jam = Math.floor(sisaMs / (1000 * 60 * 60));
                    let menit = Math.floor((sisaMs % (1000 * 60 * 60)) / (1000 * 60));
                    
                    let progress = '⬛'.repeat(usiaBulan) + '⬜'.repeat(9 - Math.max(0, usiaBulan));

                    return m.reply(`🤰 *STATUS KANDUNGAN*\n\n🩺 Kondisi: Sehat\n👶 Usia: *${usiaBulan} Bulan*\n📊 Perkembangan: [${progress}]\n⏳ HPL (Real-time): ${jam} jam ${menit} menit lagi.`);
                }
            } else {
                return m.reply(`Kamu sedang tidak hamil.\nGunakan *${usedPrefix}bikinanak* kalau kamu sudah punya pasangan!`);
            }
        }

        // =====================================
        // COMMAND 3: RAWAT ANAK (SISTEM TAGIHAN AKUMULATIF)
        // =====================================
        case 'rawatanak': {
            if (anak.length === 0) return m.reply(`Kamu belum punya anak yang lahir!\nCek status kehamilan menggunakan *${usedPrefix}ck*.`);

            let currentMoney = Number(user.economy?.money || user.money || 0);
            
            let totalBiaya = 0;
            let totalIncome = 0;
            let logTeks = `📝 *LAPORAN KEUANGAN KELUARGA*\n\n`;
            let isAdaTagihan = false;
            let anakUpdate = []; 

            anak.forEach((a, i) => {
                let ageMs = now - Number(a.lahir);
                let umurTahun = Math.floor(ageMs / yearMs);
                
                let lastRawat = Number(a.lastRawat || a.lahir);
                let waktuDitelantarkanMs = now - lastRawat;

                // Siklus kebutuhan: Tiap 6 Jam Real-time (Pake monthMs yg udah gue tambahin)
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

                a.lastRawat = now;
                anakUpdate.push(a);
            });

            if (!isAdaTagihan) {
                return m.reply(`✅ Semua anakmu sudah terurus.\nTidak ada tagihan saat ini. Cek lagi nanti setelah 6 jam.`);
            }

            if (totalBiaya > 0 && currentMoney < totalBiaya) {
                return m.reply(`🚨 *TAGIHAN MENUMPUK!* 🚨\n\n💸 Uang kamu tidak cukup untuk membayar hutang biaya hidup anak-anakmu!\n\n📉 Total Nunggak: *Rp${totalBiaya.toLocaleString('id-ID')}*\n💰 Uangmu Saat Ini: *Rp${currentMoney.toLocaleString('id-ID')}*\n\n_Segera cari uang sebelum anakmu diambil Dinas Sosial!_`);
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
