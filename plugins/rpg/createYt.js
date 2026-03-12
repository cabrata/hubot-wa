let handler = async (m, { conn, command, args, usedPrefix }) => {
    let user = m.user; // Ambil memori user saat ini
    if (!user) return;

    try {
        if (command === 'createakunyt') {
            if (args.length === 0) {
                return m.reply(`Silakan masukkan nama akun YouTube Anda.\nContoh: ${usedPrefix}createakunyt Mahiru`);
            }

            let youtubeAccountName = args.join(' ');
            
            // Tembak langsung ke object m.user
            user.youtube_account = youtubeAccountName;
            
            m.reply(`Akun YouTube Anda telah berhasil dibuat/diedit\nChannel: *${youtubeAccountName}*`);

        } else if (command === 'deleteakun') {
            if (!user.youtube_account) {
                return m.reply("Anda belum memiliki akun YouTube.");
            }

            user.youtube_account = ''; // Hapus langsung dari object
            m.reply("Akun YouTube Anda telah dihapus dari sistem kami.");

        } else if (/live/i.test(command) && args[0] === 'youtuber') {
            if (!user.youtube_account) {
                return m.reply(`Buat akun terlebih dahulu\nKetik: ${usedPrefix}createakunyt`);
            }
        } else {
            return await m.reply(`Perintah tidak dikenali.\n*${usedPrefix}akunyt*\n> Untuk mengecek akun YouTube\n*${usedPrefix}ytlive [judul]*\n> Untuk memulai Live Streaming.`);
        }
    } catch (err) {
        m.reply("Error\n\n" + err.stack);
    }
};

handler.help = ['createakunyt', 'deleteakun']; 
handler.tags = ['rpg'];
handler.command = /^(createakunyt|deleteakun)$/i;

module.exports = handler;
