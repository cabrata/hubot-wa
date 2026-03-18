const { execSync } = require('child_process');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let isOwner = global.owner?.includes(m.sender.split('@')[0]);
    if (!isOwner) return m.reply('❌ Khusus Owner!');

    m.reply('Mengecek pembaruan dari repository (Git Pull)...');
    try {
        let oldCommit = execSync('git rev-parse HEAD').toString().trim();
        let stdout = execSync('git pull origin master'); // Atur branch jika berbeda
        let result = stdout.toString();
        
        if (result.includes('Already up to date.') || result.includes('Already up-to-date.')) {
            return m.reply('✅ Bot sudah menggunakan versi terbaru dari repositori.');
        }

        let newCommit = execSync('git rev-parse HEAD').toString().trim();
        let changelog = '';
        
        if (oldCommit !== newCommit) {
            changelog = execSync(`git log ${oldCommit}..${newCommit} --oneline --format="- %s"`).toString().trim();
        }

        let replyMsg = `✅ *Berhasil update script:*\n\n`;
        if (changelog) {
            replyMsg += `📜 *Pembaruan (Commit Log):*\n${changelog}\n\n`;
        }
        replyMsg += `\`\`\`\n${result}\n\`\`\`\n\n🔄 *Restarting bot...*`;

        await m.reply(replyMsg);
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
