const { getUser } = require('../../lib/database.js');

let handler = async (m, { conn, usedPrefix }) => {
  if (m.isGroup) return; 
  
  // Gunakan state dari RAM
  global.carpasChatState = global.carpasChatState || {};
  const sender = m.sender;
  const state = global.carpasChatState[sender];

  if (!state) return;

  const text = m.text || '';
  const prefix = usedPrefix || '.';
  const isCommand = text.startsWith(prefix);
  
  if (isCommand && text.toLowerCase().endsWith('batalchat')) {
    delete global.carpasChatState[sender];
    return m.reply('Sesi chat dibatalkan.');
  }

  if (isCommand) return;
  
  try {
    const targetJid = state.target;
    const targetName = state.targetName;
    
    // Ambil nama pengirim dari database SQL
    let user = await getUser(sender);
    const senderName = m.pushName || (user ? user.name : 'Seseorang');

    let forwardText = `💌 *Pesan baru dari ${senderName}:*\n\n${text}`;
    await conn.reply(targetJid, forwardText, m); 

    await m.reply(`✅ Pesan terkirim ke *${targetName}*.\n\nJika dia membalas, pesannya akan langsung masuk ke chat kamu (bukan lewat bot lagi).`);

  } catch (e) {
    console.error(e);
    m.reply('Gagal mengirim pesan. Sesi chat dibatalkan.');
  } finally {
    // Hapus sesi chat dari RAM
    delete global.carpasChatState[sender];
  }
};

handler.before = handler; 
module.exports = handler;
