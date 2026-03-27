//rpg-atm(narik)
const { getUser, updateEconomy } = require('../../lib/database')
const moneymins = 1

let handler = async (m, { conn, command, args }) => {
  let user = await getUser(m.sender)
  if (!user) return

  let count = command.replace(/^pull/i, '')
  count = count ? /all/i.test(count) ? Math.floor(user.bank / moneymins) : parseInt(count) : args[0] ? parseInt(args[0]) : 1
  count = Math.max(1, count)
  
  if (user.bank >= moneymins * count) {
    await updateEconomy(m.sender, {
      bank: user.bank - (moneymins * count),
      money: user.money + count
    })
    conn.reply(m.chat, `🚩 -${moneymins * count} ATM\n+ ${count} Money`, m)
  } else {
    conn.reply(m.chat, `🚩 Your ATM balance is ${user.bank} !!`, m)
  }
}

handler.help = ['pull *<amount>*', 'pullall']
handler.tags = ['rpg']
handler.command = /^pull([0-9]+)|pull|pullall$/i
//handler.limit = false
handler.register = true

module.exports = handler