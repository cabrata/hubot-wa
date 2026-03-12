//rpg-buyattack
const { getUser, updateEconomy, updateRpg } = require('../../lib/database')

let handler = async (m, { conn, args }) => {
	if (!args[0] || isNaN(args[0])) {
		throw '*Example*: .buyattack 100';
	}

	let count = parseInt(args[0]);
	let hrg = 50000;
	let price = count * hrg;
	
	let user = await getUser(m.sender);
    if (!user) return;

    if (price < 0) throw 'Nominal pembelian tidak boleh dibawah 0';
	if (price > (user.money || 0)) {
		throw `Maaf, uang kamu tidak cukup untuk membeli ${count} attack. Harga 1 attack adalah ${hrg} money.\n\nMembutuhkan ${price} Money.`;
	}
	
	await updateEconomy(m.sender, { money: user.money - price });
	await updateRpg(m.sender, { attack: (user.attack || 0) + count });
	
	conn.reply(m.chat, `Berhasil membeli ${count} attack dengan harga ${price} money.`, m);
}

handler.help = ['buyattack <jumlah>'];
handler.tags = ['rpg'];
handler.command = /^buyattack$/i;
handler.register = true;

module.exports = handler;