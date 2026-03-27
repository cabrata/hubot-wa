const { updateUser, getUser } = require('../../lib/database')

module.exports = {
    name: 'delprem',
    command: ['delprem', 'dprem'],
    category: 'owner',
    rowner: true,
    desc: 'Menghapus masa aktif premium user',

    async handler({ m, args }) {
        let owner = global.owner.includes(m.sender.split('@')[0])
        if (!owner) return m.reply('Fitur ini hanya khusus owner!')
        let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        if (!who || !who.includes('@s.whatsapp.net')) return m.reply('Tag/reply orangnya bejir!')

        let user = await getUser(who)
        if (!user) return m.reply('User tidak ditemukan dalam database.')

        await updateUser(who, {
            premium: 0n,
            premiumTime: 0n
        })

        m.reply(`✅ Berhasil menghapus status premium dari @${who.split('@')[0]}`, { mentions: [who] })
    }
}
