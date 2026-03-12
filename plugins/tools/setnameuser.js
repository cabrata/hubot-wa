const { createHash } = require('crypto')
const { db, getUser, updateUser } = require('../../lib/database')

let handler = async (m, { text, command, conn, usedPrefix, isROwner, isPrems }) => {

  let today = Date.now();
  let pp = 'https://telegra.ph/file/e47d9ec693e5288ad9382.jpg'
  let who = m.sender

  try {
    pp = await conn.profilePictureUrl(who, 'image')
  } catch (e) {
  } finally {
    let about = (await conn.fetchStatus(who).catch(console.error) || {}).status || '~'
    let usernames = conn.getName(who)
    let user = await getUser(who)
    if (!user) return

    let isMods = user.moderator || false
    let sn = createHash('md5').update(m.sender).digest('hex')

    if (!global.owner.includes(m.sender.split('@')[0])) {
      let setNameTime = Number(user.setName || 0)
      if (setNameTime && setNameTime >= Date.now() - 1 * 30 * 24 * 60 * 60 * 1000) {
        const waktuTunggu = Math.ceil((1 * 30 * 24 * 60 * 60 * 1000 - (Date.now() - setNameTime)) / 1000);
        const hari = Math.floor(waktuTunggu / 86400);
        const bulan = Math.floor(hari / 30);
        const jam = Math.floor((waktuTunggu % 86400) / 3600);
        const menit = Math.floor((waktuTunggu % 3600) / 60);

        const formatWaktu = (nilai) => {
          return nilai < 10 ? `0${nilai}` : `${nilai}`;
        };
        throw `Anda tidak bisa mengubah nama lagi! Tunggu\n${formatWaktu(bulan)} bulan, ${formatWaktu(hari % 30)} hari, ${formatWaktu(jam)} jam, ${formatWaktu(menit)} menit\nbaru Anda dapat mengubah nama`;
      }
    }

    if (/[0-9]/.test(text)) throw 'Nama tidak boleh mengandung angka!';
    if (!text) throw 'Nama tidak boleh kosong!';
    if (text.length < 3) throw 'Nama terlalu pendek (minimal 3 huruf)';
    if (text.length > 60) throw 'Nama terlalu panjang (maksimal 60 huruf)';
    if (text == user.name) throw 'Nama tidak boleh sama dengan nama sebelumnya!';

    // Cek nama apakah sudah ada yang pakai menggunakan database sql langsung
    const existingUser = await db.user.findFirst({ where: { name: text.trim() } });
    if (existingUser) {
      throw `Nama "${text}" sudah digunakan oleh pengguna lain. Silakan gunakan nama yang berbeda.`;
    }

    await updateUser(who, { name: text.trim(), setName: Date.now() })

    let freshUser = await getUser(who)
    let daftar = `Ketik ${usedPrefix}daftar`
    let age = freshUser.age === 0 || freshUser.age === -1 ? daftar : freshUser.age;

    // Asumsi guild kamu belum diintegrasikan dengan database baru, biarkan null dulu atau jika sudah ada bisa disesuaikan
    let guild = freshUser.guild || null

    let str = `
Berhasil mengganti profile!

Name: ${m.pushName} (@${who.replace(/@.+/, '')})
Username:${isPrems ? ' 👑 ' : ' '}${freshUser.name ? freshUser.name : daftar}${isROwner ? ' *(Owner)*' : isMods ? ' *(Moderator)*' : isPrems ? ' *(Premium User!)*' : ''}
Age: ${age}

Guild: ${guild ? guild.name : `@${who.replace(/@.+/, '')} Tidak memiliki guild`}
Role: ${freshUser.role || '-'}
Level: ${freshUser.level || 0}
Money: ${freshUser.money || 0}
Coin: ${freshUser.coin || 0}
Saldo ATM: ${freshUser.atm || 0}

About: ${about}
Number: +${who.split('@')[0]}
Link: https://wa.me/${who.split('@')[0]}
`.trim()

    conn.sendMessage(m.chat, {
      text: str,
      contextInfo: {
        mentionedJid: [who],
        externalAdReply: {
          title: 'H U T A O - B O T',
          body: 'Bot WhatsApp RPG',
          thumbnailUrl: pp,
          sourceUrl: 'https://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    })
  }
}
handler.help = ['setname <teks>']
handler.tags = ['main', 'rpg']
handler.command = /^(setname|gantinama)$/i
handler.register = true
//handler.limit = true
module.exports = handler
