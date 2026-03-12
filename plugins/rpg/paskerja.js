// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    
    let user = m.user
  //  if (!user) return m.reply("User tidak ditemukan di database.");

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

    // Skenario 1: Uang pasangan buanyaaak (Diatas Rp10 Juta) -> Dia beliin kamu kejutan!
    if (uangPasangan >= 10000000) {
        let hadiahRandom = [
            { nama: "PS 5 Pro 🎮", harga: 8000000, exp: 50000 },
            { nama: "Jam Tangan Rolex ⌚", harga: 5000000, exp: 20000 },
            { nama: "PC Gaming Rata Kanan 💻", harga: 9000000, exp: 60000 }
        ];
        let pick = hadiahRandom[Math.floor(Math.random() * hadiahRandom.length)];

        // Potong uang pasangan
        pasData.uang -= pick.harga;
        // Tambah exp ke player
        user.exp = (user.exp || 0) + pick.exp;

        // Save data
        user.pasanganChar = JSON.stringify(pasData);

        let teks = `📱 *Kabar dari ${namaPasangan}* 📱\n\n`;
        teks += `💬 "${namaPasangan}: Sayangku! Uang jajan yang kamu kasih kemaren numpuk tau. Jadi aku inisiatif beliin kamu *${pick.nama}* nih! Semoga kamu suka yaa hihi 😘"\n\n`;
        teks += `🎁 Kamu mendapatkan *${pick.nama}*!\n`;
        teks += `✨ Bonus EXP Bertambah: +${pick.exp.toLocaleString('id-ID')}\n`;
        teks += `💸 Uang Pasangan Tersisa: Rp${pasData.uang.toLocaleString('id-ID')}`;

        return m.reply(teks);
    } 

    // Skenario 2: Uang pasangan lumayan (Antara 1 - 10 Juta) -> Dia beliin makanan/traktir
    else if (uangPasangan >= 1000000) {
        let hargaTraktir = 500000;
        pasData.uang -= hargaTraktir;
        user.exp = (user.exp || 0) + 10000;

        // Save data
        user.pasanganChar = JSON.stringify(pasData);

        let teks = `📱 *Kabar dari ${namaPasangan}* 📱\n\n`;
        teks += `💬 "${namaPasangan}: Beb, aku abis orderin makanan kesukaan kamu nih ke rumah pakai uangku. Makan yang banyak yaa! 🍱❤️"\n\n`;
        teks += `🎁 Kamu mendapat kiriman makanan enak!\n`;
        teks += `✨ Bonus EXP Bertambah: +10.000\n`;
        teks += `💸 Uang Pasangan Tersisa: Rp${pasData.uang.toLocaleString('id-ID')}`;

        return m.reply(teks);
    } 

    // Skenario 3: Uang pasangan habis/sedikit -> Dia inisiatif kerja / part-time!
    else {
        let gajiRandom = Math.floor(Math.random() * 2000000) + 500000; // Gaji antara 500rb - 2.5jt
        pasData.uang += gajiRandom;

        // Save data
        user.pasanganChar = JSON.stringify(pasData);

        let teksKerja = [
            `Sayang, uang jajan aku abis nih wkwk. Jadi aku lagi kerja part-time jaga cafe! ☕ Semangat ya buat aku!`,
            `Lagi nge-freelance nih sayang ngerjain project. Doain cepet cair ya uangnya! 💻`,
            `Beb, aku lagi bantuin temen jualan nih, lumayan buat nambah uang jajan aku! 📦`
        ];
        let pickKerja = teksKerja[Math.floor(Math.random() * teksKerja.length)];

        let teks = `📱 *Kabar dari ${namaPasangan}* 📱\n\n`;
        teks += `💬 "${namaPasangan}: ${pickKerja}"\n\n`;
        teks += `💼 *${namaPasangan}* berhasil mendapatkan uang hasil kerjanya!\n`;
        teks += `📈 Pemasukan Pasangan: +Rp${gajiRandom.toLocaleString('id-ID')}\n`;
        teks += `💸 Total Uang Pasangan: Rp${pasData.uang.toLocaleString('id-ID')}`;

        return m.reply(teks);
    }
};

handler.help = ['cekayang', 'kabarpasangan'];
handler.tags = ['fun', 'rpg'];
handler.command = ['cekayang', 'kabarpasangan'];

module.exports = handler;
