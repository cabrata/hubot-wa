const { db } = require('../../lib/database.js');
const path = require('path'); 
const fs = require('fs').promises; 

const distance = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some(coord => typeof coord !== 'number' || isNaN(coord))) {
      return Infinity; 
  }
  let R = 6371;
  let dLat = (lat2 - lat1) * Math.PI / 180;
  let dLon = (lon2 - lon1) * Math.PI / 180;
  let a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let result = R * c;
  return isNaN(result) ? Infinity : result;
};

let handler = async (m, { conn, text, usedPrefix, command, isROwner }) => {
  if (m.isGroup) return m.reply('Perintah ini hanya dapat digunakan di Chat Pribadi!');
  if (m.fromMe) return;
  if (!isROwner && conn.user.id === global.conn.user.id) return m.reply('Fitur ini hanya dapat digunakan di bot clone')
  global.carpasLastPair = global.carpasLastPair || {};
  const sender = m.sender;

  if (command === 'caripasangan' || command === 'carpas') {
    let userProfile = await db.carpas.findUnique({ where: { jid: sender } });

    if (!userProfile || !userProfile.gender || !userProfile.lat || !userProfile.lon || !userProfile.media) { 
        return m.reply(`❌ Profil kamu belum lengkap...\nSilakan ketik ${usedPrefix}addprofile`); 
    }
    if (!userProfile.umur || userProfile.umur < 1) { 
        return m.reply(`Umur di profil kamu belum tersetting...`); 
    }
    if (typeof userProfile.lat !== 'number' || typeof userProfile.lon !== 'number') { 
        return m.reply(`Lokasi di profil kamu tidak valid. Silakan ${usedPrefix}addprofile ulang.`);
    }
    
    let allProfiles = await db.carpas.findMany();
    let lawanGender = userProfile.gender === 'lk' ? 'pr' : 'lk';
    
    let seen = userProfile.seen ? JSON.parse(typeof userProfile.seen === 'string' ? userProfile.seen : JSON.stringify(userProfile.seen)) : [];
    let blacklist = userProfile.blacklist ? JSON.parse(typeof userProfile.blacklist === 'string' ? userProfile.blacklist : JSON.stringify(userProfile.blacklist)) : {};
    
    const startOfTodayTimestamp = new Date().setHours(0, 0, 0, 0);

    let filterFunc = (p) => { 
        const blEntry = blacklist[p.jid]; 
        const isBlacklisted = blEntry && blEntry >= startOfTodayTimestamp; 
        return p.jid !== sender && 
               p.gender === lawanGender && 
               typeof p.lat === 'number' && typeof p.lon === 'number' && 
               p.media && typeof p.media === 'string' && 
               p.umur && p.umur > 0 && 
               !isBlacklisted; 
    };

    const getAllKandidat = (seenFilter) => {
        return allProfiles
            .filter(filterFunc) 
            .filter(seenFilter) 
            .map(p => {
                const jarak = distance(userProfile.lat, userProfile.lon, p.lat, p.lon);
                const likes = p.likes || 0;
                
                if (!isFinite(jarak)) { 
                    return { id: p.jid, ...p, jarak: Infinity, likes: -1 }; 
                }
                return { id: p.jid, ...p, jarak, likes }; 
            });
    };

    let kandidat = getAllKandidat(p => !seen.includes(p.jid));

    if (!kandidat.length) {
       seen = []; 
       kandidat = getAllKandidat(p => true); 
       if (!kandidat.length) return m.reply("❌ Tidak ada pasangan tersedia (database profil kosong)..."); 
    }

    kandidat = kandidat.filter(k => isFinite(k.jarak) && k.likes >= 0);
    if (!kandidat.length) return m.reply("❌ Tidak ada pasangan valid yang bisa ditampilkan saat ini (semua skor tidak valid). Coba lagi nanti.");

    kandidat.sort((a, b) => {
        if (a.likes !== b.likes) return b.likes - a.likes; 
        return a.jarak - b.jarak; 
    });

    let pasangan = kandidat[0];
    seen.push(pasangan.id);
    
    await db.carpas.update({
        where: { jid: sender },
        data: { seen: JSON.stringify(seen) }
    });

    let teks = `💘 *Pasangan Paling Populer (❤️ ${pasangan.likes}):*\n` + 
               `👤 Nama: ${pasangan.nama}\n` +
               `🎂 Umur: ${pasangan.umur}\n` +
               `👫 Gender: ${pasangan.gender === 'lk' ? 'Laki-laki' : 'Perempuan'}\n` +
               `📍 Jarak: ${pasangan.jarak.toFixed(2)} km\n` +
               `💌 Catatan: ${pasangan.catatan}\n\n` +
               `*React pada pesan ini:*\n` +
               `❤️ = Suka\n` +
               `💌 = Kirim Pesan Pertama\n` +
               `👎 = Lewati`;
    
    try {
        if (!pasangan.media) throw new Error('Media pasangan tidak valid.');
        const mediaPath = path.join(process.cwd(), 'profile', pasangan.media);

        const mediaBuffer = await fs.readFile(mediaPath);
        const isVideo = pasangan.media.endsWith('.mp4');
        const isGif = pasangan.media.endsWith('.gif');
        
        let msgObj = isVideo || isGif 
            ? { video: mediaBuffer, caption: teks, gifPlayback: isGif }
            : { image: mediaBuffer, caption: teks };
            
        let sentMsg = await conn.sendMessage(m.chat, msgObj, { quoted: m });
        global.carpasLastPair[sender] = { id: pasangan.id, key: sentMsg.key };
        
    } catch (e) { 
        console.error("Gagal mengirim media pasangan:", e);
        m.reply(`Gagal memuat media pasangan (${pasangan.nama}). Melewati profil ini...\nError: ${e.message}`); 
        
        blacklist[pasangan.id] = Date.now();
        await db.carpas.update({
            where: { jid: sender },
            data: { blacklist: JSON.stringify(blacklist) }
        });

        return handler(m, { conn, text, usedPrefix, command: 'caripasangan' }); 
    }
  }
};

handler.command = ['caripasangan', 'carpas']
handler.tags = ['carpas']
handler.tags = ['main'];
handler.register = true;
handler.private = true;

module.exports = handler;
