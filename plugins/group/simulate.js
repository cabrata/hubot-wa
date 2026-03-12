module.exports = {
    command: ['simulate', 'simulasi'],
    help: 'simulate <welcome/bye>',
    desc: 'Simulasi pesan welcome / bye di grup.',
    group: true,
    admin: true,

    async handler({ m, args, conn }) {
        if (!args[0]) {
            return m.reply(`*Format salah!*\n\nGunakan:\n${m.usedPrefix + m.command} welcome\n${m.usedPrefix + m.command} bye`)
        }

        const type = args[0].toLowerCase()

        if (type === 'welcome') {
            await conn.ev.emit('group-participants.update', {
                id: m.chat,
                participants: [{ phoneNumber: m.sender }],
                action: 'add'
            })
            m.reply('Simulasi welcome memicu event... (Pastikan !welcome on sudah aktif)')
        } else if (type === 'bye' || type === 'left') {
            await conn.ev.emit('group-participants.update', {
                id: m.chat,
                participants: [{ phoneNumber: m.sender }],
                action: 'remove'
            })
            m.reply('Simulasi bye memicu event... (Pastikan !welcome on sudah aktif)')
        } else {
            return m.reply(`*Format salah!*\n\nGunakan:\n${m.usedPrefix + m.command} welcome\n${m.usedPrefix + m.command} bye`)
        }
    }
}
