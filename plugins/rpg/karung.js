//rpg-karung
const { getUser } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix }) => {
	let user = await getUser(m.sender)
    if (!user) return

	let cap = `*━ ❨ Karung Hasil Mulung ❩ ━*

=> *Berikut Karung :* @${m.sender.split`@`[0]}

*Kaleng = [ ${user.kaleng || 0} ]*
*Botol = [ ${user.botol || 0} ]*
*Kardus = [ ${user.kardus || 0} ]*
*Sampah = [ ${user.sampah || 0} ]*

Gunakan *${usedPrefix}sell* untuk dijual`

	conn.reply(m.chat, cap, m, { mentions: await conn.parseMention(cap) } )
}

handler.help = ['karung']
handler.tags = ['rpg']
handler.command = /^(karung)$/i

module.exports = handler