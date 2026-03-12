//rpg-inv
const { getUser, getTool } = require('../../lib/database')

let handler = async (m, { conn, args }) => {
  let target = m.mentionedJid[0] || m.sender 
  let user = await getUser(target)
  if (!user) return

  // Fetch data tools untuk mengecek durability
  let armor = await getTool(target, 'armor')
  let sword = await getTool(target, 'sword')
  let fishingrod = await getTool(target, 'fishingrod')
  let pickaxe = await getTool(target, 'pickaxe')
  let katana = await getTool(target, 'katana')
  let bow = await getTool(target, 'bow')
  let axe = await getTool(target, 'axe')
  let pisau = await getTool(target, 'pisau')

  let capt = `
*INVENTORY - USER*

*Username* : ${user.name || target.split('@')[0]}
*Role* : ${user.role || 'Newbie ㋡'}
*Level* : ${user.level || 0}
*Exp* : ${user.exp || 0}
*Limit* : ${user.limit || 0}
*Money* : ${user.money || 0}
*Title* : ${user.titlein || 'Belum Ada'}
*Skill* : ${user.skill || 'Tidak Ada'}

━━━╺╺「 *Status* 」╸╸━━━
*Health* : ${user.health || 0}
*Energi* : ${user.energi || 0}
*Stamina* : ${user.stamina || 0}
*Speed* : ${user.speed || 0}
*Strength* : ${user.strenght || 0}
*Attack* : ${user.attack || 0}
*Defense* : ${user.defense || 0}

━━━╺╺「 *Backpack* 」╸╸━━━
*Potion* : ${user.potion || 0}
*Diamond* : ${user.diamond || 0}
*Emas* : ${user.emas || 0}
*Iron* : ${user.iron || 0}
*Berlian* : ${user.berlian || 0}
*Sampah* : ${user.sampah || 0}
*Kayu* : ${user.kayu || 0}
*Batu* : ${user.batu || 0}
*String* : ${user.string || 0}

━━━╺╺「 *Durability* 」╸╸━━━
*Armor* : ${armor ? armor.durability : 0}
*Sword* : ${sword ? sword.durability : 0}
*Pisau* : ${pisau ? pisau.durability : 0}
*Fishingrod* : ${fishingrod ? fishingrod.durability : 0}
*Pickaxe* : ${pickaxe ? pickaxe.durability : 0}
*Katana* : ${katana ? katana.durability : 0}
*Axe* : ${axe ? axe.durability : 0}
*Bow* : ${bow ? bow.durability : 0}

━━━╺╺「 *User Box* 」╸╸━━━
*Common* : ${user.common || 0}
*Uncommon* : ${user.uncommon || 0}
*Mythic* : ${user.mythic || 0}
*Legendary* : ${user.legendary || 0}
*Total Box* : ${(user.common || 0) + (user.uncommon || 0) + (user.mythic || 0) + (user.legendary || 0)}

━━━╺╺「 *User Pets* 」╸╸━━━
*Pet token* : ${user.pet || 0}
*Makanan pet* : ${user.makananpet || 0}

*Kucing* : Lv. ${user.kucing || 0}
*Anjing* : Lv. ${user.anjing || 0}
*Rubah* : Lv. ${user.rubah || 0}
*Serigala* : Lv. ${user.serigala || 0}
*Phonix* : Lv. ${user.phonix || 0}
*Robo* : Lv. ${user.robo || 0}
`.trim()

  await conn.sendMessage(m.chat, {
      text: capt,
      contextInfo: {
          mentionedJid: [target],
          externalAdReply: {
              title: wm,
              mediaType: 1,
              renderLargerThumbnail: true,
              thumbnailUrl: 'https://telegra.ph/file/05daab7b42157c06636b3.jpg',
              sourceUrl: ''
          }
      }
  })
}

handler.help = ['inventory']
handler.tags = ['rpg']
handler.command = /^(inv|inventory|bal|balance)$/i
handler.register = true
module.exports = handler