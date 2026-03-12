const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix }) => {
    try {
        let user = await getUser(m.sender)
        if (!user) return

        let lastngepet = Number(user.lastngepet || 0)
        let __timers = (Date.now() - lastngepet)
        let _timers = (18000000 - __timers) 
        let timers = clockString(_timers)

        if (Date.now() - lastngepet > 18000000) { // 5 hours
            let randomaku = Math.floor(Math.random() * 150)
            let randomkamu = Math.floor(Math.random() * 20) 
            
            if (randomaku > randomkamu) {
                // Di-floor di angka 0 aja hutangnya biar nggak - minus kebablasan
                await updateEconomy(m.sender, { money: Math.max(0, (user.money || 0) - 10000000) })
                await updateCooldown(m.sender, { lastngepet: Date.now() })
                
                conn.sendMessage(m.chat, {
                    text: `Kamu lengah Saat Ngepet, Dan Kamu Mines -10 Juta`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Nooo, Kamu ketahuan warga 😞',
                            body: global.wm,
                            thumbnailUrl: 'https://telegra.ph/file/c6c4a6946a354317fe970.jpg',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                })
            } else if (randomaku < randomkamu) {
                await updateEconomy(m.sender, { money: (user.money || 0) + 5000000 })
                await updateCooldown(m.sender, { lastngepet: Date.now() })
                
                conn.sendMessage(m.chat, {
                    text: `Kamu berhasil Ngepet, Dan kamu mendapatkan 5 Juta rupiah`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Selamat Telah Mendapatkan 5JT',
                            body: global.wm,
                            thumbnailUrl: 'https://telegra.ph/file/6a6a440d7f123bed78263.jpg',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                })
            } else {
                await updateCooldown(m.sender, { lastngepet: Date.now() })
                conn.sendMessage(m.chat, `Maaf kamu tidak mendapatkan *Duit* dan kamu tidak masuk Dunia Lain karna melarikan diri\n${global.wm}`, m)
            }
        } else {
            conn.sendMessage(m.chat, {
                text: `Kamu sudah melakukan *ngepet*\nDan kamu harus menunggu selama agar bisa ngepet kembali ${timers}`,
                contextInfo: {
                    externalAdReply: {
                        title: 'C O O L D O W N',
                        body: `${timers}`,
                        thumbnailUrl: 'https://telegra.ph/file/295949ff5494f3038f48c.jpg',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            })
        }
    } catch (e) {
        console.error(e)
    }
}

handler.help = ['ngepet']
handler.tags = ['rpg']
handler.command = /^(ngepet|ngefet)$/i
handler.group = true
handler.registered = true
module.exports = handler

function clockString(ms) {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0') ).join(':')
}
