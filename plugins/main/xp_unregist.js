const { createHash } = require('crypto')
const { updateUser, getUser } = require('../../lib/database')

let handler = async function (m, { text, conn, args, command, usedPrefix }) {
    let userData = await getUser(m.sender)

    if (!global.owner.includes(m.sender.split('@')[0])) {
        if (userData.regTime && Number(userData.regTime) >= Date.now() - 2 * 30 * 24 * 60 * 60 * 1000) {
            const sisa = Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - Number(userData.regTime))) / 1000)
            const hari = Math.floor(sisa / 86400)
            const jam = Math.floor((sisa % 86400) / 3600)
            const menit = Math.floor((sisa % 3600) / 60)
            throw `Anda tidak dapat unreg karena baru daftar dalam 1 bulan terakhir!\nTunggu ${hari} hari, ${jam} jam, ${menit} menit lagi.`
        }
        if (!args[0]) throw `✳️ *Masukkan nomor seri*\ncontoh: ${usedPrefix + command} nomorseri`
        let sn = createHash('md5').update(m.sender).digest('hex')
        if (args[0] !== sn) throw '⚠️ *Nomor seri salah*'
    }

    await updateUser(m.sender, {
        name: '',
        age: BigInt(0),
        registered: false,
        regTime: BigInt(-1),
        setName: BigInt(0),
        setAge: BigInt(0),
        // regSince tetap disimpan untuk pelacakan
    })

    return m.reply(`✅ Success`)
}

handler.help = ['unreg <Nomor Seri>']
handler.tags = ['main']
handler.command = ['unreg']
handler.register = true
handler.owner = false

module.exports = handler
