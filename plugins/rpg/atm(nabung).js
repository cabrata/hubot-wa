const { getUser, updateEconomy } = require('../../lib/database')

let handler = async (m, { conn, command, args, usedPrefix }) => {
    let user = await getUser(m.sender)
    if (!user) return m.reply('❌ Kamu belum terdaftar di database.')

    // Ambil data uang (support konversi dari BigInt ke Number)
    let userMoney = Number(user.economy?.money || user.money || 0)
    let userBank = Number(user.economy?.bank || user.bank || 0)

    // Cek apakah user mau nabung semuanya (.atm all / .atmall)
    let isAll = command.toLowerCase().endsWith('all') || (args[0] && args[0].toLowerCase() === 'all')
    let count = isAll ? userMoney : parseInt(args[0])

    // Deteksi kalau ngetiknya digabung, misal: .atm50000
    let match = command.match(/^atm([0-9]+)$/i)
    if (match) {
        count = parseInt(match[1])
    }

    // Validasi input angka
    if (!count || isNaN(count) || count < 1) {
        return m.reply(`❓ Masukkan jumlah money yang ingin ditabung ke Bank.\nContoh: *${usedPrefix}atm 100000* atau *${usedPrefix}atm all*`)
    }

    // Validasi uang cukup atau nggak
    if (userMoney < count) {
        return m.reply(`🚩 Uang kamu tidak cukup!\nUang di dompetmu saat ini hanya: *Rp ${userMoney.toLocaleString('id-ID')}*`)
    }

    try {
        // Eksekusi pemindahan uang dari Dompet (money) ke Bank
        await updateEconomy(m.sender, {
            money: userMoney - count,
            bank: userBank + count
        })

        let str = `🏦 *TRANSAKSI BERHASIL* 🏦\n\n`
        str += `Berhasil menyimpan uang ke dalam rekening Bank!\n\n`
        str += `💸 Dompet: - Rp ${count.toLocaleString('id-ID')}\n`
        str += `💳 Bank: + Rp ${count.toLocaleString('id-ID')}\n\n`
        str += `*Sisa di dompet:* Rp ${(userMoney - count).toLocaleString('id-ID')}\n`
        str += `*Total di Bank:* Rp ${(userBank + count).toLocaleString('id-ID')}`

        conn.reply(m.chat, str.trim(), m)
    } catch (e) {
        console.error(e)
        m.reply('⚠️ Terjadi kesalahan sistem saat memproses transaksi bank.')
    }
}

handler.help = ['atm <jumlah>', 'atm all']
handler.tags = ['rpg']
handler.command = /^(atm([0-9]+)|atm|atmall|nabung)$/i
//handler.limit = true

module.exports = handler
