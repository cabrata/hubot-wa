const { getUser } = require('../../lib/database'); // Opsional buat cek orang lain

function formatNumber(number) {
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'Jt';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
    return number;
}

let handler = async (m, { conn, command, args, usedPrefix }) => {
    try {
        const tag = '@' + m.sender.split('@')[0]; 
        
        if (command === 'akunyt') {
            let targetNumber = m.sender;
            let targetTag = tag; 
            
            if (args.length > 0) {
                targetNumber = args[0].replace(/[@ .+-]/g, '') + '@s.whatsapp.net';
                targetTag = '@' + targetNumber.split('@')[0]; 
            }
            
            // Kalau cek diri sendiri pakai m.user, kalau orang lain ambil dari getUser
            let targetUser = (targetNumber === m.sender) ? m.user : await getUser(targetNumber);
            
            if (!targetUser) return m.reply("Pengguna tidak terdaftar di database.");

            // Pengecekan Akun
            if (!targetUser.youtube_account || targetUser.youtube_account === '') {
                if (targetNumber === m.sender) {
                    return conn.sendMessage(m.chat, { text: `Hey ${targetTag}, buat akun terlebih dahulu\nKetik: ${usedPrefix}createakunyt`, contextInfo: { mentionedJid: [m.sender] }}, { quoted: m });
                } else {
                    return m.reply("Pengguna ini belum memiliki akun YouTube.");
                }
            }

            const formattedSubscribers = formatNumber(targetUser.subscribers || 0);
            const formattedViewers = formatNumber(targetUser.viewers || 0);
            const formattedLike = formatNumber(targetUser.like || 0);
            
            const silverButton = (targetUser.playButton || 0) >= 1 ? '✅' : '❎';
            const goldButton = (targetUser.playButton || 0) >= 2 ? '✅' : '❎';
            const diamondButton = (targetUser.playButton || 0) >= 3 ? '✅' : '❎';
            
            return conn.sendMessage(m.chat, { 
                text: `📈 Akun YouTube ${targetTag} 📉\n\n🧑🏻‍💻 *Streamer:* ${targetUser.registered ? targetUser.name : conn.getName(targetNumber)}\n🌐 *Channel:* ${targetUser.youtube_account}\n👥 *Subscribers:* ${formattedSubscribers}\n🪬 *Viewers:* ${formattedViewers}\n👍🏻 *Like:* ${formattedLike}\n\n⬜ *Silver PlayButton:* ${silverButton}\n🟧 *Gold PlayButton:* ${goldButton}\n💎 *Diamond PlayButton:* ${diamondButton}`, 
                contextInfo: { mentionedJid: [targetNumber] }
            }, { quoted: m });
            
        }
    } catch (err) {
        console.error(err);
        return m.reply("Terjadi kesalahan dalam memproses perintah.");
    }
}

handler.help = ['akunyt'];
handler.tags = ['rpg'];
handler.command = /^(akunyt)$/i;
module.exports = handler;
