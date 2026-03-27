const { db } = require('../../lib/database')

// Bikin dummy handler karena ini file khusus middleware/before
let handler = m => m;

// ─── SESSION LOCK MECHANIC (DIBACA SEMUA COMMAND) ───
// Script ini jalan sebelum plugin apa pun dieksekusi.
handler.before = async function (m) {
    // Abaikan kalau bukan command (chat biasa)
    if (!m.isCommand) return false;

    // Kecualikan command dungeon itu sendiri biar player tetep bisa ngetik .dungeon attack dll
    let cmd = m.command ? m.command.toLowerCase() : '';
    if (['dungeon', 'dg'].includes(cmd)) return false;

    // Cek apakah user terkunci di dungeon
    try {
        let uDungeon = await db.userDungeon.findUnique({ where: { jid: m.sender } });
        if (uDungeon && uDungeon.inSession) {
            m.reply(`⚠️ *[ FOCUS MODE ]*\nKamu masih terjebak di dalam Dungeon.\nSemua command dari luar diblokir sementara.\n\nKetik *.dungeon leave* jika ingin menyerah dan keluar.`);
            return true; // Return true = BLOCK eksekusi plugin lain
        }
    } catch (e) {
        // Abaikan kalau error db
    }
    return false; // Lanjut ke plugin normal
};

// Jangan lupa di-export
module.exports = handler;