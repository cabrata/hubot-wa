const { updateUser, getUser } = require('../../lib/database')

module.exports = {
    name: 'setwm',
    command: ['setwm', 'wm'],
    category: 'main',
    premium: true,
    desc: 'Set custom watermark sticker (Premium Only)',

    async handler({ m, args, usedPrefix }) {
        let text = args.join(' ')
        if (!text) {
            return m.reply(`*Format Salah!*\n\nContoh: ${usedPrefix}setwm PackName | AuthorName\nContoh 2: ${usedPrefix}setwm Hu Tao | Kalip\n\nCatatan: Gunakan simbol | untuk memisahkan nama pack dan author`)
        }

        let [pack, author] = text.split('|')

        await updateUser(m.sender, {
            exifPack: pack ? pack.trim() : '',
            exifAuthor: author ? author.trim() : ''
        })

        m.reply(`✅ *Watermark Custom Berhasil Disimpan!*\n\nPack Name: ${pack ? pack.trim() : 'Kosong'}\nAuthor: ${author ? author.trim() : 'Kosong'}\n\nSilakan coba buat stiker dengan ${usedPrefix}s`)
    }
}
