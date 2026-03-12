//rpg-banteng
const { getUser } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix }) => {
	let user = await getUser(m.sender)
    if (!user) return

	let cap = `*━━━ ❨ Kandang Buruan ❩ ━━┄┈*

=> *Berikut Kandang :* @${m.sender.split`@`[0]}

*🐂 = [ ${user.banteng || 0} ] banteng*
*🐅 = [ ${user.harimau || 0} ] harimau*
*🐘 = [ ${user.gajah || 0} ] gajah*
*🐐 = [ ${user.kambing || 0} ] kambing*
*🐼 = [ ${user.panda || 0} ] panda*
*🐊 = [ ${user.buaya || 0} ] buaya*
*🐃 = [ ${user.kerbau || 0} ] kerbau*
*🐮 = [ ${user.sapi || 0} ] sapi*
*🐒 = [ ${user.monyet || 0} ] monyet*
*🐗 = [ ${user.babihutan || 0} ] babihutan*
*🐖 = [ ${user.babi || 0} ] babi*
*🐓 = [ ${user.ayam || 0} ] ayam*

Gunakan *${usedPrefix}pasar* untuk dijual atau *${usedPrefix}cook* untuk dijadikan bahan masakan.`

	conn.reply(m.chat, cap, m, { mentions: await conn.parseMention(cap) } )
}

handler.help = ['kandang']
handler.tags = ['rpg']
handler.command = /^(kandang)$/i

module.exports = handler