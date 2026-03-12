//rpg-hunter
const { getUser, updateEconomy, updateUser, updateRpg, updateCooldown, getTool, setTool } = require('../../lib/database')

let handler = async (m, { conn, text }) => {
  let monsters = [
    { name: "Goblin" }, { name: "Slime" }, { name: "Wolf" },
    { name: "Nymph" }, { name: "Skeleton" }, { name: "Baby Demon" },
    { name: "Ghost" }, { name: "Zombie" }, { name: "Imp" },
    { name: "Witch" }, { name: "Ghoul" }, { name: "Giant Scorpion" },
    { name: "Unicorn" }, { name: "Baby Robot" }, { name: "Sorcerer" },
    { name: "Cecaelia" }, { name: "Giant Piranha" }, { name: "Mermaid" },
    { name: "Giant Crocodile" }, { name: "Nereid" }, { name: "Demon" },
    { name: "Harpy" }, { name: "Killer Robot" }, { name: "Dullahan" },
    { name: "Manticore" }, { name: "Assassin Robot" }, { name: "Giant Golem" },
    { name: "Gargoyle" }, { name: "Ogre" }, { name: "Cyborg" }
  ]
  
  let player = await getUser(m.sender)
  if (!player) return
  
  let pengirim = m.sender.split("@")[0]
  let lasthunt = Number(player.lasthunt || 0)
  let __timers = (Date.now() - lasthunt)
  let _timers = (120000 - __timers)
  let timers = clockString(_timers)

  if (Date.now() - lasthunt > 120000) {
    let sword = await getTool(m.sender, 'sword')
    if (!sword) return m.reply('❌ Kamu belum memiliki pedang! Ketik .craft sword terlebih dahulu.')
    if ((player.health || 0) < 20) return m.reply('❤️ Nyawamu terlalu rendah untuk berburu! Ketik .heal')

    let monster = monsters[Math.floor(Math.random() * monsters.length)]
    let monsterName = monster.name

    let coins = parseInt(Math.floor(Math.random() * 100000))
    let exp = parseInt(Math.floor(Math.random() * 10000))
    let healing = parseInt(Math.floor(Math.random() * 10))

    let isDead = Math.random() < 0.1 // 10% chance to die

    if (isDead) {
      let msg = `Tidakkk 😭, Kamu terbunuh saat berburu *${monsterName}*!\n\nNyawamu habis.`
      let newDura = (sword.durability || 40) - 5
      
      if (newDura <= 0) {
          msg += `\n⚔️ Pedangmu hancur!`
          await setTool(m.sender, 'sword', null)
      } else {
          msg += `\n⚔️ Durability pedang berkurang -5 (Sisa: ${newDura})`
          await setTool(m.sender, 'sword', { durability: newDura })
      }
      
      await updateRpg(m.sender, { health: 0 })
      await updateCooldown(m.sender, { lasthunt: Date.now() })
      
      return conn.reply(m.chat, msg, m)
    }

    let newHealth = (player.health || 100) - healing
    let newDura = (sword.durability || 40) - 1

    await updateEconomy(m.sender, { money: (player.money || 0) + coins, tiketcoin: (player.tiketcoin || 0) + 1 })
    await updateUser(m.sender, { exp: (player.exp || 0) + exp })
    await updateRpg(m.sender, { health: Math.max(0, newHealth) })
    await updateCooldown(m.sender, { lasthunt: Date.now() })

    if (newDura <= 0) {
        await setTool(m.sender, 'sword', null)
    } else {
        await setTool(m.sender, 'sword', { durability: newDura })
    }
    
    let pesan = `Berhasil menemukan *${monsterName}*\n*@${pengirim}* Kamu sudah membunuhnya\n\nMendapatkan:\n💵 ${new Intl.NumberFormat('en-US').format(coins)} Money\n✨ ${new Intl.NumberFormat('en-US').format(exp)} XP\n🎟️ +1 Tiketcoin\n\n❤️ Berkurang -${healing} Health, Tersisa ${newHealth} Health\n⚔️ Durability Pedang -1`
    
    conn.reply(m.chat, pesan, m)
  } else {
      return conn.reply(m.chat, `Tunggu *${timers}* Untuk Berburu Lagi`, m)
  }
}

handler.help = ['hunter']
handler.tags = ['rpg']
handler.command = /^hunter/i
handler.registered = true
handler.group = true
handler.fail = null

module.exports = handler

function clockString(ms) {
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [m, s].map(v => v.toString().padStart(2, 0)).join(':')
}