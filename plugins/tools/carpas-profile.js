const { db } = require('../../lib/database.js');
const path = require('path'); 
const fs = require('fs').promises; 

let handler = async (m, { conn, text, usedPrefix, command }) => {
//  if (m.isGroup) return m.reply('Perintah ini hanya dapat digunakan di Chat Pribadi!');
  
  const sender = m.sender;
  
  // Tarik profil langsung dari Database SQL
  let profile = await db.carpas.findUnique({ where: { jid: sender } });
  
  if (!profile) return m.reply(`❌ Kamu belum buat profil. Ketik *${usedPrefix}addprofile* untuk memulai.`);

  const likes = profile.likes || 0;
  const dislikes = profile.dislikes || 0;

  let teks = `📄 *Profil Kamu:*\n` +
             `❤️ Disukai: ${likes} kali\n` + 
             `👎 Dilewati: ${dislikes} kali\n` + 
             `--------------------\n` + 
             `👤 Nama: ${profile.nama}\n` +
             `🎂 Umur: ${profile.umur}\n` +
             `👫 Gender: ${profile.gender === 'lk' ? 'Laki-laki' : 'Perempuan'}\n` +
             `📍 Lokasi: (Tersimpan)\n` +
             `💌 Catatan: ${profile.catatan}`;


       if (profile.media && typeof profile.media === 'string') {
    try {
      const mediaPath = path.join(process.cwd(), 'profile', profile.media);
      const mediaBuffer = await fs.readFile(mediaPath); 
      
      // Deteksi apakah file berupa Video atau GIF
      const isVideo = profile.media.endsWith('.mp4');
      const isGif = profile.media.endsWith('.gif');
      
      // Susun pesan Native Baileys
      let msgObj = isVideo || isGif 
        ? { video: mediaBuffer, caption: teks, gifPlayback: isGif }
        : { image: mediaBuffer, caption: teks };
        
      return await conn.sendMessage(m.chat, msgObj, { quoted: m });
      
    } catch (e) { 
        console.error("Gagal mengirim media profil:", e); 
        teks += `\n\n(Gagal memuat media profil: ${e.message})`; 
        return m.reply(teks);
    }
  }


  return m.reply(teks); 
}
 
handler.command = /^lihatprofile$/i;
handler.register = true;
//handler.private = true;

module.exports = handler;
