const { getUser, updateEconomy, updateUser, updateRpg, updateCooldown, addInventory, getTool, setTool } = require('../../lib/database')

async function handler(m, { conn, usedPrefix, command, text }) {
  let user = await getUser(m.sender)
  if (!user) return

  let swordObj = await getTool(m.sender, 'sword')
  let armorObj = await getTool(m.sender, 'armor')

  let SWORD = !swordObj
  let ARMOR = !armorObj
  let HEALT = (user.health || 0) < 90
  let prefix = usedPrefix

  if (SWORD || ARMOR || HEALT) {
    let kemii = `${prefix}craft armor\n\nUntuk mendapatkan armor kamu!`
    let anjy = `${prefix}craft sword\n\nUntuk mendapatkan pedang kamu!`
    let kemii1 = `${prefix}heal\n\nUntuk menambah darah kamu!`

    if (SWORD) return conn.sendMessage(m.chat, {
      text: anjy,
      contextInfo: { externalAdReply: { title: 'D u n g e o n', thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg', mediaType: 1, renderLargerThumbnail: true } }
    })
    if (ARMOR) return conn.sendMessage(m.chat, {
      text: kemii,
      contextInfo: { externalAdReply: { title: 'D u n g e o n', thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg', mediaType: 1, renderLargerThumbnail: true } }
    })
    if (HEALT) return conn.sendMessage(m.chat, {
      text: kemii1,
      contextInfo: { externalAdReply: { title: 'D u n g e o n', thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg', mediaType: 1, renderLargerThumbnail: true } }
    })
  }

  global.dungeon = global.dungeon || {}
  if (Object.values(global.dungeon).find(room => room.id.startsWith('dungeon') && [room.game.player1, room.game.player2, room.game.player3, room.game.player4].includes(m.sender))) return conn.reply(m.chat, 'Kamu masih di dalam Dungeon', m)

  let timing = Date.now() - (Number(user.lastdungeon) || 0)
  if (timing < 100) return conn.reply(m.chat, `Silahkan tunggu ${clockString(100 - timing)} untuk bisa ke Dungeon`, m)

  let room = Object.values(global.dungeon).find(room => room.state === 'WAITING' && (text ? room.name === text : true))

  if (room) {
    let p1 = room.game.player1 || ''
    let p2 = room.game.player2 || ''
    let p3 = room.game.player3 || ''
    let p4 = room.game.player4 || ''
    let c1 = room.player1 || ''
    let c2 = room.player2 || ''
    let c3 = room.player3 || ''
    let c4 = room.player4 || ''

    if (!p2) {
      room.player2 = m.chat
      room.game.player2 = m.sender
    } else if (!p3) {
      room.player3 = m.chat
      room.game.player3 = m.sender
    } else if (!p4) {
      room.player4 = m.chat
      room.game.player4 = m.sender
      room.state = 'PLAYING'
    }

    let lmao = `${!room.game.player4 ? `Menunggu ${!room.game.player3 && !room.game.player4 ? '2' : '1'} Partner lagi... ${room.name ? `mengetik command dibawah ini *${usedPrefix}${command} ${room.name}*` : ''}` : 'Semua partner telah lengkap...'}`
    conn.sendMessage(m.chat, { text: lmao, contextInfo: { externalAdReply: { title: 'D u n g e o n', thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg', mediaType: 1, renderLargerThumbnail: true } } })

    if (room.game.player1 && room.game.player2 && room.game.player3 && room.game.player4) {
      room.price.money += (Math.floor(Math.random() * 1000)) * 1
      room.price.exp += (Math.floor(Math.random() * 50)) * 1
      room.price.iron += (pickRandom([0, 0, 0, 0, 1, 0, 0, 0])) * 1
      room.game.diamond += (pickRandom([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0])) * 1
      room.game.sampah += (Math.floor(Math.random() * 101)) * 1
      room.price.string += (Math.floor(Math.random() * 2)) * 1
      room.price.kayu += (Math.floor(Math.random() * 2)) * 1
      room.price.batu += (Math.floor(Math.random() * 2)) * 1
      room.game.makananPet += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0])) * 1
      room.game.common += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0])) * 1
      room.game.uncommon += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0])) * 1

      let str = `Room ID: ${room.id}\n\n${M(p1)}, ${M(p2)}, ${M(p3)} dan ${M(p4)}\n\nSedang berperang di dungeon...`.trim()

      await m.reply(str, c1, { contextInfo: { mentionedJid: conn.parseMention(str) } })
      if (![c1, c3, c4].includes(c2)) m.reply(str, c2, { contextInfo: { mentionedJid: conn.parseMention(str) } })
      if (![c1, c2, c4].includes(c3)) m.reply(str, c3, { contextInfo: { mentionedJid: conn.parseMention(str) } })
      if (![c1, c2, c3].includes(c4)) m.reply(str, c4, { contextInfo: { mentionedJid: conn.parseMention(str) } })

      setTimeout(async () => {
        let player = [p1, p2, p3, p4]
        let { healt, sword } = room.less
        let { exp, money, sampah, potion, diamond, iron, kayu, batu, string, common, uncommon, mythic, legendary, pet, makananPet } = room.price

        let str2 = `Nyawa *${M(p1)}*, *${M(p2)}*, *${M(p3)}* dan *${M(p4)}* masing masing berkurang *-${healt * 1}*, dan durability Sword kalian masing masing berkurang *-${sword * 1}* karena kalian telah membunuh *${pickRandom(['Ender Dragon', 'Baby Dragon', 'Titan', 'Cacing dan Semut', 'PP Mikey', 'Orang', 'Kecoa', 'Semut', 'Siput', '....', 'Wither', 'Sekeleton', 'Ayam Emas', 'Temenmu', 'Sapi', 'Tidak Ada', 'Creeper', 'Zombie', 'Hewan Pelihraanmu', 'Diri Sendiri'])}* dan mendapatkan total\n*Exp:* ${exp * 4}\n*Uang:* ${money * 4}\n*Sampah:* ${sampah * 4}${potion == 0 ? '' : '\n*Potion:* ' + potion * 4}${makananPet == 0 ? '' : '\n*Makanan Pet* ' + makananPet * 4}${kayu == 0 ? '' : '\n*Kayu:* ' + kayu * 4}${batu == 0 ? '' : '\n*Batu:* ' + batu * 4}${string == 0 ? '' : '\n*String:* ' + string * 4}${iron == 0 ? '' : '\n*Iron:* ' + iron * 4}${diamond == 0 ? '' : '\n*Diamond:* ' + diamond * 4}${common == 0 ? '' : '\n*Common Crate:* ' + common * 4}${uncommon == 0 ? '' : '\n*Uncommon Crate:* ' + uncommon * 4}`.trim()

        let HEALT = [], SDH = []

        for (let i = 0; i < player.length; i++) {
          let p = player[i]
          let u = await getUser(p)
          if (!u) continue

          let newHealth = Math.max(0, (u.health || 100) - healt)
          await updateRpg(p, { health: newHealth })
          if (newHealth < 1) HEALT.push(p)

          let swordTool = await getTool(p, 'sword')
          if (swordTool) {
            let newDura = (swordTool.durability || 50) - sword
            if (newDura < 1) {
              await setTool(p, 'sword', 0, 0)
              SDH.push(p)
            } else {
              await setTool(p, 'sword', swordTool.owned, newDura)
            }
          }

          await updateEconomy(p, { money: (u.money || 0) + money, diamond: (u.diamond || 0) + diamond })
          await updateUser(p, { exp: (u.exp || 0) + exp })
          await updateCooldown(p, { lastdungeon: Date.now() })

          if (sampah) await addInventory(p, 'sampah', sampah)
          if (potion) await addInventory(p, 'potion', potion)
          if (makananPet) await addInventory(p, 'makananpet', makananPet)
          if (kayu) await addInventory(p, 'kayu', kayu)
          if (batu) await addInventory(p, 'batu', batu)
          if (string) await addInventory(p, 'string', string)
          if (iron) await addInventory(p, 'iron', iron)
          if (common) await addInventory(p, 'common', common)
          if (uncommon) await addInventory(p, 'uncommon', uncommon)
          if (mythic) await addInventory(p, 'mythic', mythic)
          if (legendary) await addInventory(p, 'legendary', legendary)
          if (pet) await addInventory(p, 'pet', pet)
        }

        await m.reply(str2, c1, { contextInfo: { mentionedJid: conn.parseMention(str2) } })
        if (![c1, c3, c4].includes(c2)) m.reply(str2, c2, { contextInfo: { mentionedJid: conn.parseMention(str2) } })
        if (![c1, c2, c4].includes(c3)) m.reply(str2, c3, { contextInfo: { mentionedJid: conn.parseMention(str2) } })
        if (![c1, c2, c3].includes(c4)) m.reply(str2, c4, { contextInfo: { mentionedJid: conn.parseMention(str2) } })

        if (mythic > 0) {
          let str3 = 'Selamat ' + M(p1) + ', ' + M(p2) + ', ' + M(p3) + ' dan ' + M(p4) + ' kalian mendapatkan item Rare Total *' + mythic * 4 + '* 📦Mythic Crate'
          await m.reply(str3, c1, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c3, c4].includes(c2)) m.reply(str3, c2, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c2, c4].includes(c3)) m.reply(str3, c3, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c2, c3].includes(c4)) m.reply(str3, c4, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
        }

        if (legendary > 0 || pet > 0) {
          let str3 = (mythic > 0 ? 'Dan juga' : 'Selamat ' + M(p1) + ', ' + M(p2) + ', ' + M(p3) + ' dan ' + M(p4) + ' kalian') + ' mendapatkan item Epic Total ' + (pet > 0 && legendary > 0 ? `*${legendary * 4}* 🎁Legendary Crate dan *${pet * 4}* 📦Pet Crate` : pet > 0 && legendary < 1 ? `*${pet * 4}* 📦Pet Crate` : legendary > 0 && pet < 1 ? `*${legendary * 4}* 🎁Legendary Crate` : '')
          await m.reply(str3, c1, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c3, c4].includes(c2)) m.reply(str3, c2, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c2, c4].includes(c3)) m.reply(str3, c3, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c2, c3].includes(c4)) m.reply(str3, c4, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
        }

        if (HEALT.length > 0 || SDH.length > 0) {
          let sI = data(SDH)
          let H = data(HEALT)
          let str3 = `${(SDH.length > 0) ? `⚔️Sword ${sI} Hancur, silahkan crafting ⚔️Sword kembali dengan mengetik *${usedPrefix}craft sword*` : ''}${HEALT.length > 0 ? `❤️Nyawa ${H} habis, silahkan isi ❤️Nyawa dengan mengetik ${usedPrefix}heal` : ''}`

          await m.reply(str3, c1, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c3, c4].includes(c2)) m.reply(str3, c2, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c2, c4].includes(c3)) m.reply(str3, c3, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
          if (![c1, c2, c3].includes(c4)) m.reply(str3, c4, { contextInfo: { mentionedJid: conn.parseMention(str3) } })
        }

        delete global.dungeon[room.id]

      }, pickRandom([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000]))
      if (global.dungeon && room.state == 'PLAYING') delete global.dungeon[room.id]
    }
  } else {
    room = {
      id: 'dungeon-' + (+ new Date),
      player1: m.chat,
      player2: '',
      player3: '',
      player4: '',
      state: 'WAITING',
      game: { player1: m.sender, player2: '', player3: '', player4: '' },
      price: {
        money: (Math.floor(Math.random() * 500001)) * 1,
        exp: (Math.floor(Math.random() * 70001)) * 1,
        sampah: (Math.floor(Math.random() * 201)) * 1,
        potion: (Math.floor(Math.random() * 2)) * 1,
        diamond: (pickRandom([0, 0, 0, 0, 1, 0, 0])) * 1,
        iron: (Math.floor(Math.random() * 2)) * 1,
        kayu: (Math.floor(Math.random() * 3)) * 1,
        batu: (Math.floor(Math.random() * 2)) * 1,
        string: (Math.floor(Math.random() * 2)) * 1,
        common: (pickRandom([0, 0, 0, 1, 0, 0])) * 1,
        uncommon: (pickRandom([0, 0, 0, 1, 0, 0, 0])) * 1,
        mythic: (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0])) * 1,
        legendary: (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0])) * 1,
        pet: (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0])) * 1,
        makananPet: (pickRandom([0, 0, 0, 1, 0, 0, 0, 0])) * 1,
      },
      less: {
        healt: (Math.floor(Math.random() * 101)) * 1,
        sword: (Math.floor(Math.random() * 50)) * 1,
      }
    }
    if (text) room.name = text

    let lmao = 'Menunggu partner ' + (text ? `mengetik command dibawah ini\n${usedPrefix}${command} ${text}` : '') + '\natau ketik *sendiri* untuk bermain sendiri'
    conn.sendMessage(m.chat, { text: lmao, contextInfo: { externalAdReply: { title: 'D u n g e o n', thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg', mediaType: 1, renderLargerThumbnail: true } } })
    global.dungeon[room.id] = room
  }
}

handler.before = async function (m) {
  global.dungeon = global.dungeon || {}
  let room = Object.values(global.dungeon).find(room => room.id.startsWith('dungeon-') && [room.game.player1, room.game.player2, room.game.player3, room.game.player4].includes(m.sender) && room.state == 'WAITING')

  if (room) {
    let p1 = room.game.player1 || ''
    let p2 = room.game.player2 || ''
    let p3 = room.game.player3 || ''
    let p4 = room.game.player4 || ''
    let c1 = room.player1 || ''
    let c2 = room.player2 || ''
    let c3 = room.player3 || ''
    let c4 = room.player4 || ''

    let PLAYER = [room.game.player1]
    if (room.game.player2) PLAYER.push(room.game.player2)
    if (room.game.player3) PLAYER.push(room.game.player3)
    if (room.game.player4) PLAYER.push(room.game.player4)
    let P = data(PLAYER)

    if (/^(sendiri|dewean|solo)$/i.test(m.text.toLowerCase())) {
      let lmao = 'Kamu tidak bisa bermain sendiri karena memiliki partner. Silahkan ketik *gass* untuk bermain dengan partner lainnya...'
      if (room.player2 || room.player3 || room.player4) return this.sendMessage(m.chat, { text: lmao, contextInfo: { externalAdReply: { title: 'D u n g e o n', thumbnailUrl: 'https://telegra.ph/file/750e79e2764d529aea52e.jpg', mediaType: 1, renderLargerThumbnail: true } } }, { quoted: m })

      room.state = 'PLAYING'
      let str = `Room ID: ${room.id}\n\n${P}\n\nSedang berperang di dungeon...`.trim()
      m.reply(str, room.player1, { contextInfo: { mentionedJid: this.parseMention(str) } })

      setTimeout(async () => {
        let u = await getUser(p1)
        if (!u) return

        let { healt, sword } = room.less
        let { exp, money, sampah, potion, diamond, iron, kayu, batu, string, common, uncommon, mythic, legendary, pet, makananPet } = room.price

        let str2 = `Nyawa Kamu berkurang -${healt * 1}, dan durability Sword Kamu -${sword * 1} karena kamu telah Membunuh ${pickRandom(['Ender Dragon', 'Baby Dragon', 'Titan', 'Cacing dan Semut', 'PP Mikey', 'Orang', 'Kecoa', 'Semut', 'Siput', '....', 'Wither', 'Sekeleton', 'Ayam Emas', 'Temenmu', 'Sapi', 'Tidak Ada', 'Creeper', 'Zombie', 'Hewan Pelihraanmu', 'Diri Sendiri'])} dan mendapatkan\n*Exp:* ${exp}\n*Uang:* ${money}\n*Sampah:* ${sampah}${potion == 0 ? '' : '\n*Potion:* ' + potion}${makananPet == 0 ? '' : '\n*Makanan Pet* ' + makananPet * 1}${kayu == 0 ? '' : '\n*Kayu:* ' + kayu}${batu == 0 ? '' : '\n*Batu:* ' + batu}${string == 0 ? '' : '\n*String:* ' + string}${iron == 0 ? '' : '\n*Iron:* ' + iron}${diamond == 0 ? '' : '\n*Diamond:* ' + diamond}${common == 0 ? '' : '\n*Common Crate:* ' + common}${uncommon == 0 ? '' : '\n*Uncommon Crate:* ' + uncommon}`.trim()

        let newHealth = Math.max(0, Number(u.health || 100) - Number(healt))
        await updateRpg(p1, { health: newHealth })
        await updateEconomy(p1, { money: (u.money || 0) + money, diamond: (u.diamond || 0) + diamond })
        await updateUser(p1, { exp: (u.exp || 0) + exp })
        await updateCooldown(p1, { lastdungeon: Date.now() })

        let swordTool = await getTool(p1, 'sword')
        let swordBroken = false
        if (swordTool) {
          let newDura = (swordTool.durability || 50) - sword
          if (newDura < 1) {
            await setTool(p1, 'sword', 0, 0)
            swordBroken = true
          } else {
            await setTool(p1, 'sword', swordTool.owned, newDura)
          }
        }

        if (sampah) await addInventory(p1, 'sampah', sampah)
        if (potion) await addInventory(p1, 'potion', potion)
        if (makananPet) await addInventory(p1, 'makananpet', makananPet)
        if (kayu) await addInventory(p1, 'kayu', kayu)
        if (batu) await addInventory(p1, 'batu', batu)
        if (string) await addInventory(p1, 'string', string)
        if (iron) await addInventory(p1, 'iron', iron)
        if (common) await addInventory(p1, 'common', common)
        if (uncommon) await addInventory(p1, 'uncommon', uncommon)
        if (mythic) await addInventory(p1, 'mythic', mythic)
        if (legendary) await addInventory(p1, 'legendary', legendary)
        if (pet) await addInventory(p1, 'pet', pet)

        await m.reply(str2, room.player1)

        if (mythic > 0) m.reply('Selamat Kamu Mendapatkan item Rare yaitu *' + mythic + '* Mythic Crate', room.player1)
        if (legendary > 0 || pet > 0) {
          let str3 = (mythic > 0 ? 'Dan juga' : 'Selamat Kamu') + ' mendapatkan item Epic yaitu ' + (pet > 0 && legendary > 0 ? `*${legendary}* Legendary Crate dan *${pet}* Pet Crate` : pet > 0 && legendary < 1 ? `*${pet}* Pet Crate` : legendary > 0 && pet < 1 ? `*${legendary}* Legendary Crate` : '')
          m.reply(str3, room.player1)
        }

        if (newHealth < 1 || swordBroken) {
          let str3 = `${swordBroken ? ` Sword Kamu Hancur, dan silahkan crafting Sword kembali dengan mengetik ${usedPrefix}craft sword` : ''} ${(newHealth < 1) ? `${swordBroken ? 'Dan ' : ''}Nyawa Kamu habis, silahkan isi kembali dengan ketik ${usedPrefix}heal` : ''}`
          m.reply(str3, room.player1, { contextInfo: { mentionedJid: this.parseMention(str3) } })
        }
        delete global.dungeon[room.id]
      }, pickRandom([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000]))
      if (global.dungeon && room.state == 'PLAYING') delete global.dungeon[room.id]

    } else if (/^(gass?s?s?s?.?.?.?|mulai|los?s?s?.?.?.?)$/i.test(m.text.toLowerCase())) {
      let str = `Room ID: ${room.id}\n\n${P}\n\nSedang berperang di dungeon...`.trim()
      m.reply(str, c1, { contextInfo: { mentionedJid: this.parseMention(str) } })
      if (c2 && ![c1, c3, c4].includes(c2)) m.reply(str, c2, { contextInfo: { mentionedJid: this.parseMention(str) } })
      if (c3 && ![c1, c2, c4].includes(c3)) m.reply(str, c3, { contextInfo: { mentionedJid: this.parseMention(str) } })
      if (c4 && ![c1, c2, c3].includes(c4)) m.reply(str, c4, { contextInfo: { mentionedJid: this.parseMention(str) } })

      let orang = PLAYER.length
      for (let _p of PLAYER) {
        room.price.money += (Math.floor(Math.random() * 41)) * 1
        room.price.exp += (Math.floor(Math.random() * 76)) * 1
        room.game.sampah += (Math.floor(Math.random() * 16)) * 1
        room.price.string += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0])) * 1
        room.price.kayu += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0])) * 1
        room.price.batu += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0])) * 1
        room.game.common += (pickRandom([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0])) * 1
      }

      let { healt, sword } = room.less
      let { exp, money, sampah, potion, diamond, iron, kayu, batu, string, common, uncommon, mythic, legendary, pet, makananPet } = room.price

      setTimeout(async () => {
        let str2 = `Nyawa ${P} masing masing berkurang *-${healt * 1}*, dan durability Sword kalian masing masing berkurang *-${sword * 1}* karena kalian telah membunuh *${pickRandom(['Ender Dragon', 'Baby Dragon', 'Titan', 'Cacing dan Semut', 'PP Mikey', 'Orang', 'Kecoa', 'Semut', 'Siput', '....', 'Wither', 'Sekeleton', 'Ayam Emas', 'Temenmu', 'Sapi', 'Tidak Ada', 'Creeper', 'Zombie', 'Hewan Pelihraanmu', 'Diri Sendiri'])}* dan mendapatkan total\n*Exp:* ${exp * orang}\n*Uang:* ${money * orang}\n*Sampah:* ${sampah * orang}${potion == 0 ? '' : '\n*Potion:* ' + potion * orang}${makananPet == 0 ? '' : '\n*Makanan Pet* ' + makananPet * orang}${kayu == 0 ? '' : '\n*Kayu:* ' + kayu * orang}${batu == 0 ? '' : '\n*Batu:* ' + batu * orang}${string == 0 ? '' : '\n*String:* ' + string * orang}${iron == 0 ? '' : '\n*Iron:* ' + iron * orang}${diamond == 0 ? '' : '\n*Diamond:* ' + diamond * orang}${common == 0 ? '' : '\n*Common Crate:* ' + common * orang}${uncommon == 0 ? '' : '\n*Uncommon Crate:* ' + uncommon * orang}`.trim()
        await m.reply(str2, c1, { contextInfo: { mentionedJid: this.parseMention(str2) } })
        if (c2 && ![c1, c3, c4].includes(c2)) m.reply(str2, c2, { contextInfo: { mentionedJid: this.parseMention(str2) } })
        if (c3 && ![c1, c2, c4].includes(c3)) m.reply(str2, c3, { contextInfo: { mentionedJid: this.parseMention(str2) } })
        if (c4 && ![c1, c2, c3].includes(c4)) m.reply(str2, c4, { contextInfo: { mentionedJid: this.parseMention(str2) } })

        let HEALT = [], SDH = []
        for (let p of PLAYER) {
          let u = await getUser(p)
          if (!u) continue

          let newHealth = Math.max(0, Number(u.health || 100) - Number(healt))
          await updateRpg(p, { health: newHealth })
          if (newHealth < 1) HEALT.push(p)

          let swordTool = await getTool(p, 'sword')
          if (swordTool) {
            let newDura = (swordTool.durability || 50) - sword
            if (newDura < 1) {
              await setTool(p, 'sword', 0, 0)
              SDH.push(p)
            } else {
              await setTool(p, 'sword', swordTool.owned, newDura)
            }
          }

          await updateEconomy(p, { money: (u.money || 0) + money, diamond: (u.diamond || 0) + diamond })
          await updateUser(p, { exp: (u.exp || 0) + exp })
          await updateCooldown(p, { lastdungeon: Date.now() })

          if (sampah) await addInventory(p, 'sampah', sampah)
          if (potion) await addInventory(p, 'potion', potion)
          if (makananPet) await addInventory(p, 'makananpet', makananPet)
          if (kayu) await addInventory(p, 'kayu', kayu)
          if (batu) await addInventory(p, 'batu', batu)
          if (string) await addInventory(p, 'string', string)
          if (iron) await addInventory(p, 'iron', iron)
          if (common) await addInventory(p, 'common', common)
          if (uncommon) await addInventory(p, 'uncommon', uncommon)
          if (mythic) await addInventory(p, 'mythic', mythic)
          if (legendary) await addInventory(p, 'legendary', legendary)
          if (pet) await addInventory(p, 'pet', pet)
        }

        if (mythic > 0) {
          let str3 = 'Selamat ' + P + ' kalian mendapatkan item Rare Total *' + mythic * orang + '* Mythic Crate'
          m.reply(str3, c1, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c2 && ![c1, c3, c4].includes(c2)) m.reply(str3, c2, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c3 && ![c1, c2, c4].includes(c3)) m.reply(str3, c3, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c4 && ![c1, c2, c3].includes(c4)) m.reply(str3, c4, { contextInfo: { mentionedJid: this.parseMention(str3) } })
        }

        if (legendary > 0 || pet > 0) {
          let str3 = (mythic > 0 ? 'Dan juga' : 'Selamat ' + P + ' kalian') + ' mendapatkan item Epic Total ' + (pet > 0 && legendary > 0 ? `*${legendary * orang}* 🎁Legendary Crate dan *${pet * orang}* 📦Pet Crate` : pet > 0 && legendary < 1 ? `*${pet * orang}* 📦Pet Crate` : legendary > 0 && pet < 1 ? `*${legendary * orang}* 🎁Legendary Crate` : '')
          m.reply(str3, c1, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c2 && ![c1, c3, c4].includes(c2)) m.reply(str3, c2, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c3 && ![c1, c2, c4].includes(c3)) m.reply(str3, c3, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c4 && ![c1, c2, c3].includes(c4)) m.reply(str3, c4, { contextInfo: { mentionedJid: this.parseMention(str3) } })
        }

        if (HEALT.length > 0 || SDH.length > 0) {
          let sI = data(SDH)
          let H = data(HEALT)
          let str3 = `${SDH.length > 0 ? `⚔️Sword ${sI} Hancur, silahkan crafting ⚔️Sword kembali dengan mengetik *${usedPrefix}craft sword*` : ''} ${HEALT.length > 0 ? `❤️Nyawa ${H} habis, silahkan isi ❤️Nyawa dengan mengetik ${usedPrefix}heal` : ''}`

          m.reply(str3, c1, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c2 && ![c1, c3, c4].includes(c2)) m.reply(str3, c2, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c3 && ![c1, c2, c4].includes(c3)) m.reply(str3, c3, { contextInfo: { mentionedJid: this.parseMention(str3) } })
          if (c4 && ![c1, c2, c3].includes(c4)) m.reply(str3, c4, { contextInfo: { mentionedJid: this.parseMention(str3) } })
        }
        delete global.dungeon[room.id]
      }, pickRandom([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000]))
    }
    if (global.dungeon && room.state == 'PLAYING') delete global.dungeon[room.id]
  }
}

handler.help = ['dungeon'].map(v => v + ' *[nama room]*')
handler.tags = ['rpg']
handler.command = /^(dungeon)$/i
handler.mods = false
module.exports = handler

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function M(jid) {
  return '@' + jid.split('@')[0]
}

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function data(DATA) {
  let panjang = DATA.length * 1
  let msg = ''
  DATA.forEach(player => {
    if (panjang == 1) msg += `*${M(player)}*`
    else {
      if (DATA.indexOf(player) !== (panjang - 1)) msg += `*${M(player)}*, `
      else msg += `dan *${M(player)}*`
    }
  })
  return msg
}
