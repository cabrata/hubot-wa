const { db } = require('../../lib/database.js');
const path = require('path'); 
const fs = require('fs').promises; 

const distance = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some(coord => typeof coord !== 'number' || isNaN(coord))) return Infinity; 
  let R = 6371;
  let dLat = (lat2 - lat1) * Math.PI / 180;
  let dLon = (lon2 - lon1) * Math.PI / 180;
  let a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let result = R * c;
  return isNaN(result) ? Infinity : result; 
};

async function findNextPartner(conn, m, usedPrefix) {
    const sender = m.sender;
    global.carpasLastPair = global.carpasLastPair || {};

    let userProfile = await db.carpas.findUnique({ where: { jid: sender } });
    if (!userProfile || !userProfile.gender || !userProfile.lat || !userProfile.lon || !userProfile.media) { return conn.reply(m.chat, `❌ Profil kamu belum lengkap...`, m); }
    if (!userProfile.umur || userProfile.umur < 1) { return conn.reply(m.chat, `Umur di profil kamu belum tersetting...`, m); }
    if (typeof userProfile.lat !== 'number' || typeof userProfile.lon !== 'number') { return conn.reply(m.chat, `Lokasi di profil kamu tidak valid. Silakan .addprofile ulang.`, m);}

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
        return allProfiles.filter(filterFunc).filter(seenFilter).map(p => {
                const jarak = distance(userProfile.lat, userProfile.lon, p.lat, p.lon);
                const likes = p.likes || 0;
                if (!isFinite(jarak)) return { id: p.jid, ...p, jarak: Infinity, likes: -1 }; 
                return { id: p.jid, ...p, jarak, likes }; 
            });
    };
    
    let kandidat = getAllKandidat(p => !seen.includes(p.jid));

    if (!kandidat.length) {
        seen = []; 
        kandidat = getAllKandidat(p => true); 
        if (!kandidat.length) return conn.reply(m.chat, "👍 Kamu sudah melihat/melewati semua (tidak ada profil tersedia).", m); 
    }
    
    kandidat = kandidat.filter(k => isFinite(k.jarak) && k.likes >= 0);
    if (!kandidat.length) return conn.reply(m.chat, "👍 Tidak ada pasangan valid yang bisa ditampilkan saat ini.", m);
    
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
        blacklist[pasangan.id] = Date.now();
        await db.carpas.update({ where: { jid: sender }, data: { blacklist: JSON.stringify(blacklist) } });
        return findNextPartner(conn, m, usedPrefix); 
    }
}

let handler = async (m, { conn, usedPrefix }) => {
  if (!m.message || !m.message.reactionMessage || m.isGroup || m.fromMe) return;

  const reaction = m.message.reactionMessage.text;
  const msgKey = m.message.reactionMessage.key;
  const sender = m.sender;

  global.carpasLastPair = global.carpasLastPair || {};
  const lastPair = global.carpasLastPair[sender];

  if (!lastPair || msgKey.id !== lastPair.key.id) return; 

  const idTarget = lastPair.id;

  let pengirim = await db.carpas.findUnique({ where: { jid: sender } });
  let targetProfile = await db.carpas.findUnique({ where: { jid: idTarget } }); 

  if (!pengirim || !targetProfile) { 
    delete global.carpasLastPair[sender]; 
    return m.reply('❌ Profil pengirim atau target tidak ditemukan (mungkin sudah dihapus).'); 
  }

  delete global.carpasLastPair[sender];
  let findNext = true; 
  
  try {
    let pengirimBlacklist = pengirim.blacklist ? JSON.parse(typeof pengirim.blacklist === 'string' ? pengirim.blacklist : JSON.stringify(pengirim.blacklist)) : {};

    switch (reaction) {
      case '❤️': { 
        await db.carpas.update({
            where: { jid: idTarget },
            data: { likes: { increment: 1 } }
        });
        
        let pesanUntukTarget = `💘 *Ada seseorang menyukai profil kamu!*\n\nIni profilnya:\n👤 Nama: ${pengirim.nama}\n🎂 Umur: ${pengirim.umur}\n👫 Gender: ${pengirim.gender === 'lk' ? 'Laki-laki' : 'Perempuan'}\n💌 Catatan: ${pengirim.catatan}\n\nKetik *#chat ${sender.split('@')[0]}* untuk memulai obrolan!`;
        
        try { 
          await conn.sendMessage(idTarget, { text: pesanUntukTarget }); 
          await m.reply(`❤️ *Like terkirim!* (+1 Suka). Mencari pasangan selanjutnya...`); 
        } catch (e) { 
          await m.reply(`⚠️ *Like terkirim, TAPI* gagal mengirim notifikasi. Mencari pasangan selanjutnya...`); 
        } 
        
        pengirimBlacklist[idTarget] = Date.now();
        await db.carpas.update({ where: { jid: sender }, data: { blacklist: JSON.stringify(pengirimBlacklist) } });
        break; 
      }
      
      case '💌': { 
        global.carpasChatState = global.carpasChatState || {}; 
        global.carpasChatState[sender] = { target: idTarget, targetName: targetProfile.nama, timestamp: Date.now() }; 
        await m.reply(`💬 Kamu akan mengirim pesan pertama kepada *${targetProfile.nama}*. Ketik pesanmu sekarang.\n\n(Ketik *batal* untuk membatalkan)`); 
        findNext = false; 
        break; 
      }
      
      case '👎': { 
        await db.carpas.update({
            where: { jid: idTarget },
            data: { dislikes: { increment: 1 } }
        });
        
        pengirimBlacklist[idTarget] = Date.now();
        await db.carpas.update({ where: { jid: sender }, data: { blacklist: JSON.stringify(pengirimBlacklist) } });
        await m.reply(`👎 Profil dilewati & diblacklist (+1 Tidak Suka). Mencari pasangan selanjutnya...`); 
        break; 
      }
      
      default: { 
        findNext = false; 
      }
    }

  } catch (e) { 
    console.error('Error saat memproses reaksi:', e); 
    await m.reply(`⚠️ Terjadi error saat memproses reaksimu.`); 
  }

  if (findNext) { 
    try { 
      await findNextPartner(conn, m, usedPrefix); 
    } catch (e) { 
      m.reply(`⚠️ Gagal mencari pasangan selanjutnya secara otomatis.`); 
    } 
  }
};

handler.before = handler; 
handler.findNextPartner = findNextPartner;
module.exports = handler;
