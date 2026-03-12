const session = require('./cgpt-session.js');
const { getUser } = require('../../lib/database');

let handler = async (m, { usedPrefix, command, conn, text }) => {
  conn.CGPTSession = conn.CGPTSession || {};
  const sender = m.sender;

  // Cek role pengguna dari database
  const user = await getUser(sender);
  if (!user) return m.reply('❌ Kamu belum terdaftar di database.');

  const isROwner = [global.conn.user.jid, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(sender);
  const isMods = isROwner || user.moderator;
  const isPrems = isROwner || (Number(user.premiumTime || 0) > Date.now());
  
  const ageOfAccount = user.regTime ? Date.now() - Number(user.regTime) : 0;
  const minAge = 7 * 24 * 60 * 60 * 1000; // 7 hari
  
  if ((!isMods && !isPrems) && ageOfAccount < minAge) {
    let sisa = minAge - ageOfAccount;
    let d = Math.floor(sisa / (1000 * 60 * 60 * 24));
    let h = Math.floor((sisa % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let mnt = Math.floor((sisa % (1000 * 60 * 60)) / (1000 * 60));
    return m.reply(`⚠️ Kamu belum bisa mengakses ChatGPT.\n\nMinimal umur akun: *7 hari*\nUmur akun kamu: *${d} hari ${h} jam ${mnt} menit*`);
  }

  // Tentukan allowed model berdasarkan role
  let allowedModels = [];
  if (isROwner) allowedModels = ['5-pro', '5', '5-mini', '5-nano', '4o', '4o-mini', '4.1', '4.1-mini', '4.1-nano'];
  else if (isMods) allowedModels = ['4o-mini', '4.1-mini', '4.1-nano'];
  else if (isPrems) allowedModels = ['4o-mini', '4.1-nano'];
  else allowedModels = ['4.1-nano'];
    
  let randomModel = allowedModels[Math.floor(Math.random() * allowedModels.length)];

  let inputRaw = text.trim().toLowerCase().split(/\s+/);
  let input = inputRaw[0]; 
  let isGroupMode = inputRaw[1] === 'grup'; 

  const getMod = session.getModel(conn, sender);
    
  if (!input) {
    if (getMod) {
      return m.reply(`ℹ️ Anda sedang berada pada sesi percakapan dengan ChatGPT model *${getMod}*!\nKetik *\`${usedPrefix + command} off\`* untuk menonaktifkan.`);
    }
    const available = allowedModels.map(v => `- ${v}`).join('\n');
    return m.reply(`⚠️ Model tidak boleh kosong.\nContoh: *\`${usedPrefix + command} ${randomModel}\`*\n\n💡 Model yang tersedia untuk Anda:\n${available}`);
  }

  // ✅ Kalau input = "off"
  if (input === 'off') {
    const groupModel = session.group.getModel(conn, m.chat);
    const isAdmin = global.owner.includes(m.sender.split('@')[0]);

    if (groupModel) {
      if (!isAdmin) return m.reply('❌ Hanya admin atau owner yang bisa menonaktifkan mode ChatGPT grup.');
      session.group.deactivate(conn, m.chat);
      return m.reply(`✅ Mode ChatGPT grup dimatikan.`);
    }

    if (!getMod) return m.reply('❌ Anda tidak berada dalam sesi percakapan dengan AI.');
    session.deactivate(conn, sender);
    return m.reply(`✅ ChatGPT model *${getMod}* dimatikan.`);
  }

  const allowed = ['5-pro', '5', '5-mini', '5-nano', '4o', '4o-mini', '4.1', '4.1-mini', '4.1-nano'];
  
  // 🔒 Blokir jika sudah ada sesi aktif di bot lain
  const allBots = [global.conn, ...(global.conns || [])];
  const activeBot = allBots.find(c => c.CGPTSession?.[sender] && c !== conn);
  
  // Jika grup sedang aktif ChatGPT, blokir sesi pribadi
  const groupModel = session.group.getModel(conn, m.chat);
  if (groupModel && !m.isGroup) {
    return m.reply(`❌ Tidak bisa mengaktifkan sesi pribadi karena *ChatGPT grup* sedang aktif di grup *${m.chat}*.`);
  }

  if (activeBot && activeBot !== conn) {
    const modelAktif = activeBot.CGPTSession[sender];
    const botJid = activeBot.user?.jid;
    const botNumber = botJid?.split('@')[0];
    await conn.sendMessage(m.chat, {
      text: `⚠️ Kamu sudah mengaktifkan ChatGPT model *${modelAktif}* di bot dengan nomor @${botNumber}. Nonaktifkan dulu sebelum mengaktifkan di sini.`,
      mentions: [botJid]
    }, { quoted: m });
      try {
        await activeBot.sendMessage(sender, {
           text: `👋 Kamu mencoba mengaktifkan ChatGPT dari bot lain.\n\nKetik *\`${usedPrefix + command} off\`* untuk menonaktifkan sesi saat ini.`,
        });
        return;
      } catch (e) {
        return console.error('Gagal kirim notif dari bot aktif:', e);
     }
  }

  if (!allowed.includes(input)) return m.reply(`Model tidak dikenal. Gunakan salah satu: ${allowed.join(', ')}`);
  
  // === MODE CHATGPT GRUP ===
  if (isGroupMode) {
    if (!m.isGroup) return m.reply('❌ Perintah *grup* hanya bisa digunakan di dalam grup.');
    
    const isAdmin = global.owner.includes(m.sender.split('@')[0]);
    if (!isAdmin) return m.reply('❌ Hanya owner yang bisa mengaktifkan mode ChatGPT grup.');

    // Matikan semua sesi pribadi aktif
    for (const bot of allBots) {
      if (bot.CGPTSession) {
        for (const sdr in bot.CGPTSession) {
          delete bot.CGPTSession[sdr];
        }
      }
    }

    // Aktifkan sesi grup
    session.group.activate(conn, m.chat, input);
    return m.reply(`✅ ChatGPT model *${input}* diaktifkan untuk grup ini.\nSemua anggota bisa berkomunikasi dengan ChatGPT di grup ini.\n\nKetik *${usedPrefix + command} off* untuk menonaktifkan.`);
  }

  // ✅ Cek apakah model ini sudah aktif
  if (getMod === input) return m.reply(`⚠️ Anda sedang menggunakan model yang sama.\nJika ingin menonaktifkan, ketik ${usedPrefix+command} off`);
  if (!allowedModels.includes(input)) return m.reply(`❌ Model *${input}* tidak diizinkan untuk role Anda.\nModel yang tersedia: ${allowedModels.join(', ')}`);

  session.activate(conn, sender, input);
  m.reply(`✅ ChatGPT model *${input}* diaktifkan. Silakan kirim pesan.\nJika ingin menonaktifkan, ketik *\`${usedPrefix+command} off\`*`);
};

handler.command = /^c(hat)?gpt$/i;
handler.tags = ['ai'];
handler.help = ['chatgpt'];
handler.register = true;

module.exports = handler;
