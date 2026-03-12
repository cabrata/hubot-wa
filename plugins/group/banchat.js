const { updateChat, updateUser } = require('../../lib/database');

let handler = async (m, { conn, command, text, isOwner, isROwner }) => {
    // Cek apakah yang pakai adalah Moderator atau Owner
    let isMods = isROwner || isOwner || (m.user && m.user.moderator);
    
    if (!isMods) {
        return global.dfail('mods', m, conn);
    }

    let who;
    if (m.isGroup) {
        // Bisa tag orang, reply pesan, atau masukkan nomor. Kalau kosong = ban grupnya.
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.chat;
    } else {
        who = text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.chat;
    }

    try {
        if (command === 'banchat') {
            if (who.endsWith('g.us')) {
                await updateChat(who, { isBanned: true });
                m.reply(`✅ Berhasil ban chat ini!\nBot tidur dan tidak akan merespon siapapun di grup ini.`);
            } else {
                await updateUser(who, { banned: true });
                m.reply(`✅ Berhasil Banned user tersebut!\nDia tidak akan bisa menggunakan bot lagi.`);
            }
        } 
        else if (command === 'unbanchat') {
            if (who.endsWith('g.us')) {
                await updateChat(who, { isBanned: false });
                m.reply(`✅ Done Unbanchat!\nSekarang bot aktif dan bisa dipakai kembali di grup ini.`);
            } else {
                await updateUser(who, { banned: false });
                m.reply(`✅ Done Unban user!\nPengguna tersebut sudah diampuni dan bisa memakai bot lagi.`);
            }
        }
    } catch (e) {
        console.error(e);
        m.reply(`❌ Terjadi kesalahan SQL saat mencoba memproses database.\n${e.message}`);
    }
}

handler.help = ['banchat', 'unbanchat'];
handler.tags = ['owner'];
handler.command = /^(banchat|unbanchat)$/i;
handler.mods = true;

module.exports = handler;
