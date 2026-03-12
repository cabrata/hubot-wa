const { getUser, updateEconomy } = require('../../lib/database')

let handler = async (m, { args }) => {
    if (args.length !== 1) {
        return m.reply('• *Example :* .pointomoney 1000')
    }
    let poin = parseInt(args[0])
    if (isNaN(poin) || poin < 1) {
        throw 'Jumlah poin yang ingin dikonversi harus lebih dari atau sama dengan 1!'
    }

    let user = await getUser(m.sender)
    if (!user) return

    let currentPoin = user.poin || 0
    if (poin > currentPoin) {
        throw `Maaf, kamu tidak memiliki cukup poin untuk dikonversi.\nPoin kamu saat ini: ${currentPoin.toLocaleString()}`
    }

    let fee = Math.round(poin * 0.05) // Pajak admin 5%
    let moneyp = poin - fee

    let message = `💳 *KONVERSI POIN -> MONEY*\n\n`
    message += `• Poin Ditukar: ${poin.toLocaleString()}\n`
    message += `• Potongan (Fee 5%): ${fee.toLocaleString()}\n`
    message += `• Money Didapat: ${moneyp.toLocaleString()}`

    await updateEconomy(m.sender, {
        poin: currentPoin - poin,
        money: (user.money || 0) + moneyp
    })

    m.reply(message)
}

handler.help = ['pointomoney *<jumlah>*']
handler.tags = ['rpg']
handler.command = /^pointomoney$/i
handler.register = true
//handler.limit = true

module.exports = handler
