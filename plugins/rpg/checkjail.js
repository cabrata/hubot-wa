//rpg-checkjail
const { getUser } = require('../../lib/database')

let handler = async (m, { isPrems, conn, text, usedPrefix, command }) => {
  let user = await getUser(m.sender);
  if (!user) return
  
  // Ambil dari schema job yang baru diratakan (flatten)
  let pekerjaan2 = Number(user.pekerjaan2 || 0)

  if (user.jail && (!pekerjaan2 || pekerjaan2 > Date.now())) {
    if (pekerjaan2) {
      let remainingTime = pekerjaan2 - Date.now();
      let minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
      let seconds = Math.floor((remainingTime / 1000) % 60);
      
      if (m.sender === text) {
        return m.reply(`_Kamu masih berada di penjara_\n*Sisa waktu penjara:* ${minutes} menit ${seconds} detik`);
      } else {
        return m.reply(`_kamu masih berada di penjara_\n*Sisa waktu penjara*: ${minutes} menit ${seconds} detik`, null, { mentions: [m.sender] });
      }
    }
  } else if (user.jail === true) {
    if (m.sender === text) {
      return m.reply('*Kamu dipenjara seumur hidup!*');
    } else {
      return m.reply(`_kamu telah dipenjara seumur hidup_`, null, { mentions: [m.sender] });
    }
  } else {
    if (m.sender === text) {
      return m.reply('*Kamu tidak sedang dipenjara*');
    } else {
      return m.reply(`_kamu tidak sedang dalam penjara_`, null, { mentions: [m.sender] });
    }
  }
}

handler.help = ['checkjail', 'cj', 'statuspenjara', 'jailstatus']
handler.tags = ['rpg']
handler.command = /^(checkjail|cj|statuspenjara|jailstatus)$/i

module.exports = handler