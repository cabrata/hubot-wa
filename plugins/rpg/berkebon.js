//rpg-berkebon
const { getUser, updateEconomy, updateCooldown, addInventory } = require('../../lib/database')
const timeout = 1800000

let handler = async (m, { conn, usedPrefix, text }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let apelu = user.bibitapel || 0
    let angguru = user.bibitanggur || 0
    let manggau = user.bibitmangga || 0
    let pisangu = user.bibitpisang || 0
    let jeruku = user.bibitjeruk || 0 
    
    let lastberkebon = Number(user.lastberkebon || 0)
    let time = lastberkebon + 1800000
    
    if (apelu == 0 || angguru == 0 || manggau == 0 || pisangu == 0 || jeruku == 0) {
        return conn.reply(m.chat, `*Pastikan kamu memiliki semua bibit*\n*Seperti Bibit Apel, Bibit Mangga, Bibit Jeruk, Bibit Pisang, Bibit Anggur*\n\nKetik :\n${usedPrefix}shop buy bibitmangga 100\n\n*List*\nbibitmangga\nbibitanggur\nbibitpisang\nbibitjeruk\nbibitapel`, m)
    }
    
    if (Date.now() - lastberkebon < 1800000) {
        return conn.reply(m.chat, `Anda sudah menanam\nMohon tunggu hasil panenmu\nTunggu selama ${msToTime(time - Date.now())} lagi`, m)
    }
    
    if (manggau > 99) {
        if (apelu > 99) {
            if (pisangu > 99) {
                if (jeruku > 99) {
                    if (angguru > 99) {
                        let pisangpoin = Math.floor(Math.random() * 100)
                        let anggurpoin = Math.floor(Math.random() * 100)
                        let manggapoin = Math.floor(Math.random() * 100)
                        let jerukpoin = Math.floor(Math.random() * 100)
                        let apelpoin = Math.floor(Math.random() * 100)
                        
                        // Menambahkan hasil panen ke inventory
                        await addInventory(m.sender, 'pisang', pisangpoin)
                        await addInventory(m.sender, 'anggur', anggurpoin)
                        await addInventory(m.sender, 'mangga', manggapoin)
                        await addInventory(m.sender, 'jeruk', jerukpoin)
                        await addInventory(m.sender, 'apel', apelpoin)
                        
                        // Menambahkan tiketcoin ke economy
                        await updateEconomy(m.sender, { tiketcoin: user.tiketcoin + 1 })
                        
                        // Mengurangi bibit dari inventory
                        await addInventory(m.sender, 'bibitpisang', -100)
                        await addInventory(m.sender, 'bibitanggur', -100)
                        await addInventory(m.sender, 'bibitmangga', -100)
                        await addInventory(m.sender, 'bibitjeruk', -100)
                        await addInventory(m.sender, 'bibitapel', -100)
                        
                        await updateCooldown(m.sender, { lastberkebon: Date.now() })
                        
                        conn.reply(m.chat, `Selamat kamu mendapatkan : \n+${pisangpoin} Pisang\n+${manggapoin} Mangga\n+${anggurpoin} Anggur\n+${jerukpoin} Jeruk\n+${apelpoin} Apel\n+1 Tiketcoin`, m)
                        
                        setTimeout(() => {
                            conn.reply(m.chat, `Waktunya berkebon lagi kak 😅`, m)
                        }, timeout)
                    } else m.reply(`Pastikan bibit anggur kamu *100* untuk bisa berkebon`)
                } else conn.reply(m.chat, `Pastikan bibit jeruk kamu *100* untuk bisa berkebon`, m)
            } else conn.reply(m.chat, `Pastikan bibit pisang kamu *100* untuk bisa berkebon`, m)
        } else conn.reply(m.chat, `Pastikan bibit apel kamu *100* untuk bisa berkebon`, m)
    } else conn.reply(m.chat, `Pastikan bibit mangga kamu *100* untuk bisa berkebon`, m)
}
handler.help = ['berkebon']
handler.tags = ['rpg']
handler.command = /^(berkebon)/i
handler.group = true
handler.registered = true

module.exports = handler

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  hours = (hours < 10) ? "0" + hours : hours
  minutes = (minutes < 10) ? "0" + minutes : minutes
  seconds = (seconds < 10) ? "0" + seconds : seconds
  return hours + " jam " + minutes + " menit " + seconds + " detik"
}