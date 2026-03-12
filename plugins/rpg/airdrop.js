const { getUser, updateEconomy, updateRpg, updateCooldown, addInventory } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, DevMode }) => {
    let u = await getUser(m.sender)
    if (!u) return
    
    let lastclaim = Number(u.lastclaim || 0)
    let time = lastclaim + 3600000; // 1 jam dalam milidetik
    
    if (Date.now() - lastclaim < 3600000) {
        throw `*Sudah Melakukan Pencarian Airdrop!* 🪙\nHarus menunggu selama agar bisa mencari Airdrop kembali selama ${clockString(time - Date.now())}`;
    }

    let Aku = `${Math.floor(Math.random() * 101)}`.trim();
    let Kamu = `${Math.floor(Math.random() * 81)}`.trim(); 
    let A = (Aku * 1);
    let K = (Kamu * 1);

    if (A > K) {
      let _sampah = Array.from({length: 50}, (_, i) => (i + 1).toString());
      let sampah = _sampah[Math.floor(Math.random() * _sampah.length)];
      let kayu = _sampah[Math.floor(Math.random() * _sampah.length)];
      let batu = _sampah[Math.floor(Math.random() * _sampah.length)];
      
      // Changed to conn.sendMessage
      await conn.sendMessage(m.chat, { 
          image: { url: 'https://telegra.ph/file/60437ce6d807b605adf5e.jpg' }, 
          caption: `*Airdrop Ampas!* Ternyata isinya tidak sesuai ekspektasi\n\n*Rewards*\n• *Sampah:* ${sampah}\n• *Kayu:* ${kayu}\n• *Batu:* ${batu}` 
      }, { quoted: m });
      
      await updateRpg(m.sender, { sampah: u.sampah + parseInt(sampah) });
      await addInventory(m.sender, 'kayu', parseInt(kayu));
      await addInventory(m.sender, 'batu', parseInt(batu));
      await updateCooldown(m.sender, { lastclaim: Date.now() });

    } else if (A < K) {
      let _limit = ['10', '20', '30'];
      let limit = _limit[Math.floor(Math.random() * _limit.length)];
      let _money = ['10000', '100000', '500000'];
      let money = _money[Math.floor(Math.random() * _money.length)];
      let _point = ['10000', '100000', '500000'];
      let point = _point[Math.floor(Math.random() * _point.length)];
      
      // Changed to conn.sendMessage
      await conn.sendMessage(m.chat, { 
          image: { url: 'https://telegra.ph/file/d3bc1d7a97c62d3baaf73.jpg' }, 
          caption: `*Airdrop Rare!*, Kamu mendapatkan Kotak Airdrop *Rare*\n\nSelamat kamu mendapatkan *Rewards*\n• *Limit:* ${limit}\n• *Money:* ${money}\n• *Point:* ${point}` 
      }, { quoted: m });
      
      await updateEconomy(m.sender, { 
          limit: u.limit + parseInt(limit), 
          money: u.money + parseInt(money), 
          poin: u.poin + parseInt(point) 
      });
      await updateCooldown(m.sender, { lastclaim: Date.now() });

    } else {
      // Changed to conn.sendMessage
      await conn.sendMessage(m.chat, { 
          image: { url: 'https://telegra.ph/file/5d71027ecbcf771b299fb.jpg' }, 
          caption: `*Airdrop Zonks!*, Kamu mendapatkan Kotak Airdrop *Zonk (Kosong)*\n\nSelamat kamu mendapatkan *Rewards*\n• *Money:* -1.000.000\n• *Isi:* Angin` 
      }, { quoted: m });
      
      await updateEconomy(m.sender, { money: u.money - 1000000 });
      await updateCooldown(m.sender, { lastclaim: Date.now() });
    }
};

handler.help = ['airdrop'];
handler.tags = ['rpg'];
handler.command = /^(airdrop)$/i;
handler.register = true;
handler.group = true;
module.exports = handler;

function clockString(ms) {
  let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000);
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24;
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return ['\n*' + d + '* _Hari_ ☀️\n ', '*' + h + '* _Jam_ 🕐\n ', '*' + m + '* _Menit_ ⏰\n ', '*' + s + '* _Detik_ ⏱️ '].map(v => v.toString().padStart(2, 0)).join('');
}
