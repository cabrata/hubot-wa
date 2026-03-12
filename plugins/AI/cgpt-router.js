const { getModel, group, checkLimit } = require('./cgpt-session');
const { getUser, updateUser } = require('../../lib/database');
const gpt4o = require('./gpt-4o.js');
const gpt4omini = require('./gpt-4o-mini.js');
const gpt41 = require('./gpt-4.1.js');
const gpt41mini = require('./gpt-4.1-mini.js');
const gpt41nano = require('./gpt-4.1-nano.js');
const gpt5pro = require('./gpt-5-pro.js');
const gpt5 = require('./gpt-5.js');
const gpt5mini = require('./gpt-5-mini.js');
const gpt5nano = require('./gpt-5-nano.js');
const uploadFile = require('../../lib/uploadFile.js');
const uploadFile2 = require('../../lib/uploadUguu.js');
const uploadFile3 = require('../../lib/uploadFileIO.js');
const Replicate = require("replicate");

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY || 'your-replicate-api-key-here'
});

const ignoredMTypes = [
  'liveLocationMessage', 'locationMessage', 'contactMessage',
  'pollCreationMessageV3', 'eventMessage', 'productMessage',
  'interactiveMessage', 'groupInviteMessage'
];

let handler = m => m;

handler.all = async function (m) {
  if (m.chat.includes('newsletter')) return;
  const conn = this;
  if (!conn || m.isBaileys || m.fromMe) return;

  const isCommand = /^[xzXZ/!#$%+£¢¥°=¶†×÷€√“©®:;?.\\\-]/.test(m.text || '');
  if (isCommand) return;

  conn.CGPTSession = conn.CGPTSession || {};
  conn.CGPTGroupSession = conn.CGPTGroupSession || {};

  const allowed = ['5-pro', '5', '5-mini', '5-nano', '4o', '4o-mini', '4.1', '4.1-mini', '4.1-nano'];

  const isGroup = m.isGroup || m.chat.endsWith('@g.us');
  const groupModel = group.getModel(conn, m.chat);
  const privateModel = getModel(conn, m.sender);

  // ===== PRIORITAS MODEL =====
  let model = null;
  if (isGroup && groupModel) {
    model = groupModel;
  } else if (privateModel) {
    model = privateModel;
  }

  // OPTIMASI: Abaikan dan JANGAN query ke database jika tidak ada sesi AI aktif!
  if (!model || typeof model !== 'string' || !allowed.includes(model)) return;

  // Jika sampai sini, berarti ada interaksi AI. Baru panggil Database!
  const userData = await getUser(m.sender);
  if (!userData) return;

  // Cek limit untuk sesi pribadi
  if (!isGroup || !groupModel) {
    const isROwner = [conn.user.jid, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
    const limitCheck = checkLimit(userData, model, isROwner);
    
    if (!limitCheck.allowed) return m.reply(limitCheck.reason);
    
    // Save/Update limit usage ke database SQL
    await updateUser(m.sender, { chatgpt: limitCheck.updatedChatgpt });
  }

  const teks = m.text?.trim() || m.caption?.trim() || '';
  if (!teks && !m.mimetype && !m.msg?.url) return;
  if (ignoredMTypes.includes(m.mtype))
    return m.reply('⚠️ Maaf, jenis pesan ini tidak bisa diproses oleh AI.');

  let media = null;
  let mimetype = m.mimetype || m.msg?.mimetype || m.quoted?.mimetype || null;
  let audioTranscription = null;

  // ===== UPLOAD MEDIA =====
  if (m.msg?.url) {
    await m.react("⌛");

    const withTimeout = (promise, ms, errorMsg = 'Upload timeout') => {
      const timer = new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms));
      return Promise.race([promise, timer]);
    };

    const UPLOAD_TIMEOUT = 2000; // 2 detik
    let url;

    try {
      const q = m.quoted || m;
      const buffer = await q.download();

      let ext = 'bin'; 
      if (mimetype) {
        const parts = mimetype.split('/');
        if (parts.length === 2) {
          ext = parts[1];
          if (ext === 'jpeg') ext = 'jpg';
          if (ext === 'ogg; codecs=opus') ext = 'ogg'; 
        }
      }

      const uploaders = [
        { fn: () => uploadFile(buffer), name: 'uploadFile' },
        { fn: () => uploadFile2(buffer), name: 'uploadFile2' },
        { fn: () => uploadFile3(buffer, ext), name: 'uploadFile3' }
      ];

      let lastError = null;

      for (const uploader of uploaders) {
        try {
          url = await withTimeout(uploader.fn(), UPLOAD_TIMEOUT, `Timeout ${uploader.name}`);
          if (url) {
            lastError = null; 
            break; 
          }
        } catch (e) {
          lastError = e; 
        }
      }

      if (!url || lastError) throw lastError || new Error('Semua uploader gagal mendapatkan URL.');
      media = url;

      if (mimetype?.startsWith('audio/')) {
        try {
          const out = await replicate.run("vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c", {
            input: { audio: url, batch_size: 64 }
          });
          audioTranscription = out?.text || null;
        } catch (err) {
          console.error('[WHISPER ERROR]', err);
        }
      }

    } catch (e) {
      await m.react("❌");
      return m.reply('Gagal memproses media: ' + (e.message || 'Error tidak diketahui'));
    }
  }

  const input = {
    teks, media, mimetype,
    quoted: m.quoted || null,
    sender: m.sender, audioTranscription
  };
   
  // ===== PROSES MODEL =====
  let result;
  await m.react("⌛");
  try {
    if (model === '4o') result = await gpt4o(input);
    else if (model === '4o-mini') result = await gpt4omini(input);
    else if (model === '4.1') result = await gpt41(input);
    else if (model === '4.1-mini') result = await gpt41mini(input);
    else if (model === '4.1-nano') result = await gpt41nano(input);
    else if (model === '5-pro') result = await gpt5pro(input);
    else if (model === '5') result = await gpt5(input);
    else if (model === '5-mini') result = await gpt5mini(input);
    else if (model === '5-nano') result = await gpt5nano(input);
  } catch (e) {
    console.error('[GPT ERROR]', e);
    result = '[❌] Terjadi kesalahan: ' + e.message;
  }

  await m.react("");
  if (result) await m.reply(result);
};

module.exports = handler;
