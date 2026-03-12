const { updateUser, getUser } = require('../../lib/database')

module.exports = {
    name: 'addprem',
    command: ['addprem', 'aprem'],
    category: 'owner',
    owner: true,
    desc: 'Menambahkan masa aktif premium ke user',

    async handler({ m, args }) {
        if (!args[0]) return m.reply(`*Format salah!*\n\nContoh: *.addprem @user 30*\n(30 = jumlah hari)`)

        // Match user from reply or mention
        let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        if (!who || !who.includes('@s.whatsapp.net')) return m.reply('Tag/reply orangnya bejir!')

        let days = parseInt(args[1])
        if (isNaN(days) || days <= 0) return m.reply(`*Format salah!*\n\nContoh: *.addprem @user 30*\n(30 = jumlah hari)`)

        let user = await getUser(who)
        if (!user) return m.reply('User tidak ditemukan dalam database.')

        let now = Date.now()
        // If already premium, extend. Else start from now.
        let isPremium = user.premiumTime > now
        let newTime = (isPremium ? Number(user.premiumTime) : now) + (days * 86400000)

        await updateUser(who, {
            premium: 1n,
            premiumTime: BigInt(newTime)
        })

        let until = new Date(newTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        m.reply(`✅ Berhasil menambahkan premium!\n\nUser: @${who.split('@')[0]}\nDurasi: ${days} Hari\nBerlaku sampai: ${until}`, { mentions: [who] })
    }
}
