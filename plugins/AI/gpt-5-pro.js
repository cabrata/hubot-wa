// 📁 gpt-5-pro.js — sistem prompt + image_input + transkrip audio + reply support
const fs = require('fs');
const path = require('path');
const sistem = fs.readFileSync(path.join(__dirname, '../../hutao-prompt.txt'), 'utf-8');

const Replicate = require("replicate");
const { getUser } = require('../../lib/database'); // Integrasi Database Baru

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY || 'your-replicate-api-key-here'
});

module.exports = async ({ teks, media, mimetype, audioTranscription, quoted, sender, profileData }) => {
  global.chatHistory = global.chatHistory || {};
  const history = global.chatHistory[sender] = global.chatHistory[sender] || [];
  const maxHistoryLength = 16; // Lebih panjang karena ini versi PRO

  // 1. Persiapan Prompt dan Info Tambahan
  let replyInfo = '';
  if (quoted) {
    const replyText = quoted.text || quoted.caption || '[media tanpa teks]';
    const q = replyText.slice(0, 200);
    replyInfo = quoted.fromMe
      ? `Pengguna sedang mereply pesan anda: "${q}"\n`
      : `Pengguna sedang mereply pesan pengguna lain: "${q}"\n`;
  }

  const transkrip = audioTranscription ? `\n\n[Transkripsi Audio]: ${audioTranscription}\n\n#Jika anda merasa itu adalah sebuah lagu, beri tahu saya untuk menggunakan fitur #whatmusic untuk mengetahui lagu apa itu` : '';
  const userPrompt = `${replyInfo}${teks || ''}${transkrip}`.trim();

  // 2. Data Pengguna dan Penentuan Akses
  let user = await getUser(sender);
  if (!user) return '[❌] Pengguna tidak terdaftar di database.';

  let atmin = ['6282153017890', '6287787293078', '6281910091919'];
  let isAdmin = atmin.includes(sender.split('@')[0]);
  let isROwner = isAdmin || global.owner.includes(sender.split('@')[0]);
  let isMods = !!user.moderator;
  let isPrems = (Number(user.premiumTime || 0) > Date.now());
  let isTimS = !!user.timSupport;
  
  let sosmedList = (user.sosmed && Array.isArray(user.sosmed) && user.sosmed.length > 0)
    ? user.sosmed.map(s => `- ${s.platform}: ${s.username}`).join('\n') : 'Tidak ada data';
      
  let dataUs = `
*DATA PUBLIK PENGGUNA*
(Hanya digunakan untuk menyapa, personalisasi respons, atau jika pengguna bertanya tentang dirinya.)
*INSTRUKSI PROAKTIF*: SELALU sapa pengguna menggunakan Nama. Gunakan Role/Level mereka untuk menyesuaikan intonasi/kecepatan.

Username: ${user.name || 'User'}
Umur: ${user.age || '?'} tahun
Role Bot: ${isAdmin ? 'Admin' : isROwner ? 'Owner' : isMods ? 'Moderator' : isTimS ? 'Tim support' : isPrems ? 'Premium' : 'User biasa'}
Sosmed:
${sosmedList}
${user.registered ? 
`
*DATA RPG* (Bukan Data Real Life)
Role RPG: ${user.role || '-'}
Level: ${user.level || 0}
Limit: ${user.limit || 0}
Money: ${user.money || 0}
Saldo ATM: ${user.bank || 0}` : ''}
`.trim();

  // 3. Update Riwayat dan Batasi Panjangnya
  history.push({ role: 'user', content: userPrompt });

  if (history.length > maxHistoryLength) {
      history.splice(0, history.length - maxHistoryLength);
  }
  
  // 4. Struktur Input Menggunakan 'messages'
  const systemMessage = {
      role: 'system',
      content: `${sistem}\n\n${dataUs}`.trim()
  };

  const messagesInput = [
      systemMessage,
      ...history
  ];
  
  const input = {
    messages: messagesInput, 
    max_completion_tokens: 4096, 
    // Parameter LLM lain disesuaikan sesuai kebutuhan model Pro
  };
  
  if (media && mimetype?.startsWith('image/')) {
    input.image_input = [media];
  }

  // 5. Eksekusi Model dan Penanganan Error
  let result = '';
  try {
    for await (const event of replicate.stream("openai/gpt-5-pro", { input })) {
      result += event.toString();
    }
  } catch (e) {
       if (e.message.includes('limit reached')) {
          throw 'Kode authentikasi tersebut sudah mencapai limit output, silahkan laporkan ke admin';
        } else {
          console.error('[REPLICATE STREAM ERROR]', e); 
          return '[❌] Gagal mendapatkan respons dari gpt-5-pro\n' + e.message; 
       }
  }

  // 6. Simpan Respons dan Bersihkan Riwayat
  history.push({ role: 'assistant', content: result.trim() });
  
  if (history.length > maxHistoryLength) { 
      history.splice(0, history.length - maxHistoryLength);
  }

  return result.trim() || '[❌] Tidak ada respons dari gpt-5-pro';
};
