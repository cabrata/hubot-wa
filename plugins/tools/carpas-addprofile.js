const { getUser } = require('../../lib/database.js')

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.isGroup) return m.reply('Perintah ini hanya dapat digunakan di Chat Pribadi!');
  if (conn.user.jid !== global.conn.user.jid) return m.reply(`Gunakan perintah ini di bot utama agar privasi anda tetap aman!\nBot utama: wa.me/${global.conn.user.jid.split('@')[0]}${usedPrefix+command}`)
  
  // Gunakan memory lokal (RAM) untuk state sementara
  global.carpasProfileState = global.carpasProfileState || {};

  const sender = m.sender;
  const user = await getUser(sender);
  
  // Mengambil umur dari database core (Prisma)
  if (!user || user.age <= 0) return m.reply(`Anda harus mengisi umur anda untuk menggunakan fitur ini!\n\nKetik ${usedPrefix}setage`);
  
  delete global.carpasProfileState[sender];

  await m.reply(
    `👫 *Pembuatan Profil Dimulai*\n\nLangkah 1: Tentukan gender kamu.\n\nKetik:\n*${usedPrefix}gender lk* (untuk Laki-laki)\n*${usedPrefix}gender pr* (untuk Perempuan)\n\nNote: kami sangat menghargai privasi anda, kami telah membuat database SQL khusus untuk profile cari pasangan agar data anda aman.`
  );

  global.carpasProfileState[sender] = { 
    step: 'awaiting_gender', 
    profile: { 
      nama: user.name || m.pushName, 
      umur: Number(user.age) 
    } 
  };
};

handler.command = /^addprofile$/i;
handler.register = true;
handler.private = true;

module.exports = handler;
