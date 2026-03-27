const { updateUser } = require('../../lib/database.js')

// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = m.user

    let pasData = parseJSON(user.pasanganChar);
    if (!pasData) return m.reply(`Kamu belum punya pasangan 💔\nGunakan command *${usedPrefix}charpas* untuk cari jodoh!`);

    let now = Date.now();
    let cooldownCek = 6 * 60 * 60 * 1000; // 6 Jam cooldown

    if (user.lastCekAyang && (now - user.lastCekAyang < cooldownCek)) {
        let sisa = cooldownCek - (now - user.lastCekAyang);
        let jam = Math.floor(sisa / (60 * 60 * 1000));
        let menit = Math.floor((sisa % (60 * 60 * 1000)) / (60 * 1000));
        return m.reply(`📱 Ayangmu lagi sibuk/tidur. Jangan diganggu terus ih!\nTunggu *${jam} Jam ${menit} Menit* lagi buat ngecek kabarnya.`);
    }

    // Eksekusi Cek Kabar
    user.lastCekAyang = now;
    let uangPasangan = pasData.uang || 0;
    let namaPasangan = pasData.name;

    // Variabel buat output text
    let teks = '';

    // Skenario 1: Uang pasangan buanyaaak (Diatas Rp10 Juta) -> Dia beliin kamu kejutan!
    if (uangPasangan >= 10000000) {
        let hadiahRandom = [
            { nama: "PS 5 Pro 🎮", harga: 8000000, exp: 50000 },
            { nama: "Jam Tangan Rolex ⌚", harga: 5000000, exp: 20000 },
            { nama: "PC Gaming Rata Kanan 💻", harga: 9000000, exp: 60000 }
        ];
        let pick = hadiahRandom[Math.floor(Math.random() * hadiahRandom.length)];

        // Potong uang pasangan & Tambah exp ke player
        pasData.uang -= pick.harga;
        user.exp = (user.exp || 0) + pick.exp;

        teks = `📱 *Kabar dari ${namaPasangan}* 📱\n\n💬 "${namaPasangan}: Sayangku! Uang jajan yang kamu kasih kemaren numpuk tau. Jadi aku inisiatif beliin kamu *${pick.nama}* nih! Semoga kamu suka yaa hihi 😘"\n\n🎁 Kamu mendapatkan *${pick.nama}*!\n✨ Bonus EXP Bertambah: +${pick.exp.toLocaleString('id-ID')}\n💸 Uang Pasangan Tersisa: Rp${pasData.uang.toLocaleString('id-ID')}`;
    } 
    // Skenario 2: Uang pasangan lumayan (Antara 1 - 10 Juta) -> Dia beliin makanan/traktir
    else if (uangPasangan >= 1000000) {
        let hargaTraktir = 500000;
        pasData.uang -= hargaTraktir;
        user.exp = (user.exp || 0) + 10000;

        teks = `📱 *Kabar dari ${namaPasangan}* 📱\n\n💬 "${namaPasangan}: Beb, aku abis orderin makanan kesukaan kamu nih ke rumah pakai uangku. Makan yang banyak yaa! 🍱❤️"\n\n🎁 Kamu mendapat kiriman makanan enak!\n✨ Bonus EXP Bertambah: +10.000\n💸 Uang Pasangan Tersisa: Rp${pasData.uang.toLocaleString('id-ID')}`;
    } 
    // Skenario 3: Uang pasangan habis/sedikit -> Dia inisiatif kerja / part-time!
    else {
        let gajiRandom = Math.floor(Math.random() * 2000000) + 500000; // Gaji antara 500rb - 2.5jt
        pasData.uang += gajiRandom;

        let teksKerja = [
            `Sayang, uang jajan aku abis nih wkwk. Jadi aku lagi kerja part-time jaga cafe! ☕ Semangat ya buat aku!`,
            `Lagi nge-freelance nih sayang ngerjain project. Doain cepet cair ya uangnya! 💻`,
            `Beb, aku lagi bantuin temen jualan nih, lumayan buat nambah uang jajan aku! 📦`
        ];
        let pickKerja = teksKerja[Math.floor(Math.random() * teksKerja.length)];

        teks = `📱 *Kabar dari ${namaPasangan}* 📱\n\n💬 "${namaPasangan}: ${pickKerja}"\n\n💼 *${namaPasangan}* berhasil mendapatkan uang hasil kerjanya!\n📈 Pemasukan Pasangan: +Rp${gajiRandom.toLocaleString('id-ID')}\n💸 Total Uang Pasangan: Rp${pasData.uang.toLocaleString('id-ID')}`;
    }

    // UPDATE DATABASE SECARA GLOBAL UNTUK SEMUA SKENARIO
    await updateUser(m.sender, {
        exp: user.exp,
        lastCekAyang: user.lastCekAyang,
        pasanganChar: JSON.stringify(pasData)
    });

    return m.reply(teks);
};

handler.help = ['cekayang', 'kabarpasangan'];
handler.tags = ['fun', 'rpg'];
handler.command = ['cekayang', 'kabarpasangan'];

module.exports = handler;
