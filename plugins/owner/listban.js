// Asumsi lu punya fungsi buat ngambil semua user atau khusus user yang dibanned di database.js
const { getAllUsers } = require('../../lib/database.js') 

let handler = async (m, { conn, usedPrefix }) => {
    try {
        // Ambil semua user dari SQL
        let users = await getAllUsers(); 
        
        // Filter cuma yang statusnya banned == true
        let bannedUsers = users.filter(u => u.banned);

        if (bannedUsers.length === 0) {
            return conn.sendMessage(m.chat, { text: '✨ Wah, database bersih! Nggak ada user yang lagi kena banned.' }, { quoted: m });
        }

        let txt = `📋 *DAFTAR USER BANNED*\nTotal: *${bannedUsers.length} User*\n\n`;

        bannedUsers.forEach((u, i) => {
            let reason = u.BannedReason || 'Tidak ada alasan';
            let level = u.banLevel || 0;
            
            // Konversi BigInt waktu ke format yang bisa dibaca
            let until = Number(u.bannedUntil || 0n);
            let timeLimit = until > 0 ? `Sampai: ${new Date(until).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` : 'PERMANEN ⛔';
            
            // Format ID, jaga-jaga kalau key jid-nya beda di DB lu (misal u.id atau u.jid)
            let jid = u.jid || u.id; 
            
            txt += `${i + 1}. @${jid.split('@')[0]}\n`;
            txt += `   ├ Lvl Ban: ${level}\n`;
            txt += `   ├ Alasan: ${reason}\n`;
            txt += `   └ Status: ${timeLimit}\n\n`;
        });

        // Mentions array biar tag-nya warna biru
        let mentionList = bannedUsers.map(u => u.jid || u.id);

        await conn.sendMessage(m.chat, { 
            text: txt.trim(), 
            mentions: mentionList 
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        m.reply('❌ Terjadi kesalahan saat membaca database. Pastikan fungsi getAllUsers tersedia di lib/database.js');
    }
}

handler.help = ['listban']
handler.tags = ['owner']
handler.command = /^(listban|bannedlist)$/i
handler.owner = true // Khusus Owner

module.exports = handler
