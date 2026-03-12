//rpg-berlatih
const { getUser, updateRpg } = require('../../lib/database')

let handler = async (m, { conn, text }) => {
  try {
    let user = await getUser(m.sender)
    if (!user) return
    
    // Daftar atribut yang bisa dilatih. Catatan: strenght disesuaikan typo dr database.
    const attributes = ['attack', 'speed', 'strenght', 'health', 'defense'];
    
    // Mapping agar tulisan strength dr input otomatis diubah
    let attribute = text?.toLowerCase().trim();
    if (attribute === 'strength') attribute = 'strenght';

    // Cek apakah atribut yang diminta valid
    if (!attributes.includes(attribute)) {
      return conn.reply(m.chat, `乂 *B E R L A T I H*\n\nSilahkan pilih *Attribute* yang kamu ingin latih :\n\n- Attack\n- Speed\n- Strength\n- Health\n- Defense\n\n_Example_ :\n.berlatih defense`, m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1, title: wm, thumbnailUrl: 'https://telegra.ph/file/05daab7b42157c06636b3.jpg', renderLargerThumbnail: true, sourceUrl: ''
                }
            }
        })
    }

    // Cek apakah pengguna memiliki cukup stamina
    if ((user.stamina || 0) < 10) {
      return conn.reply(m.chat, '🌡️ Anda tidak memiliki cukup stamina untuk berlatih. Stamina dibutuhkan: 10.', m);
    }

    let increase = 1; 
    let currentAttr = user[attribute] || 0;
    
    // Kurangi stamina dan tambah point atribut
    await updateRpg(m.sender, { 
        stamina: user.stamina - 10,
        [attribute]: currentAttr + increase
    });

    let message = `🏋️‍♂️ Anda sedang berlatih ${attribute} dan mendapatkan peningkatan:\n\n`;
    message += `❤️ ${attribute} pengguna sekarang: ${currentAttr + increase}\n`;
    message += `✨ Peningkatan yang dihasilkan: ${increase}\n`;
    message += `⚡ Sisa stamina: ${user.stamina - 10}\n`;

    conn.reply(m.chat, message, m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1, title: wm, thumbnailUrl: 'https://telegra.ph/file/05daab7b42157c06636b3.jpg', renderLargerThumbnail: true, sourceUrl: ''
                }
            }
        })
  } catch (e) {
    console.log(e);
    conn.reply(m.chat, 'Error', m);
  }
}

handler.help = ['berlatih <atribut>'];
handler.tags = ['rpg'];
handler.command = /^berlatih$/i;
handler.registered = true;
handler.group = true;
handler.fail = null;

module.exports = handler;