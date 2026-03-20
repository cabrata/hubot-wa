const { updateChat } = require('../../lib/database');

let handler = async (m, { conn, command, text, isOwner, isROwner }) => {
    let isMods = isROwner || isOwner || (m.user && m.user.moderator);
    
    if (!isMods) {
        return global.dfail('owner', m, conn);
    }

    let who;
    if (m.isGroup) {
        who = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : text ? text.replace(/[^0-9]/g, '') + '@g.us' : m.chat;
    } else {
        who = text ? text.replace(/[^0-9]/g, '') + '@g.us' : m.chat;
    }

    if (!who.endsWith('g.us')) {
        return m.reply("❌ Perintah ini khusus untuk ban grup. Berikan ID grup atau jalankan di dalam grup yang ingin di-banned.");
    }

    try {
        if (command === 'obanchat') {
            await updateChat(who, { isBanned: true });
            m.reply(`✅ Berhasil ban grup ini via Owner!\nBot tidur dan tidak akan merespon siapapun di grup ini.`);
        } 
        else if (command === 'ounbanchat') {
            await updateChat(who, { isBanned: false });
            m.reply(`✅ Done Unbanchat via Owner!\nSekarang bot aktif kembali di grup ini.`);
        }
    } catch (e) {
        console.error(e);
        m.reply(`❌ Terjadi kesalahan saat mencoba memproses database.\n${e.message}`);
    }
}

handler.help = ['obanchat', 'ounbanchat'];
handler.tags = ['owner'];
handler.command = /^(obanchat|ounbanchat)$/i;
handler.owner = true;

module.exports = handler;
