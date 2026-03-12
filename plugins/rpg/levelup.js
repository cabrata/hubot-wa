const levelling = require('../../lib/levelling.js')
const { updateUser } = require('../../lib/database') // getUser dihapus karena kita pakai m.user

let handler = async m => {
  let user = m.user; // Baca pakai m.user
  if (!user) return

  // Paksa semua variabel jadi Number biasa biar nggak bentrok sama BigInt
  let currentLevel = Number(user.level || 0)
  let currentExp = Number(user.exp || 0)

  if (!levelling.canLevelUp(currentLevel, currentExp, global.multiplier)) {
    let { min, xp, max } = levelling.xpRange(currentLevel, global.multiplier)
    
    // Convert juga hasil dari levelling.js ke Number
    let nMin = Number(min)
    let nMax = Number(max)
    let nXp = Number(xp)

    throw `\nLevel *${currentLevel} (${currentExp - nMin} / ${nXp})*\nKurang *${nMax - currentExp}* lagi!\n`.trim()
  }
  
  let before = currentLevel
  
  while (levelling.canLevelUp(currentLevel, currentExp, global.multiplier)) currentLevel++
  
  if (before !== currentLevel) {
      // 1. Save permanen ke DB
      await updateUser(m.sender, { level: currentLevel })
      
      // 2. Paksa update cache lokal
      user.level = currentLevel;
      
      m.reply(`\nSelamat, anda telah naik level!\n*${before}* -> *${currentLevel}*\ngunakan *.profile* untuk mengecek\n\t`.trim())
  }
}

handler.help = ['levelup']
handler.tags = ['xp']
handler.command = /^level(|up)$/i

module.exports = handler
