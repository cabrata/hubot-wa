const CekResi = require("../../lib/scraper/cekresi");
const tracker = new CekResi();

module.exports = {
    name: "cekresi",
    command: ["cekresi", "tracking"],
    tags: ["tools"],
    premium: false,
    desc: "Cek resi / tracking paket multi-kurir",

    async handler({ m, conn, text, usedPrefix, command }) {
        const resi = text.trim();
        if (!resi) {
            return m.reply(
                `📦 *Cek Resi*\n\n` +
                `*Gunakan format:* ${usedPrefix + command} <nomor resi>\n\n` +
                `Contoh: ${usedPrefix + command} 11002692728790`
            );
        }

        try {
            await conn.sendMessage(m.chat, { react: { text: "🔍", key: m.key } });

            const result = await tracker.multiTrack(resi);
            if (!result.status) {
                await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                return m.reply(`❌ ${result.message}`);
            }

            let caption = `╭─── [ 📦 *TRACKING PAKET* ] ───\n`;
            caption += `│ 🏷️ *Resi:* ${result.awb}\n`;
            caption += `│ 🚚 *Kurir:* ${result.courier.toUpperCase()} (${result.courier_code.toUpperCase()})\n`;
            caption += `│ 📌 *Status:* ${result.current_status}\n`;
            caption += `│ 📅 *Tgl Kirim:* ${result.shipment_date}\n`;
            caption += `╰─────────────────────────────\n\n`;
            caption += `📜 *Riwayat Pengiriman:*\n`;
            caption += `┌─────────────────────────────\n`;

            result.history.forEach((item, idx) => {
                const date = item.date || item.time || item.tanggal || '';
                const desc = item.desc || item.description || item.status || item.keterangan || '';
                const location = item.location || item.lokasi || item.city || '';

                const prefix = idx === 0 ? '🟢' : '🔘'; // Highlight initial/latest status
                caption += `│ ${prefix} *${date}*\n`;
                caption += `│ ${desc}\n`;
                if (location) caption += `│ 📍 _${location}_\n`;

                // Add separator except for the last item
                if (idx < result.history.length - 1) {
                    caption += `├─────────────────────────────\n`;
                }
            });
            caption += `└─────────────────────────────`;

            await m.reply(caption);
            await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

        } catch (e) {
            await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            m.reply(`❌ Terjadi kesalahan: ${e.message}`);
        }
    }
};
