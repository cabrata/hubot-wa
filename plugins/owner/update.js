const { execSync } = require('child_process');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let isOwner = global.owner?.includes(m.sender.split('@')[0]);
    if (!isOwner) return m.reply('❌ Khusus Owner!');

    m.reply('Mengecek pembaruan dari repository (Git Pull)...');
    try {
        let stdout = execSync('git pull origin master'); // Atur branch jika berbeda
        let result = stdout.toString();
        
        if (result.includes('Already up to date.') || result.includes('Already up-to-date.')) {
            return m.reply('✅ Bot sudah menggunakan versi terbaru dari repositori.');
        }

        await m.reply(`✅ *Berhasil update script:*\n\n\`\`\`\n${result}\n\`\`\`\n\n🔄 *Restarting bot...*`);
        setTimeout(() => {
            if (process.send) {
                process.send('restart');
            } else {
                process.exit(0);
            }
        }, 3000);
    } catch (e) {
        m.reply(`❌ *Gagal melakukan update:*\n\n\`\`\`\n${e.message}\n\`\`\``);
    }
};

handler.help = ['update', 'gitpull'];
handler.tags = ['owner'];
handler.command = /^(update|gitpull)$/i;
handler.owner = true;

module.exports = handler;
