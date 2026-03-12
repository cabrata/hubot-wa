//rpg-bank
const { getUser } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let target = m.mentionedJid[0] || m.sender 
  let user = await getUser(target)
  
  if (!user?.registered || user?.banned) {
    return m.reply(`🔒 Informasi dikunci, user ${user?.banned ? 'telah dibanned' : 'belum registrasi'}`)
  }
  
  let capt = `乂  *🏦 B A N K - U S E R 🏦* 乂\n\n`
  capt += `  ◦  *👤 Nama* : ${user.name}\n`
  capt += `  ◦  *⭐ Role* : ${user.role}\n`
  capt += `  ◦  *✨ Exp* : ${user.exp}\n`
  capt += `  ◦  *📊 Limit* : ${user.limit}\n`
  capt += `  ◦  *💰 Saldo* : ${user.money}\n`
  capt += `  ◦  *📈 Level* : ${user.level}\n`
  capt += `  ◦  *🏧 ATM* : ${user.bank}\n\n`
  capt += `> *${usedPrefix} atm <jumlah>* untuk menabung\n`
  capt += `> *${usedPrefix} pull <jumlah>* untuk menarik uang\n`

  await conn.relayMessage(m.chat, {
            extendedTextMessage:{
                text: capt, 
                contextInfo: {
                    mentionedJid: [m.sender],
                    externalAdReply: {
                        title: wm,
                        mediaType: 1,
                        previewType: 0,
                        renderLargerThumbnail: true,
                        thumbnailUrl: 'https://pomf2.lain.la/f/106ebnd3.jpg',
                        sourceUrl: 'https://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m'
                    }
                }, 
                mentions: [m.sender]
            }
        }, {})
}

handler.help = ['bank']
handler.tags = ['rpg']
handler.command = /^bank$/
handler.registered = true;

module.exports = handler