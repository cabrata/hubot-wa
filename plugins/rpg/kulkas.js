//rpg-kulkas
const { getUser } = require('../../lib/database')

let handler = async (m, {command, usedPrefix, args}) => {
	let user = await getUser(m.sender)
    if (!user) return
	
    const list = `╭───────────────
│⬡ 🍖 *Ayam bakar* : ${user.ayambakar || 0}
│⬡ 🍖 *Ikan bakar* : ${user.ikanbakar || 0}
│⬡ 🍖 *Lele bakar* : ${user.lelebakar || 0}
│⬡ 🍖 *Nila bakar* : ${user.nilabakar || 0}
│⬡ 🍖 *Bawal bakar* : ${user.bawalbakar || 0}
│⬡ 🍖 *Udang bakar* : ${user.udangbakar || 0}
│⬡ 🍖 *Paus bakar* : ${user.pausbakar || 0}
│⬡ 🍖 *Kepiting bakar* : ${user.kepitingbakar || 0}
│⬡ 🍗 *Ayam goreng* : ${user.ayamgoreng || 0}
│⬡ 🥘 *Rendang* : ${user.rendang || 0}
│⬡ 🥩 *Steak* : ${user.steak || 0}
│⬡ 🥠 *Babi panggang* : ${user.babipanggang || 0}
│⬡ 🍲 *Gulai ayam* : ${user.gulai || 0}
│⬡ 🍜 *Opor ayam* : ${user.oporayam || 0}
│⬡ 🍞 *Roti* : ${user.roti || 0}
│⬡ 🍣 *Sushi* : ${user.sushi || 0}
│⬡ 🍷 *Vodka* : ${user.vodka || 0}
╰───────────────`.trim()

    conn.reply(m.chat, list, m)
}
handler.help = ['kulkas']
handler.tags = ['rpg']
handler.command = /^(kulkas)$/i
module.exports = handler