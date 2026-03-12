//rpg-buah
const { getUser } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let buah = `GUDANG BUAH

🍌 ${user.pisang || 0} Pisang
🍇 ${user.anggur || 0} Anggur 
🥭 ${user.mangga || 0} Mangga
🍊 ${user.jeruk || 0} Jeruk
🍎 ${user.apel || 0} Apel

Gunakan Command ${usedPrefix}sell Untuk Menjual Buah !`

    conn.reply(m.chat, buah, m)
}
handler.help = ['buah']
handler.tags = ['rpg']
handler.command = /^(buah|listbuah)$/i

module.exports = handler