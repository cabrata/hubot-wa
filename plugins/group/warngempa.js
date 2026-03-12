const { updateChat } = require('../../lib/database')

module.exports = {
    command: ['warngempa'],
    help: 'warngempa [on/off]',
    desc: 'Menyalakan atau mematikan fitur notifikasi gempa otomatis dari BMKG di grup',
    group: true,
    admin: true,

    async handler({ m, args, text, conn }) {
        if (!args[0]) {
            return m.reply(`*Format salah!*\n\nGunakan:\n${m.usedPrefix + m.command} on\n${m.usedPrefix + m.command} off`)
        }

        const isEnable = args[0].toLowerCase() === 'on'
        const isDisable = args[0].toLowerCase() === 'off'

        if (!isEnable && !isDisable) {
            return m.reply(`*Format salah!*\n\nGunakan:\n${m.usedPrefix + m.command} on\n${m.usedPrefix + m.command} off`)
        }

        await updateChat(m.chat, { warngempa: isEnable })
        m.reply(`Sukses ${isEnable ? 'menyalakan' : 'mematikan'} fitur warngempa di grup ini.`)
    }
}
