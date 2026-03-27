const { getUser } = require('../../lib/database.js')

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.isGroup) return m.reply('Perintah ini hanya dapat digunakan di Chat Pribadi!'); 

  // Pindahkan state session ke global variable (Memory)
  global.carpasChatState = global.carpasChatState || {};
  const sender = m.sender;

  if (command === 'batalchat') {
    if (global.carpasChatState[sender]) {
      delete global.carpasChatState[sender];
      return m.reply('Sesi chat dibatalkan.');
    } else {
      return m.reply('Tidak ada sesi chat yang sedang berlangsung.');
    }
  }

  let targetJid = text.trim();
  if (!targetJid.endsWith('@s.whatsapp.net')) {
    targetJid += '@s.whatsapp.net';
  }

  if (!targetJid) return m.reply(`Format salah. Gunakan ${usedPrefix}chat 628123456789`);

  // Tarik nama target dari Database
  let targetUser = await getUser(targetJid);
  let targetName = targetUser ? targetUser.name : (await conn.getName(targetJid));

  if (!targetName) return m.reply('❌ User tidak ditemukan.');

  try {
    global.carpasChatState[sender] = {
      target: targetJid,
      targetName: targetName,
      timestamp: Date.now()
    };

    await m.reply(`💬 Kamu akan mengirim pesan pertama ke *${targetName}*.\n\nKetik 1 pesan yang ingin kamu kirim. Pesan akan langsung diteruskan.\n\n(Ketik *${usedPrefix}batalchat* untuk membatalkan)`);
    
  } catch (e) {
    console.error(e);
    m.reply('Gagal memulai sesi chat.');
    delete global.carpasChatState[sender];
  }
};

//handler.command = /^chat|batalchat$/i; 
handler.register = true;
handler.private = true;

module.exports = handler;
