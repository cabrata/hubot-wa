//rpg-feed
const { getUser, updateCooldown, updateUser, addInventory } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix }) => {
	let info = `
乂 List Pet:
🐈 • kucing
🐕 • anjing
🦊 • rubah
🐺 • serigala
🐦‍🔥 • phonix
🤖 • robo

*➠ Example:* ${usedPrefix}feed kucing
`.trim()
    let pesan = pickRandom(['ɴʏᴜᴍᴍᴍ~', 'ᴛʜᴀɴᴋs', 'ᴛʜᴀɴᴋʏᴏᴜ ^-^', 'ᴛʜᴀɴᴋ ʏᴏᴜ~', 'ᴀʀɪɢᴀᴛᴏᴜ ^-^'])
    let type = (args[0] || '').toLowerCase()
    let emo = (type == 'rubah' ? '🦊':'' || type == 'kucing' ? '🐈':'' || type == 'anjing' ? '🐕':'' || type == 'serigala' ? '🐺':'' || type == 'phonix'? '🐦‍🔥':'' || type == 'robo' ? '🤖' : '' ) 
    
    let user = await getUser(m.sender)
    if (!user) return

    let rubah = user.rubah || 0
    let kucing = user.kucing || 0
    let anjing = user.anjing || 0
    let serigala = user.serigala || 0
    let phonix = user.phonix || 0
    let robo = user.robo || 0

    switch (type) {
        case 'rubah':
            if (rubah == 0) return m.reply('*kamu tidak memiliki pet ini*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet')
            if (rubah == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')
            let __waktur = (Date.now() - (Number(user.rubahlastclaim) || 0))
            let _waktur = (600000 - __waktur)
            let waktur = clockString(_waktur)
            if (__waktur > 600000) {
                if ((user.makananpet || 0) > 0) {
                    await addInventory(m.sender, 'makananpet', -1)
                    await updateUser(m.sender, { rubahexp: (user.rubahexp || 0) + 20 })
                    await updateCooldown(m.sender, { rubahlastclaim: Date.now() })
                    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} :* ${pesan}`)
                    
                    let currentUser = await getUser(m.sender)
                    if (rubah > 0) {
                        let naiklvl = ((rubah * 100) - 1)
                        if (currentUser.rubahexp > naiklvl) {
                            await updateUser(m.sender, { rubah: rubah + 1, rubahexp: currentUser.rubahexp - (rubah * 100) })
                            m.reply(`*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ`)
                        }
                    }
                } else m.reply(`*kamu tidak memiliki makanan pet*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet`)
            } else m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${waktur}*`)
            break
        case 'kucing':
            if (kucing == 0) return m.reply('*kamu tidak memiliki pet ini*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet')
            if (kucing == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')
            let __waktuc = (Date.now() - (Number(user.kucinglastclaim) || 0))
            let _waktuc = (600000 - __waktuc)
            let waktuc = clockString(_waktuc)
            if (__waktuc > 600000) {
                if ((user.makananpet || 0) > 0) {
                    await addInventory(m.sender, 'makananpet', -1)
                    await updateUser(m.sender, { kucingexp: (user.kucingexp || 0) + 20 })
                    await updateCooldown(m.sender, { kucinglastclaim: Date.now() })
                    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} :* ${pesan}`)
            
                    let currentUser = await getUser(m.sender)
                    if (kucing > 0) {
                        let naiklvl = ((kucing * 100) - 1)
                        if (currentUser.kucingexp > naiklvl) {
                            await updateUser(m.sender, { kucing: kucing + 1, kucingexp: currentUser.kucingexp - (kucing * 100) })
                            m.reply(`*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ`)
                        }
                    }
                } else m.reply(`*kamu tidak memiliki makanan pet*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet`)
            } else m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${waktuc}*`)
            break
         case 'serigala':
            if (serigala == 0) return m.reply('*kamu tidak memiliki pet ini*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet')
            if (serigala == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')
            let __waktub = (Date.now() - (Number(user.serigalalastclaim) || 0))
            let _waktub = (600000 - __waktub)
            let waktub = clockString(_waktub)
            if (__waktub > 600000) {
                if ((user.makananpet || 0) > 0) {
                    await addInventory(m.sender, 'makananpet', -1)
                    await updateUser(m.sender, { serigalaexp: (user.serigalaexp || 0) + 20 })
                    await updateCooldown(m.sender, { serigalalastclaim: Date.now() })
                    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} :* ${pesan}`)
            
                    let currentUser = await getUser(m.sender)
                    if (serigala > 0) {
                        let naiklvl = ((serigala * 100) - 1)
                        if (currentUser.serigalaexp > naiklvl) {
                            await updateUser(m.sender, { serigala: serigala + 1, serigalaexp: currentUser.serigalaexp - (serigala * 100) })
                            m.reply(`*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ`)
                        }
                    }
                } else m.reply(`*kamu tidak memiliki makanan pet*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet`)
            } else m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${waktub}*`)
            break
        case 'anjing':
            if (anjing == 0) return m.reply('*kamu tidak memiliki pet ini*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet')
            if (anjing == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')
            let __waktua = (Date.now() - (Number(user.anjinglastclaim) || 0))
            let _waktua = (600000 - __waktua)
            let waktua = clockString(_waktua)
            if (__waktua > 600000) {
                if ((user.makananpet || 0) > 0) {
                    await addInventory(m.sender, 'makananpet', -1)
                    await updateUser(m.sender, { anjingexp: (user.anjingexp || 0) + 20 })
                    await updateCooldown(m.sender, { anjinglastclaim: Date.now() })
                    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} :* ${pesan}`)
                    
                    let currentUser = await getUser(m.sender)
                    if (anjing > 0) {
                        let naiklvl = ((anjing * 100) - 1)
                        if (currentUser.anjingexp > naiklvl) {
                            await updateUser(m.sender, { anjing: anjing + 1, anjingexp: currentUser.anjingexp - (anjing * 100) })
                            m.reply(`*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ`)
                        }
                    }
                } else m.reply(`*kamu tidak memiliki makanan pet*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet`)
            } else m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${waktua}*`)
            break
        case 'phonix':
            if (phonix == 0) return m.reply('*kamu tidak memiliki pet ini*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet')
            if (phonix == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')
            let __waktuk = (Date.now() - (Number(user.phonixlastclaim) || 0))
            let _waktuk = (600000 - __waktuk)
            let waktuk = clockString(_waktuk)
            if (__waktuk > 600000) {
                if ((user.makananpet || 0) > 0) {
                    await addInventory(m.sender, 'makananpet', -1)
                    await updateUser(m.sender, { phonixexp: (user.phonixexp || 0) + 20 })
                    await updateCooldown(m.sender, { phonixlastclaim: Date.now() })
                    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} :* ${pesan}`)
                    
                    let currentUser = await getUser(m.sender)
                    if (phonix > 0) {
                        let naiklvl = ((phonix * 100) - 1)
                        if (currentUser.phonixexp > naiklvl) {
                            await updateUser(m.sender, { phonix: phonix + 1, phonixexp: currentUser.phonixexp - (phonix * 100) })
                            m.reply(`*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ`)
                        }
                    }
                } else m.reply(`*kamu tidak memiliki makanan pet*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet`)
            } else m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${waktuk}*`)
            break
        case 'robo':
            if (robo == 0) return m.reply('*kamu tidak memiliki pet ini*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet')
            if (robo == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')
            let __wakturb = (Date.now() - (Number(user.robolastfeed) || 0))
            let _wakturb = (600000 - __wakturb)
            let wakturb = clockString(_wakturb)
            if (__wakturb > 600000) {
                if ((user.makananpet || 0) > 0) {
                    await addInventory(m.sender, 'makananpet', -1)
                    await updateUser(m.sender, { roboexp: (user.roboexp || 0) + 20 })
                    await updateCooldown(m.sender, { robolastfeed: Date.now() })
                    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} :* ${pesan}`)
                    
                    let currentUser = await getUser(m.sender)
                    if (robo > 0) {
                        let naiklvl = ((robo * 100) - 1)
                        if (currentUser.roboexp > naiklvl) {
                            await updateUser(m.sender, { robo: robo + 1, roboexp: currentUser.roboexp - (robo * 100) })
                            m.reply(`*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ`)
                        }
                    }
                } else m.reply(`*kamu tidak memiliki makanan pet*\n\n> ketik .shop buy makananpet\nuntuk memberi makan pet`)
            } else m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${wakturb}*`)
            break
        default:
            return m.reply(info)
    }
}
handler.help = ['feed']
handler.tags = ['rpg']
handler.command = /^(feed(ing)?)$/i

handler.register = true
handler.rpg = true
module.exports = handler

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, ' H ', m, ' M ', s, ' S'].map(v => v.toString().padStart(2, 0)).join('')
}
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}