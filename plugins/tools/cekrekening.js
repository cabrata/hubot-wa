const CekRekening = require("../../lib/scraper/cekrekening");
const checker = new CekRekening();

module.exports = {
    name: "cekrekening",
    command: ["cekrekening", "cekrek"],
    tags: ["tools"],
    premium: false,
    desc: "Cek nama pemilik rekening bank atau e-wallet",

    async handler({ m, conn, text, usedPrefix, command }) {
        if (!checker.apiKey) {
            return m.reply("❌ API Key Atlantic Pedia belum dikonfigurasi. Silakan tambahkan `global.atlanticKey = 'YOUR_API_KEY'` di config.js atau `ATLANTIC_API_KEY` di .env.");
        }

        const args = text.trim().split(" ");
        if (args.length < 2) {
            return m.reply(
                `🏦 *Cek Rekening*\n\n` +
                `*Gunakan format:* ${usedPrefix + command} <kode_bank> <nomor_rekening>\n\n` +
                `Contoh: ${usedPrefix + command} dana 08123456789\n\n` +
                `*Untuk melihat kode bank:* ${usedPrefix}listbank`
            );
        }

        const bankCode = args[0].toLowerCase();
        const accountNumber = args[1];

        try {
            await conn.sendMessage(m.chat, { react: { text: "🔍", key: m.key } });

            const result = await checker.checkAccount(bankCode, accountNumber);

            // Periksa apabila API gagal merespon atau status tidak true
            if (!result || (result.status !== true && result.status !== "true")) {
                await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                return m.reply(`❌ Gagal mengecek rekening: ${result?.message || 'Pastikan kode bank dan nomor rekening benar.'}`);
            }

            if (result.status === true || result.status === "true") {
                const data = result.data;
                let caption = `╭─── [ 🏦 *CEK REKENING* ] ───\n`;
                caption += `│ 🏦 *Bank/E-Wallet:* ${data.kode_bank.toUpperCase()}\n`;
                caption += `│ 🔢 *Nomor:* ${data.nomor_akun}\n`;
                caption += `│ 👤 *Pemilik:* ${data.nama_pemilik}\n`;
                caption += `│ 📌 *Status:* ${data.status}\n`;
                caption += `╰─────────────────────────────`;

                await m.reply(caption);
                await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
            }
        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            m.reply(`❌ Terjadi kesalahan: ${e.message}`);
        }
    }
};
