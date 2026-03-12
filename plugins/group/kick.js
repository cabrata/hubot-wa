module.exports = {
    name: 'kick',
    command: ['kick', 'remove'],
    group: true,
    admin: true,
    botAdmin: true,
    owner: false,
    premium: false,
    private: false,
    limit: false,
    tags: ['group'],
    desc: 'Kick member dari grup',

    async handler({ m, conn, args }) {
        // Get target: from mention or quoted message
        let target
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            target = m.mentionedJid[0]
        } else if (m.quoted) {
            target = m.quoted.sender
        } else {
            return m.reply('Tag atau reply pesan orang yang ingin di-kick!\n\nContoh: *.kick @user*')
        }

        // Don't kick owner or bot
        const isTargetOwner = global.owner
            .map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
            .includes(target)

        if (isTargetOwner) return m.reply('Tidak bisa kick owner!')
        if (target === conn.decodeJid(conn.user.id)) return m.reply('Tidak bisa kick bot sendiri!')

        try {
            await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
            await m.reply(`✅ Berhasil kick @${target.split('@')[0]}`, { mentions: [target] })
        } catch (e) {
            await m.reply('❌ Gagal kick member. Pastikan bot adalah admin!')
        }
    },
}
