const { updateChat } = require('../../lib/database');

let handler = async (m, { conn, command, isOwner, isAdmin }) => {
    let isMods = isOwner || (m.user && m.user.moderator);
    
    if (!(isAdmin || isMods)) {
        return global.dfail('admin', m, conn);
    }

    if (!m.isGroup) {
        return m.reply("❌ Fitur ini hanya bisa digunakan di dalam Grup!");
    }

    let who = m.chat;

    try {
        if (command === 'banchat') {
            await updateChat(who, { isBanned: true });
            m.reply(`✅ Berhasil ban chat ini!\nBot tidur dan tidak akan merespon siapapun di grup ini.`);
        } 
        else if (command === 'unbanchat') {
            await updateChat(who, { isBanned: false });
            m.reply(`✅ Done Unbanchat!\nSekarang bot aktif dan bisa dipakai kembali di grup ini.`);
        }
    } catch (e) {
        console.error(e);
        m.reply(`❌ Terjadi kesalahan saat mencoba memproses database.\n${e.message}`);
    }
}

handler.help = ['banchat', 'unbanchat'];
handler.tags = ['group'];
handler.command = /^(banchat|unbanchat)$/i;
handler.group = true;
handler.admin = true;

module.exports = handler;
