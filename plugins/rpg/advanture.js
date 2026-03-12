//rpg-advanture
const { getUser, updateUser, updateRpg, updateEconomy, updateCooldown, getTool, setTool, addInventory } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix, owner }) => {
    try {
        let user = await getUser(m.sender) // Wajib pakai await sekarang
        if (!user) return

        let sword = await getTool(m.sender, 'sword')
        let armor = await getTool(m.sender, 'armor')

        if (!sword) {
            return conn.reply(m.chat, '⚔️ Kamu belum memiliki sword, ketik *' + usedPrefix + 'craft sword* untuk memulai adventure', m)
        }
        if (!armor) {
            return conn.reply(m.chat, '🛡️ Kamu belum memiliki armor, ketik *' + usedPrefix + 'craft armor* untuk memulai adventure', m)
        }

        let lastadventure = Number(user.lastadventure || 0)
        let __timers = (Date.now() - lastadventure)
        let _timers = (600000 - __timers)
        let timers = clockString(_timers)

        if (user.health > 79) {
            if (Date.now() - lastadventure > 600000) {
                let monsters = [
                    { name: 'Goblin', health: 20, attack: 5 },
                    { name: 'Troll', health: 50, attack: 10 },
                    { name: 'Dragon', health: 100, attack: 20 },
                    // ... [Sengaja dipotong biar rapi, masukin array monsters & bosses asli kamu ke sini] ...
                    { name: 'Elder God', health: 2000, attack: 200 }
                ]

                let isBoss = Math.random() < 0.1
                let enemy = isBoss ? monsters[monsters.length - 1] : monsters[Math.floor(Math.random() * 10)] // Contoh
                let enemyHealth = enemy.health
                let enemyAttack = enemy.attack
                let userAttack = 10 
                let currentHealth = user.health

                while (currentHealth > 0 && enemyHealth > 0) {
                    enemyHealth -= userAttack
                    if (enemyHealth > 0) {
                        currentHealth -= enemyAttack
                    }
                }

                if (currentHealth <= 0) {
                    return conn.reply(m.chat, `😵 Kamu kalah dalam pertarungan melawan ${enemy.name}. Sehatkan diri terlebih dahulu.`, m)
                }

                let healtMinus = user.health - currentHealth
                let exp = Math.floor(Math.random() * 10000)
                let uang = Math.floor(Math.random() * 100000)
                let potion = Math.floor(Math.random() * 3) + 1
                let sampah = Math.floor(Math.random() * 50) + 1
                let diamond = Math.floor(Math.random() * 10) + 1
                let common = Math.floor(Math.random() * 3) + 1
                let uncommon = Math.floor(Math.random() * 2) + 1
                let mythic = pickRandom([1, 3, 1, 1, 2])
                let legendary = pickRandom([1, 3, 1, 1, 2])
                
                let itemrand = [`*Selamat anda mendapatkan item rare yaitu*\n${mythic} 🎁 Mythic Crate`, `*Selamat kamu mendapatkan item rare yaitu*\n${legendary} 🎁 Legendary Crate`]
                let rendem = itemrand[Math.floor(Math.random() * itemrand.length)]
                let peta = pickRandom(['🏯 Jepang', '🇰🇷 Korea', '🏝️ Bali', '🇺🇸 Amerika']) // Tambahin sisa petamu

                let str = `
🩸 Nyawa mu berkurang -${healtMinus} karena Kamu telah berpetualang sampai ${peta} dan melawan ${enemy.name}. Kamu mendapatkan:
✨ *Exp:* ${exp}
💰 *Uang:* ${uang}
🎫 *Tiketcoin:* 1
🗑️ *Sampah:* ${sampah}${potion == 0 ? '' : '\n🧪 *Potion:* ' + potion + ''}${diamond == 0 ? '' : '\n💎 *Diamond:* ' + diamond + ''}${common == 0 ? '' : '\n📦 *Common crate:* ' + common + ''}${uncommon == 0 ? '' : '\n🎁 *Uncommon crate:* ' + uncommon + ''}
`.trim()

                setTimeout(() => {
                    conn.reply(m.chat, str, m, {
                        contextInfo: {
                            externalAdReply: {
                                mediaType: 1, title: wm, thumbnailUrl: 'https://telegra.ph/file/221ec27b2997f203569eb.jpg', renderLargerThumbnail: true, sourceUrl: ''
                            }
                        }
                    })
                }, 0)
                setTimeout(() => { conn.reply(m.chat, rendem, m) }, 1000)

                // Save ke SQL
                await updateUser(m.sender, { exp: user.exp + exp })
                await updateRpg(m.sender, { health: currentHealth, potion: user.potion + potion, sampah: user.sampah + sampah })
                await updateEconomy(m.sender, { money: user.money + uang, tiketcoin: user.tiketcoin + 1, diamond: user.diamond + diamond })
                await updateCooldown(m.sender, { lastadventure: Date.now() })
                
                await addInventory(m.sender, 'common', common)
                await addInventory(m.sender, 'uncommon', uncommon)
                await addInventory(m.sender, 'mythic', mythic)
                await addInventory(m.sender, 'legendary', legendary)

                // Durability Tools
                let newSwordDurability = (sword.durability || 100) - 1
                let newArmorDurability = (armor.durability || 100) - 1

                if (newSwordDurability <= 0) {
                    await setTool(m.sender, 'sword', null)
                    conn.reply(m.chat, '⚔️ Sword kamu telah rusak, craft lagi untuk melanjutkan adventure.', m)
                } else {
                    await setTool(m.sender, 'sword', { ...sword, durability: newSwordDurability })
                }

                if (newArmorDurability <= 0) {
                    await setTool(m.sender, 'armor', null)
                    conn.reply(m.chat, '🛡️ Armor kamu telah rusak, craft lagi untuk melanjutkan adventure.', m)
                } else {
                    await setTool(m.sender, 'armor', { ...armor, durability: newArmorDurability })
                }

            } else {
                conn.reply(m.chat, `💧 Anda sudah berpetualang dan kelelahan, silahkan coba *${timers}* lagi`, m)
            }
        } else {
            conn.reply(m.chat, '🩸 Minimal 80 health untuk bisa berpetualang, beli nyawa dulu dengan ketik *' + usedPrefix + 'shop buy potion <jumlah>*\ndan ketik *' + usedPrefix + 'use potion <jumlah>*', m)
        }
    } catch (e) {
        console.log(e)
        conn.reply(m.chat, 'Error', m)
    }
}

handler.help = ['adventure']
handler.tags = ['rpg']
handler.command = /^(adventure)$/i
handler.limit = false
handler.group = true
handler.fail = null
module.exports = handler

function pickRandom(list) { return list[Math.floor(Math.random() * list.length)] }
function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}