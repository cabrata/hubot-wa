const { updateChat } = require('../../lib/database');

let handler = async (m, { conn, command, isOwner, isAdmin }) => {
    // Mute cuma bisa dilakukan oleh Admin Grup atau Moderator Bot
    let isMods = isOwner || (m.user && m.user.moderator);
    
    if (!(isAdmin || isMods)) {
        return global.dfail('admin', m, conn);
    }

    let who = m.chat;
    if (!who.endsWith('g.us')) return m.reply("❌ Fitur ini hanya bisa digunakan di dalam Grup!");

    try {
        if (command === 'mute') {
            await updateChat(who, { onlyAdmin: true });
            m.reply(`🔇 Berhasil mute chat ini!\nBot sekarang mengabaikan member biasa. Hanya Admin Grup yang bisa memakai command bot.`);
        } 
        else if (command === 'unmute') {
            await updateChat(who, { onlyAdmin: false });
            m.reply(`🔊 Done Unmute!\nSekarang seluruh member grup bebas menggunakan bot kembali.`);
        }
    } catch (e) {
        console.error(e);
        m.reply(`❌ Terjadi kesalahan SQL saat mengupdate grup.\n${e.message}`);
    }
}

handler.help = ['mute', 'unmute'];
handler.tags = ['group'];
handler.command = /^(mute|unmute)$/i;
handler.group = true;

module.exports = handler;
