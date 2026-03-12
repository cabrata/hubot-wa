let handler = async (m, { conn, args, text, usedPrefix, command }) => {
    let user = m.user;
    if (!user) return;

    if (!text) {
        return m.reply(`Cara beli limit:\n${usedPrefix + command} jumlah\n\nContoh:\n${usedPrefix + command} 10`);
    }

    if (isNaN(text)) {
        return m.reply('❌ Jumlah limit harus berupa angka!');
    }

    const Blimit = 2; // Harga 1 limit = 2 diamond
    const count = Math.max(parseInt(text), 1); // Minimal pembelian adalah 1
    const totalCost = Blimit * count;

    let userDiamond = Number(user.diamond || 0);

    if (userDiamond >= totalCost) {
        // Eksekusi potong diamond dan tambah limit langsung ke memori user
        user.limit = Number(user.limit || 0) + count;
        user.diamond = userDiamond - totalCost;
        
        conn.reply(m.chat, `✅ *Transaksi Sukses*\n\nBerhasil membeli *${count} Limit*\nHarga: -${totalCost} Diamond\nSisa Diamond: ${user.diamond}`, m);
    } else {
        conn.reply(m.chat, `❌ *Transaksi Gagal*\n\nDiamond kamu tidak cukup untuk membeli ${count} limit.\nTotal Biaya: ${totalCost} Diamond\nDiamond kamu: ${userDiamond}`, m);
    }
}

handler.help = ["buylimit <jumlah>"];
handler.tags = ["rpg"];
handler.command = ["buylimit"];

module.exports = handler;
