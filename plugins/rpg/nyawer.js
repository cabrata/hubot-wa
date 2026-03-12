const { getUser, updateEconomy } = require('../../lib/database')

let handler = async(m, { groupMetadata, command, conn, text, args, usedPrefix }) => {
    if (!args[0] || isNaN(args[0])) {
        throw '*Example*: .sawer 1000';
    }
    if (parseInt(args[0]) < 0) throw 'Sawer harus lebih dari 0';
    let count = parseInt(args[0]);
    
    let ps = groupMetadata.participants.map(v => v.id);
    let a = ps[Math.floor(Math.random() * ps.length)]; 

    let user = await getUser(m.sender);
    let aa = await getUser(a);
    if (!user) return;
    if (!aa) return m.reply('Target sawer belum terdaftar di database.');
    
    if ((user.money || 0) < count) return m.reply(`Money kamu tidak cukup untuk sawer sebanyak ${count}`);

    await updateEconomy(m.sender, { money: (user.money || 0) - count });
    await updateEconomy(a, { money: (aa.money || 0) + count });

    let hsl = `*@${a.split`@`[0]}* Kamu mendapatkan saweran dari @${m.sender.split`@`[0]} sebesar *${count}* `;
    conn.reply(m.chat, hsl, m, { mentions: [a, m.sender] });
}

handler.help = ['sawer'];
handler.tags = ['rpg'];
handler.command = /^(sawer|nyawer)$/i;
handler.group = true;
handler.registered = true
module.exports = handler;
