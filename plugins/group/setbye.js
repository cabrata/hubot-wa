const { updateChat } = require('../../lib/database')

module.exports = {
    command: ['setbye', 'setleft'],
    help: 'setbye <teks>',
    desc: 'Mengubah pesan teks saat ada member keluar grup.\n\n*Variabel yang tersedia:*\n@user = Mention member\n@subject = Nama Grup',
    group: true,
    admin: true,

    async handler({ m, text, conn }) {
        if (!text) {
            return m.reply(`*Format salah!*\n\nContoh:\n${m.usedPrefix + m.command} Selamat tinggal @user dari @subject, jangan balik lagi ya!`)
        }

        await updateChat(m.chat, { sBye: text })
        m.reply(`Sukses mengubah pesan bye untuk grup ini.\n\nUntuk melihat hasilnya, gunakan perintah:\n*${m.usedPrefix}simulate bye*`)
    }
}
