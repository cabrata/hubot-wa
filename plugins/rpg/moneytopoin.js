const { getUser, updateEconomy } = require('../../lib/database')

let handler = async (m, { conn, args }) => {
    if (args.length !== 1) {
        return conn.reply(m.chat, 'Silakan masukkan jumlah uang yang ingin diubah menjadi poin! Contoh: .moneytopoin 1000', m)
    }
    
    let money = parseInt(args[0])
    if (isNaN(money) || money <= 0) {
        throw 'Jumlah uang yang dimasukkan harus angka positif!'
    }

    let user = await getUser(m.sender)
    if (!user) return

    // FIX BUG: Cek saldo uang agar tidak jadi minus
    if ((user.money || 0) < money) {
        return conn.reply(m.chat, `Uang kamu tidak cukup! Uangmu saat ini: ${user.money.toLocaleString()}`, m)
    }

    let fee = Math.floor(money * 0.5)
    let poin = Math.floor(money * 0.5)
    
    let message = `• Kamu menconvert uang senilai ${money.toLocaleString()}\n`
    message += `• Dan kamu mendapatkan poin senilai ${poin.toLocaleString()}\n`
    message += `• Biaya fee kamu adalah ${fee.toLocaleString()}`
    
    await updateEconomy(m.sender, {
        money: (user.money || 0) - money,
        poin: (user.poin || 0) + poin
    })
    
    conn.reply(m.chat, message, m)
}

handler.help = ['moneytopoin *<amount>*']
handler.tags = ['rpg']
handler.command = /^moneytopoin$/i
handler.registered = true
//handler.limit = true

module.exports = handler
