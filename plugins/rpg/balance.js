const { getUser } = require('../../lib/database')

let handler = async (m, {conn, usedPrefix}) => {
    let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    let user = await getUser(who);

    if (!user) throw `✳️ Pengguna tidak ada di database`

    if (!user.registered || user.banned) {
      return m.reply(`🔒 Informasi dikunci, user ${user.banned ? 'telah dibanned' : 'belum registrasi'}`)
    }

    conn.reply(m.chat, `
┌───⊷ *BALANCE* ⊶
▢ *📌Nama* : _@${who.split('@')[0]}_
▢ *💎Diamonds* : _${user.diamond || 0}_
▢ *⬆️XP* : _Total ${user.exp || 0}_
▢ *MONEY* : _Total ${user.money || 0}_
└──────────────

*NOTA :* Anda dapat membeli 💎 berlian menggunakan perintah
❏ *${usedPrefix}buydm <jumlah dm>*
❏ *${usedPrefix}buyalldm*`, m, { mentions: [who] })
}

handler.help = ['balance']
handler.tags = ['rpg']
handler.command = /^(bal|balance)$/i

module.exports = handler;
