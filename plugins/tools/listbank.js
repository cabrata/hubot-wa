const CekRekening = require("../../lib/scraper/cekrekening");
const checker = new CekRekening();

module.exports = {
    name: "listbank",
    command: ["listbank", "banklist", "listkodebank"],
    tags: ["tools"],
    premium: false,
    desc: "Menampilkan daftar kode bank untuk cek rekening",

    async handler({ m, conn, usedPrefix, command }) {
        if (!checker.apiKey) {
            return m.reply("❌ API Key Atlantic Pedia belum dikonfigurasi. Silakan tambahkan `global.atlanticKey = 'YOUR_API_KEY'` di config.js atau `ATLANTIC_API_KEY` di .env.");
        }

        try {
            await conn.sendMessage(m.chat, { react: { text: "🔍", key: m.key } });

            const result = await checker.getBankList();

            if (result.status === "true" || result.status === true) {
                let caption = `🏦 *DAFTAR KODE BANK & E-WALLET*\n\n`;

                result.data.forEach((bank, index) => {
                    caption += `*${index + 1}. ${bank.bank_name}*\n`;
                    caption += `   └ Kode: \`${bank.bank_code}\` | Tipe: ${bank.type}\n`;
                });

                caption += `\n*Gunakan format:* ${usedPrefix}cekrek <kode_bank> <nomor_rekening>`;

                await m.reply(caption);
                await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
            } else {
                await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                return m.reply(`❌ Gagal mengambil daftar bank: ${result.message}`);
            }

        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            m.reply(`❌ Terjadi kesalahan: ${e.message}`);
        }
    }
};
