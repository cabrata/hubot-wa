// plugins/komiku_cmd.js
const { searchKomiku, renderSearchList } = require('../../lib/scraper/komiku');

let handler = async (m, { conn, text, command, usedPrefix }) => {
  conn.komikuReply = conn.komikuReply || {};
  const id = m.chat;

  if (/^komiku$/i.test(command) && !text) {
    return m.reply(
      `Contoh:\n` +
      `• ${usedPrefix}komiku aishiteru\n\n` +
      `Flow: cari → pilih komik (balas angka) → pilih chapter (balas *nomor chapter asli*, mis. 61 / 60.5) → bot kirim PDF.\n` +
      `Navigasi hasil pencarian: balas *next* / *prev* ke pesan daftar bot.\n` +
      `Daftar chapter dikirim *tanpa nomor urut*. Ketik *${usedPrefix}komikucancel* untuk batal.`
    );
  }

  if (/^komiku$/i.test(command) && text) {
    try {
      await m.reply(global.wait || 'Mencari…');
      const results = await searchKomiku(text.trim(), 1);

      conn.komikuReply[id] = {
        step: 'pick_manga',
        user: m.sender, // <--- MODIFIKASI: Catat siapa yang memulai sesi
        query: text.trim(),
        results,
        page: 1,
        lastSearchMsgId: null,
        lastChapterMsgIds: [] // array karena daftar chapter bisa kepotong jadi beberapa pesan
      };

      const msgText = renderSearchList(text.trim(), results);
      const sent = await conn.sendMessage(m.chat, { text: msgText }, { quoted: m });
      conn.komikuReply[id].lastSearchMsgId = sent.key.id;
    } catch(e){
      console.error(e);
      return m.reply(`Gagal mencari.\n${e?.response?.data?.error?.error || e.message}`);
    }
  }

  if (/^komikucancel$/i.test(command)) {
    if (conn.komikuReply?.[id]) { delete conn.komikuReply[id]; return m.reply('Sesi Komiku dibatalkan.'); }
    return m.reply('Tidak ada sesi aktif.');
  }
};

handler.command = handler.help = ['komiku','komikucancel'];
handler.tags = ['downloader'];
handler.premium = false;
handler.limit = false;

module.exports = handler;