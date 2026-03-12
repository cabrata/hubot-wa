//rpg-listpenjara
const { db, getUser } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    if (!user) return;
    
    if (user.job !== 'polisi') throw 'Anda harus menjadi polisi untuk melakukan tindakan ini.';
    
    // Tarik data jid langsung dari database SQL 
    let penjaraList = await db.user.findMany({
        where: {
            rpg: { jail: true }
        },
        select: { jid: true }
    });

    if (penjaraList.length === 0) {
        return conn.reply(m.chat, `乂 • *P E N J A R A*\n\n- Total : _0 User_\nPenjara saat ini kosong.`, m);
    }
    
    let listFormatted = penjaraList.map((u, i) => ` ${i + 1}. @${u.jid.split('@')[0]}`).join('\n');

    conn.reply(m.chat, `\n乂 • *P E N J A R A*\n\n- Total : _${penjaraList.length} User_\n${listFormatted}\n`, m, { 
        mentions: penjaraList.map(u => u.jid) 
    });
}
handler.help = ['listpenjara']
handler.tags = ['rpg']
handler.command = /^penjaralist|listpenjara$/i
module.exports = handler