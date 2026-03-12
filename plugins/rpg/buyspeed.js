//rpg-buyspeed
const { getUser, updateEconomy, updateRpg } = require('../../lib/database')

let handler = async (m, { conn, args }) => {
	if (!args[0] || isNaN(args[0])) {
		throw '*Example*: .buyspeed 100';
	}

	let count = parseInt(args[0]);
	let hrg = 50000;
	let price = count * hrg;
	
	let user = await getUser(m.sender);
    if (!user) return;

    if (price < 0) throw 'Nominal pembelian tidak boleh dibawah 0';
	if (price > (user.money || 0)) {
		throw `Maaf, uang kamu tidak cukup untuk membeli ${count} speed. Harga 1 speed adalah ${hrg} money.\n\nMembutuhkan ${price} Money.`;
	}
	
	await updateEconomy(m.sender, { money: user.money - price });
	await updateRpg(m.sender, { speed: (user.speed || 0) + count });
	
	conn.reply(m.chat, `Berhasil membeli ${count} speed dengan harga ${price} money.`, m);
}

handler.help = ['buyspeed <jumlah>'];
handler.tags = ['rpg'];
handler.command = /^buyspeed$/i;
handler.register = true;

module.exports = handler;