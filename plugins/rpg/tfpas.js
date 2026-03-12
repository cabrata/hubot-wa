// Obeng Sakti: Mengubah String JSON dari SQL
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = m.user
   // if (!user) return m.reply("Data user kamu tidak ditemukan di database.");

    let pasData = parseJSON(user.pasanganChar);
    if (!pasData) {
        return m.reply(`Kamu belum punya pasangan 💌\nGunakan command *${usedPrefix}charpas* untuk melamar dulu!`);
    }

    if (!args[0]) {
        return m.reply(`Masukkan jumlah uang yang mau dikasih ke pasangan.\nContoh: *${usedPrefix + command} 50000*`);
    }

    let jumlah = parseInt(args[0]);
    if (isNaN(jumlah) || jumlah <= 0) {
        return m.reply("Jumlah uang tidak valid! Masukkan angka yang benar.");
    }

    // Realisme 1: Minimal transfer / ngasih jajan
    let minTf = 10000;
    if (jumlah < minTf) {
        return m.reply(`Masa ngasih ayang cuma Rp${jumlah.toLocaleString('id-ID')}? 😭 Minimal kasih Rp${minTf.toLocaleString('id-ID')} kek buat jajan seblak!`);
    }

    if ((user.money || 0) < jumlah) {
        return m.reply(`Duit kamu nggak cukup buat gaya-gayaan ngasih segitu! 🗿\nUang kamu cuma: Rp${(user.money || 0).toLocaleString('id-ID')}`);
    }

    // Proses potong uang user & tambah uang pasangan
    user.money -= jumlah;
    pasData.uang = (pasData.uang || 0) + jumlah;

    // Realisme 2: Reaksi pasangan & nambah Love Point (point)
    let reaksi = "";
    let bonusPoint = 0;

    if (jumlah < 50000) {
        reaksi = `"Hmm, makasih ya... pas banget buat beli es teh." 😒`;
        bonusPoint = 1;
    } else if (jumlah >= 50000 && jumlah <= 500000) {
        reaksi = `"Wahh makasih banyak yaa sayang buat jajan hari ini! I love you! 😘"`;
        bonusPoint = 5;
    } else if (jumlah > 500000 && jumlah <= 5000000) {
        reaksi = `"Aaaaaa ayang baik bangett!! Makasih cintakuu sayangkuu! Makin sayang deh! 🥰🎉"`;
        bonusPoint = 15;
    } else {
        reaksi = `"HAAAH?! BANYAK BANGET?! KAMU NGEPET DIMANA SAYANG?! AAAA MAKASIH SULTANKU!! 😭😭❤️"`;
        bonusPoint = 30;
    }

    // Tambahkan point
    pasData.point = (pasData.point || 0) + bonusPoint;

    // Simpan kembali ke database (Stringify)
    user.pasanganChar = JSON.stringify(pasData);

    // Output struk ala-ala ngasih amplop
    let teks = `💸 *TRANSFER KE PASANGAN BERHASIL* 💸\n\n`;
    teks += `Kamu memberikan amplop berisi uang ke *${pasData.name}*.\n\n`;
    teks += `💬 Reaksi ${pasData.name}:\n${reaksi}\n\n`;
    teks += `───────────────────\n`;
    teks += `❤️ Love Point Bertambah: +${bonusPoint} Pts (Total: ${pasData.point})\n`;
    teks += `💵 Uang Pasangan Sekarang: Rp${pasData.uang.toLocaleString('id-ID')}\n`;
    teks += `💳 Sisa Saldo Kamu: Rp${user.money.toLocaleString('id-ID')}`;

    m.reply(teks);
}

handler.help = ['tfpas <jumlah>'];
handler.tags = ['fun', 'rpg'];
handler.command = ['tfpas', 'transferpasangan', 'kasihuang'];

module.exports = handler;
