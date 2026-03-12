// Removed genius-lyrics import
const axios = require('axios');
const html = require("node-html-parser").default;


let handler = async (m, { text, usedPrefix, command }) => {
  if (!text) throw `Mau nyari apaan bang?
Cara penggunaan:
${usedPrefix + command} <query>
Contoh:
${usedPrefix + command} blue yung kai`

  await m.reply("Tunggu sebentar...");
  // Fungsi untuk mendapatkan lirik dari halaman Genius
  async function getLyrics(url) {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://www.google.com/'
      };

      // Ambil HTML
      const response = await axios.get(url, { headers });
      const root = html(response.data);

      // 1. HAPUS SEMUA METADATA / TEKS SAMPAH
      // Genius menandai teks "Contributors", "Translations", dll dengan atribut ini
      root.querySelectorAll('[data-exclude-from-selection="true"]').forEach(el => {
        el.remove();
      });

      // Cari container lirik
      const lyricsContainers = root.querySelectorAll("[data-lyrics-container='true']");

      if (!lyricsContainers || lyricsContainers.length === 0) {
        throw new Error("Lyrics container not found");
      }

      // 2. AMBIL DAN GABUNGKAN TEKS
      let rawLyrics = lyricsContainers.map(container => {
        // Ubah <br> menjadi enter
        container.querySelectorAll("br").forEach(br => {
          br.replaceWith(new html.TextNode("\n"));
        });
        return container.text;
      }).join("\n\n"); // Gabungkan antar kontainer dengan enter

      // 3. PEMBERSIHAN STRING FINAL (Membasmi spasi unicode & enter berlebih)
      const cleanLyrics = rawLyrics
        .replace(/[^\S\r\n]+/g, ' ') // Ubah spasi aneh/unicode (seperti &ThickSpace;) menjadi spasi spasi biasa
        .split('\n')                 // Pecah per baris
        .map(line => line.trim())    // Bersihkan spasi nakal di awal/akhir tiap baris
        .join('\n')                  // Gabungkan kembali
        .replace(/\n{3,}/g, '\n\n')  // Jika ada 3 enter (atau lebih) berturut-turut, jadikan 2 enter saja
        .trim();                     // Bersihkan enter kosong di paling atas dan paling bawah hasil akhir

      return cleanLyrics;

    } catch (error) {
      console.error("Error fetching lyrics:", error.message);
      return null;
    }
  }

  let { data } = await axios.post("https://api.genius.com/oauth/token", { client_id: "gBs3JkLx9L5tT-ddmC2IMIrHpKANvDl332B6JqwCsukyTXKfCAHXGvFPcDSwgWeM", client_secret: "l2ZQSu6JIJOi8wVTyojD5BxAEkGwJRu4pHLCJ_CKdyzXVd0wxIGTu1Q9vZI91xe4mIsSuVNTXqdNpAOVAoj-jQ", grant_type: "client_credentials" })

  const token = data.access_token;

  let searchRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(text)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.data || !searchRes.data.response || !searchRes.data.response.hits || searchRes.data.response.hits.length === 0) {
    throw `Maaf, lirik untuk lagu "${text}" tidak ditemukan.`
  }

  let songUrl = searchRes.data.response.hits[0].result.url;
  console.log(songUrl)

  let liriks = await getLyrics(songUrl)

  if (!liriks) throw `Lirik ditemukan namun gagal diambil dari web Genius.`

  return m.reply(liriks)
}

handler.help = ['lirik <query>']
handler.command = ['lirik', 'lyric']
handler.tags = ['internet', 'tools']

module.exports = handler