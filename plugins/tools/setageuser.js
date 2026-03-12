const { createHash } = require('crypto')
const { getUser, updateUser } = require('../../lib/database')

let handler = async (m, {text, command, conn, usedPrefix, isROwner, isPrems }) => {

  let today = Date.now();
  let pp = 'https://telegra.ph/file/e47d9ec693e5288ad9382.jpg'
  let who = m.sender
  
  try {
    pp = await conn.profilePictureUrl(who, 'image')
  } catch (e) {
  } finally {
    let about = (await conn.fetchStatus(who).catch(console.error) || {}).status || '~'
    let user = await m.user
    if (!user) return

    let isMods = user.moderator || false
    
    if (!global.owner.includes(who.split('@')[0])) {
      let setAgeTime = Number(user.setAge || 0)
      if (setAgeTime && setAgeTime >= Date.now() - 2 * 30 * 24 * 60 * 60 * 1000) {
        const waktuTunggu = Math.ceil((2 * 30 * 24 * 60 * 60 * 1000 - (Date.now() - setAgeTime)) / 1000);
        const hari = Math.floor(waktuTunggu / 86400);
        const bulan = Math.floor(hari / 30);
        const jam = Math.floor((waktuTunggu % 86400) / 3600);
        const menit = Math.floor((waktuTunggu % 3600) / 60);

        const formatWaktu = (nilai) => {
          return nilai < 10 ? `0${nilai}` : `${nilai}`;
        };
        throw `Anda tidak bisa mengubah umur lagi! Tunggu\n${formatWaktu(bulan)} bulan, ${formatWaktu(hari % 30)} hari, ${formatWaktu(jam)} jam, ${formatWaktu(menit)} menit\nbaru Anda dapat mengubah umur`;
      }
    }

    if (!text) throw 'Umur tidak boleh kosong (Angka)'
    if (isNaN(text)) throw 'Umur itu pake angka!'
    text = parseInt(text)
    if (text > 50) throw 'Umur terlalu tua 😂';
    if (text < 10) throw 'Anak kecil dilarang main bot ya dek';
    if (text == user.age) throw 'Umur tidak boleh sama dengan sebelumnya';
    
    await updateUser(who, { age: text, setAge: Date.now() })
    let freshUser = m.user

    let daftar = `Ketik ${usedPrefix}daftar`
    let age = freshUser.age === 0 || freshUser.age === -1 ? daftar : freshUser.age;

    // Ambil murni nomor saja untuk display (membuang @s.whatsapp.net dan ID Device :xx)
    let pureNumber = who.split('@')[0].split(':')[0]; 

    let str = `
Berhasil mengganti umur!

Name: ${m.pushName} (@${pureNumber})
Username: ${isPrems ? '👑 ' : ''}${freshUser.name ? freshUser.name : daftar}${isROwner ? ' *(Owner)*' : isMods ? ' *(Moderator)*' : isPrems ? ' *(Premium User!)*' : ''}
Age: ${age}

Role: ${freshUser.role || '-'}
Level: ${freshUser.level || 0}
Money: ${freshUser.money || 0}
Coin: ${freshUser.coin || 0}
Saldo ATM: ${freshUser.atm || 0}

About: ${about}
Number: +${pureNumber}
Link: https://wa.me/${pureNumber}
`.trim()

    conn.sendMessage(m.chat, {
      text: str,
      contextInfo: {
        mentionedJid: [who],
        externalAdReply: {
          title: 'HuTao BOT',
          body: typeof wm !== 'undefined' ? wm : 'HuTao BOT', // Mencegah error jika variabel wm tidak ditemukan
          thumbnailUrl: pp,
          sourceUrl: 'https://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    })
  }
}
handler.help = ['setage <angka>']
handler.tags = ['main', 'rpg']
handler.command = /^(setage|gantiumur)$/i
handler.register = true
//handler.limit = true
module.exports = handler
