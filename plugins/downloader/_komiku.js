// plugins/komiku_before.js
const {
  getMangaDetail,
  renderChapterListAll_NoIndex,
  downloadAndSend,
  sendLongText
} = require('../../lib/scraper/komiku');

let handler = m => m;

handler.before = async function (m, { conn }) {
  conn.komikuReply = conn.komikuReply || {};
  const id = m.chat;
  const s = conn.komikuReply[id];
  if (!s) return !0;

  // <--- MODIFIKASI DIMULAI ---
  // Jika sesi ada, tapi pengirim pesan BUKAN
  // pengguna yang memulai sesi (s.user), abaikan pesan ini.
  if (s.user && s.user !== m.sender) return !0;
  // <--- MODIFIKASI SELESAI ---

  const T = (m.text || '').trim();
  const isNext = /^next$/i.test(T);
  const isPrev = /^prev$/i.test(T);
  const isNum  = /^\d+(\.\d+)?$/.test(T); // ini yang dipakai untuk chapter

  const isReplyToBot = !!(m.quoted && m.quoted.key.fromMe);

  // ===== Pencarian komik: pilih / next / prev =====
  if (s.step === 'pick_manga') {
    const replyingSearchList = isReplyToBot && m.quoted.key.id === s.lastSearchMsgId;

    // pilih manga (angka urut hasil pencarian) — hanya jika reply ke daftar search
    if (replyingSearchList && /^\d+$/.test(T)) {
      const idx = parseInt(T,10) - 1;
      const arr = s.results?.data || [];
      if (!(idx>=0 && idx<arr.length)) return m.reply('Nomor tidak valid.');
      const pick = arr[idx];

      try {
        await m.reply(global.wait || 'Ambil detail manga…');
        const detail = await getMangaDetail(pick.param);
        s.step = 'pick_chapter';
        s.detail = detail;
        s.picked = pick;

        // kirim SEMUA chapter TANPA nomor urut (auto-split bila panjang)
        const msgText = renderChapterListAll_NoIndex(detail);
        const sentMsgs = await sendLongText(conn, m.chat, msgText, m);
        s.lastChapterMsgIds = sentMsgs.map(x => x.key.id); // simpan semua id pesan daftar
        return !0;
      } catch(e){
        console.error(e);
        return m.reply(`Gagal mengambil detail.\n${e?.response?.data?.error?.error || e.message}`);
      }
    }

    // navigasi hasil pencarian
    if (replyingSearchList && (isNext || isPrev)) {
      try {
        const navUrl = isNext ? s.results?.next_page : s.results?.prev_page;
        if (!navUrl) return m.reply(isNext ? 'Tidak ada halaman berikut.' : 'Tidak ada halaman sebelumnya.');
        const { data: res } = await require('axios').get(navUrl);
        s.results = res;
        s.page = Math.max(1, (s.page||1) + (isNext ? 1 : -1));
        const { renderSearchList } = require('../lib/komikuCore');
        const msgText = renderSearchList(s.query, res);
        const sent = await conn.sendMessage(m.chat, { text: msgText }, { quoted: m });
        s.lastSearchMsgId = sent.key.id;
        return !0;
      } catch(e){
        console.error(e);
        return m.reply(`Gagal membuka halaman.\n${e?.response?.data?.error?.error || e.message}`);
      }
    }
  }

  // ===== Pilih chapter: HANYA via nomor chapter asli (61 / 60.5) =====
  if (s.step === 'pick_chapter' && isNum) {
    // boleh reply ke daftar chapter manapun, atau kirim pesan baru (tidak wajib reply)
    const want = T;
    const found = (s.detail.data?.chapters || []).find(c => c.chapter === want);
    if (!found) return m.reply(`Chapter ${want} tidak ditemukan.`);
    try {
      await downloadAndSend(conn, m, s, found);
    } catch(e){
      console.error(e);
      return m.reply(`Gagal mengambil chapter.\n${e?.message || e}`);
    }
    return !0;
  }

  return !0;
};

module.exports = handler;