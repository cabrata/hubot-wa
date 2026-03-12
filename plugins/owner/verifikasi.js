const { createHash } = require('crypto')
const { updateUser, updateEconomy, getUser } = require('../../lib/database')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Masukkan nomor user!\nContoh: *${usedPrefix}${command} 628xxx*`

    let target = text.split('|')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    if (!global.pendingReg || !global.pendingReg[target]) {
        throw `Data pendaftaran untuk nomor tersebut tidak ditemukan atau sudah diproses.`
    }

    let p = global.pendingReg[target]
    let name = p.name
    let age = p.age

    if (command.toLowerCase() === 'tolak' || command.toLowerCase() === 'tolakdaftar') {
        let alasan = text.split('|')[1] || 'Usia/Identitas tidak valid atau tidak mengirimkan bukti.'
        delete global.pendingReg[target]
        m.reply(`❌ Pendaftaran untuk wa.me/${target.split('@')[0]} berhasil ditolak.`)
        await conn.sendMessage(target, { text: `❌ Pendaftaran kamu *DITOLAK* oleh Staff.\n\nAlasan: ${alasan.trim()}` })
        return
    }

    // Eksekusi jika Verifikasi / ACC
    let now = Date.now()
    let sn = createHash('md5').update(target).digest('hex')

    // Daftar di database
    await updateUser(target, {
        name: name,
        age: BigInt(age),
        regTime: BigInt(now),
        setName: BigInt(now),
        setAge: BigInt(now),
        registered: true,
        sn: sn,
    })

    delete global.pendingReg[target]

    m.reply(`✅ Berhasil memverifikasi pendaftaran untuk wa.me/${target.split('@')[0]}\nNama: ${name}\nUmur: ${age}`)

    let userData = await getUser(target)
    let money = 5000000000
    let exp = 500000
    let limit = 20000
    let saldo = 5000000000

    if (!userData.regSince || Number(userData.regSince) === 0) {
        await updateUser(target, {
            regSince: BigInt(now),
            exp: { increment: BigInt(exp) },
            limit: { increment: BigInt(limit) },
        })
        await updateEconomy(target, {
            money: { increment: money },
            saldo: { increment: saldo },
        })

        let userMsg = `✅ Pendaftaran kamu telah *DISETUJUI* oleh Staff!\n\n╭─「 Info 」\n│ Nama: ${name}\n│ Umur: ${age} tahun\n╰────\nSerial Number: ${sn}\n\n🎁 Hadiah Registrasi:\n- Money: ${money}\n- Exp: ${exp}\n- Limit: ${limit}\n- Saldo: ${saldo}\n\nJangan lupa follow channel dibawah ini ya untuk mendapatkan hadiah lainnya\nhttps://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m`

        await conn.sendMessage(target, { text: userMsg })
    } else {
        let userMsg = `✅ Pendaftaran ulang kamu telah *DISETUJUI* oleh Staff!\n\n╭─「 Info 」\n│ Nama: ${name}\n│ Umur: ${age} tahun\n╰────\nSerial Number: ${sn}`

        await conn.sendMessage(target, { text: userMsg })
    }
}

handler.help = ['verifikasi <nomor>', 'tolakdaftar <nomor> | <alasan>']
handler.tags = ['owner']
handler.command = /^(verifikasi|acc|tolak(daftar)?)$/i
handler.staff = true

module.exports = handler
