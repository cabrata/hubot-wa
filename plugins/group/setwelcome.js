const { updateChat } = require('../../lib/database')

module.exports = {
    command: ['setwelcome'],
    help: 'setwelcome <teks>',
    desc: 'Mengubah pesan teks sambutan saat ada member baru masuk grup.\n\n*Variabel yang tersedia:*\n@user = Mention member\n@subject = Nama Grup\n@desc = Deskripsi Grup',
    group: true,
    admin: true,

    async handler({ m, text, conn }) {
        if (!text) {
            return m.reply(`*Format salah!*\n\nContoh:\n${m.usedPrefix + m.command} Halo @user, selamat datang di @subject!\n\nJangan lupa baca @desc ya!`)
        }

        await updateChat(m.chat, { sWelcome: text })
        m.reply(`Sukses mengubah pesan welcome untuk grup ini.\n\nUntuk melihat hasilnya, gunakan perintah:\n*${m.usedPrefix}simulate welcome*`)
    }
}
