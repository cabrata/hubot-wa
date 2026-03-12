const { getUser } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix }) => {
    let user = await getUser(m.sender);
    if (!user) return;

    // 🛡️ SAFE PARSE JSON ANAK
    let anakList = [];
    if (user.anak) {
        if (typeof user.anak === 'string') {
            try { 
                anakList = JSON.parse(user.anak); 
            } catch (e) { 
                anakList = []; 
            }
        } else if (Array.isArray(user.anak)) {
            anakList = user.anak;
        }
    }

    // Cek apakah user punya anak
    if (anakList.length === 0) {
        return m.reply(`Kamu belum punya anak 👶\nGunakan command *${usedPrefix}bikinanak* bersama pasanganmu.`);
    }

    let pushname = m.pushName || m.sender.split('@')[0];
    let teks = `👨‍👩‍👧‍👦 *KARTU KELUARGA: ${pushname}*\n\n`;
    
    let now = Date.now();
    // Skala Waktu Game: 3 Hari Real-time = 1 Tahun Game
    let yearMs = 3 * 24 * 60 * 60 * 1000; 
    let monthMs = yearMs / 12; // 1 Bulan Game = 6 Jam Real-time

    anakList.forEach((a, i) => {
        let ageMs = now - Number(a.lahir || now); // Aman dari error data lahir kosong
        
        let tahun = Math.floor(ageMs / yearMs);
        let bulan = Math.floor((ageMs % yearMs) / monthMs);

        let fase = "Bayi / Balita 🍼";
        if (tahun >= 6 && tahun < 13) fase = "Anak SD 🎒";
        else if (tahun >= 13 && tahun < 18) fase = "Remaja 📱";
        else if (tahun >= 18 && tahun < 21) fase = "Mahasiswa 🎓";
        else if (tahun >= 21) fase = "Dewasa Mapan 💼";

                // Bikin NIK palsu tapi keren (Format: 3275 + 8 digit timestamp lahir + urutan)
        let fakeNik = "3275" + (a.lahir ? a.lahir.toString().slice(-8) : "00000000") + "000" + (i + 1);
        let idAnak = a.id ? a.id : fakeNik;

        let gender = a.gender ? a.gender : "Belum dicek";

        teks += `*${i + 1}. ${a.nama || 'Tanpa Nama'}*\n`;
        teks += `   🆔 NIK Anak: ${idAnak}\n`;
        teks += `   🚻 Gender: ${gender}\n`;
        teks += `   🎂 Umur: ${tahun} Tahun ${bulan} Bulan\n`;
        teks += `   🌱 Fase: ${fase}\n\n`;
    });

    m.reply(teks.trim());
};

handler.help = ['listanak', 'kk'];
handler.tags = ['fun', 'rpg'];
handler.command = ['listanak', 'kk', 'kartukeluarga'];

module.exports = handler;
