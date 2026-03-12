const { db, getUser, updateUser } = require('../../lib/database');

// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    global.kencanSession = global.kencanSession || {};

    // Tarik data langsung dari SQL
    let user = await getUser(m.sender);
    if (!user) return m.reply("User tidak ditemukan di database.");

    // PARSE JSON-NYA DI SINI
    let pasData = parseJSON(user.pasanganChar);

    if (!pasData) {
        return m.reply(`Kamu belum punya pasangan buat diajak jalan 💔\nGunakan command *${usedPrefix}charpas* dulu!`);
    }

    let cooldownKencan = 12 * 60 * 60 * 1000; // 12 Jam
    let now = Date.now();
    
    if (user.lastKencan && (now - user.lastKencan < cooldownKencan)) {
        let sisa = cooldownKencan - (now - user.lastKencan);
        let jam = Math.floor(sisa / (60 * 60 * 1000));
        let menit = Math.floor((sisa % (60 * 60 * 1000)) / (60 * 1000));
        return m.reply(`⏳ Pasanganmu masih capek abis jalan-jalan kemaren.\nTunggu *${jam} Jam ${menit} Menit* lagi buat ngajak dia kencan!`);
    }

    // Sekarang pasData.name sudah valid karena sudah di-parse jadi objek
    let teks = `🚗 *MAU NGAJAK ${pasData.name.toUpperCase()} KEMANA HARI INI?* ✈️\n\n`;
    teks += `1. Makan di Warkop / Angkringan (Rp 50.000)\n`;
    teks += `2. Nonton Bioskop & Mall (Rp 500.000)\n`;
    teks += `3. Staycation di Vila Bali (Rp 15.000.000)\n`;
    teks += `4. Liburan Keliling Eropa (Rp 750.000.000)\n\n`;
    teks += `Balas pesan ini dengan angka (1/2/3/4) untuk memilih.`;

    m.reply(teks);
    
    // Simpan session kencan sementara
    global.kencanSession[m.sender] = { active: true };
};

handler.before = async function (m, { conn }) {
    global.kencanSession = global.kencanSession || {};
    let budy = m.text;

    if (!budy) return;

    if (global.kencanSession[m.sender]?.active) {
        let user = await getUser(m.sender);

        if (!user) {
            delete global.kencanSession[m.sender];
            return;
        }

        // Parse JSON Pasangan lagi saat nerima jawaban
        let pasData = parseJSON(user.pasanganChar);
        
        if (!pasData) {
            delete global.kencanSession[m.sender];
            return;
        }

        let pilihan = {
            '1': { nama: 'Warkop / Angkringan 🍜', harga: 50000, pts: 25, reaksi: "Wah, makanannya enak kok walau sederhana! Asal sama kamu aku seneng aja 💖" },
            '2': { nama: 'Nonton Bioskop & Mall 🎬', harga: 500000, pts: 100, reaksi: "Filmnya seru banget! Makasih ya traktirannya hari ini sayang 🥰" },
            '3': { nama: 'Vila Bali 🏖️', harga: 15000000, pts: 350, reaksi: "Vila-nya bagus banget beb! Kapan-kapan kita kesini lagi yaa 🌊💖" },
            '4': { nama: 'Liburan Keliling Eropa 🗼', harga: 750000000, pts: 1000, reaksi: "AAAAA SUMPAH INI KENCAN TERBAIK!! MAKASIH BANYAK SULTANKU!! 😭😭🗼❄️❤️" }
        };

        if (pilihan[budy]) {
            let data = pilihan[budy];
            let uangUser = user.money || 0;

            if (uangUser < data.harga) {
                m.reply(`💸 Yahh uangmu nggak cukup buat ngajak dia ke *${data.nama}*!\nKamu butuh Rp ${data.harga.toLocaleString('id-ID')}, tapi uangmu cuma Rp ${uangUser.toLocaleString('id-ID')}. Kurang menabung nih boss!`);
                delete global.kencanSession[m.sender];
                return true;
            }

            // Tambah Point ke Pasangan
            pasData.point = (pasData.point || 0) + data.pts;

            // Eksekusi Update ke Database SQL
            await updateUser(m.sender, { 
                money: uangUser - data.harga, // Potong uang
                pasanganChar: JSON.stringify(pasData), // Simpan pasangan yang poinnya udah nambah
                lastKencan: Date.now() // Catat waktu kencan
            });

            let teksBerhasil = `✈️ *KENCAN BERHASIL!* ✈️\n\n`;
            teksBerhasil += `Kamu dan *${pasData.name}* baru saja pulang dari kencan romantis di *${data.nama}*.\n\n`;
            teksBerhasil += `💬 Reaksi ${pasData.name}:\n"${data.reaksi}"\n\n`;
            teksBerhasil += `❤️ Love Point bertambah: +${data.pts} Pts (Total: ${pasData.point.toLocaleString('id-ID')})\n`;
            teksBerhasil += `💸 Biaya Kencan: Rp ${data.harga.toLocaleString('id-ID')}`;

            m.reply(teksBerhasil);
            
            // Tutup Sesi
            delete global.kencanSession[m.sender];
            return true;
        }
    }
};

handler.help = ['kencan'];
handler.tags = ['fun', 'rpg'];
handler.command = ['kencan', 'date', 'kencanpas'];

module.exports = handler;
