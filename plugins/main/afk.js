const { updateUser } = require('../../lib/database')

let handler = async (m, { text, usedPrefix, command }) => {
    let user = m.user;

    // Set afk values
    await updateUser(m.sender, {
        afk: Date.now(),
        afkReason: text ? text : ''
    });

    m.reply(`Kamu sekarang AFK${text ? ' dengan alasan: ' + text : ''}`);
}
handler.help = ['afk [alasan]']
handler.tags = ['main']
handler.command = /^afk$/i

module.exports = handler
