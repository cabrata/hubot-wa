//rpg-berdagang
const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, text }) => {
  let dapat = (Math.floor(Math.random() * 5000))
  let who
  if (m.isGroup) who = m.mentionedJid[0]
  else who = m.chat
  if (!who) throw '• *Example :* .berdagang @user'
  
  let target = await getUser(who)
  let user = await getUser(m.sender)
  if (!target) throw 'Pengguna tidak ada didalam database'
  
  let lastdagang = Number(user.lastdagang || 0)
  let __timers = (Date.now() - lastdagang)
  let _timers = (28800000 - __timers) 
  let timers = clockString(_timers)

  if (Date.now() - lastdagang > 28800000){
    if (4999 > target.money) throw 'Target tidak memiliki modal harap masukkan modal 5000'
    if (4999 > user.money) throw 'kamu tidak memiliki modal harap masukkan modal 5000'
    
    // Potong modal awal
    await updateEconomy(who, { money: target.money - dapat })
    await updateEconomy(m.sender, { money: user.money - dapat })
    await updateCooldown(m.sender, { lastdagang: Date.now() })
    
    conn.reply(m.chat, `Mohon tunggu kak..\nKamu dan @${who.split`@`[0]} sedang berdagang.. 😅\n\nKamu dan @${who.split`@`[0]} meletakkan modal -${dapat} 😅`, m)
    
    // Fungsi khusus buat nambah uang secara asinkron (karena nunggu sejam)
    const tambahMoney = async (jml) => {
        let freshUser = await getUser(m.sender)
        let freshTarget = await getUser(who)
        if (freshUser) await updateEconomy(m.sender, { money: freshUser.money + jml })
        if (freshTarget) await updateEconomy(who, { money: freshTarget.money + jml })
        
        let newUsr = await getUser(m.sender) // Tarik ulang buat ditampilin di pesan
        let newTgt = await getUser(who)
        conn.reply(m.chat, `Selamat kamu dan @${who.split`@`[0]} mendapatkan money..\n\nPenghasilan dagang kamu didapatkan +${jml}\n${newUsr.money} money kamu\n\nPenghasilan dagang @${who.split`@`[0]} didapatkan +${jml}\n${newTgt.money} money @${who.split`@`[0]}`, m)
    }

    setTimeout(() => { tambahMoney(5000) }, 3600000)
    setTimeout(() => { tambahMoney(5000) }, 7200000)
    setTimeout(() => { tambahMoney(5000) }, 10800000)
    setTimeout(() => { tambahMoney(5000) }, 14400000)
    setTimeout(() => { tambahMoney(5000) }, 18000000)
    setTimeout(() => { tambahMoney(5000) }, 21600000)
    setTimeout(() => { tambahMoney(5000) }, 25200000)
    setTimeout(() => { tambahMoney(10000) }, 28800000)
    
  } else {
      conn.reply(m.chat, `Anda Sudah Berdagang , tunggu ${timers} lagi..`, m)
  }
}
handler.help = ['berdagang *@tag*']
handler.tags = ['rpg']
handler.command = /^berdagang$/
handler.register = true
handler.group = true

module.exports = handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0) ).join(':')
}