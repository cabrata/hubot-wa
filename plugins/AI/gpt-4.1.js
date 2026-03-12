const fs = require('fs');
const path = require('path');
const Replicate = require("replicate");
const { getUser } = require('../../lib/database'); // Integrasi Database Baru

const replicate = new Replicate({
  auth: 'r8_Q9KTtcsaZCKAf0N8akpfW9f5HEnr8X52Icqqd'
});

module.exports = async ({ teks, media, mimetype, audioTranscription, quoted, sender }) => {
  global.chatHistory = global.chatHistory || {};
  const history = global.chatHistory[sender] = global.chatHistory[sender] || [];
  
  // 1. Data Pengguna dan Parameter
  let user = await getUser(sender);
  if (!user) return '[❌] Pengguna tidak terdaftar di database.';

  let atmin = ['6282153017890', '6287787293078', '6281910091919']
  let isAdmin = atmin.includes(sender.split('@')[0]);
  let isROwner = isAdmin || global.owner.includes(sender.split('@')[0]);
  let isMods = !!user.moderator;
  let isPrems = (Number(user.premiumTime || 0) > Date.now());
  let isTimS = !!user.timSupport;
    
  let sosmedList = (user.sosmed && Array.isArray(user.sosmed) && user.sosmed.length > 0)
    ? user.sosmed.map(s => `- ${s.platform}: ${s.username}`).join('\n') : 'Tidak ada data'
      
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
`.trim() 
  
  const promptFile = 'hutao-prompt.txt';
  const sistem = fs.readFileSync(path.join(__dirname, `../../${promptFile}`), 'utf-8');
  let maxHist, maxToken, temp, topP;

  if (isROwner) {
    maxHist = 14; maxToken = 4096; temp = 1; topP = 1;
  } else if (isMods) { 
    maxHist = 5; maxToken = 512; temp = 0.4; topP = 0.4;
  } else {
    maxHist = 3; maxToken = 256; temp = 0.2; topP = 0.2;
  }
  const maxHistoryLength = maxHist; 

  // 2. Pembentukan User Prompt
  let replyInfo = '';
  if (quoted) {
    const replyText = quoted.text || quoted.caption || '[media tanpa teks]';
    const q = replyText.slice(0, 200);
    replyInfo = quoted.fromMe
      ? `Pengguna sedang mereply pesan anda: "${q}"\n`
      : `Pengguna sedang mereply pesan pengguna lain: "${q}"\n`;
  }

  const transkrip = audioTranscription
    ? `\n\n[Transkripsi Audio]: ${audioTranscription}\n\n#Jika anda merasa itu adalah sebuah lagu, harap beri tahu saya gunakan fitur #whatmusic untuk mengetahui lagu apa itu`
    : ''; 

  const userPrompt = `${replyInfo}${teks || ''}${transkrip}`.trim();

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

  const messagesInput = [systemMessage, ...history];

  const input = {
    messages: messagesInput, 
    temperature: temp,
    top_p: topP,
    max_completion_tokens: maxToken,
    frequency_penalty: 0,
    presence_penalty: 0
  };

  if (media && mimetype?.startsWith('image/')) {
    input.image_input = [media];
  }

  // 5. Eksekusi Model dan Penanganan Error
  let result = '';
  try {
    for await (const event of replicate.stream("openai/gpt-4.1", { input })) {
      result += event.toString();
    }
  } catch (e) { 
    if (e.message.includes('limit reached')) {
      throw 'Kode authentikasi tersebut sudah mencapai limit output, silahkan laporkan ke admin';
    } else {
      console.error('[REPLICATE STREAM ERROR]', e);
      return '[❌] Gagal mendapatkan respons dari GPT-4.1\n' + e.message;
    }
  }

  // 6. Simpan Respons dan Bersihkan Riwayat
  history.push({ role: 'assistant', content: result.trim() });
  
  if (history.length > maxHistoryLength) { 
      history.splice(0, history.length - maxHistoryLength);
  }

  return result.trim() || '[❌] Tidak ada respons dari GPT-4.1';
};
