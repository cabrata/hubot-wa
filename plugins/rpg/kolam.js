//rpg-kolam
const { getUser } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let paus = user.paus || 0
    let kepiting = user.kepiting || 0
    let gurita = user.gurita || 0
    let cumi = user.cumi || 0
    let buntal = user.buntal || 0
    let dory = user.dory || 0
    let lumba = user.lumba || 0
    let lobster = user.lobster || 0
    let hiu = user.hiu || 0
    let udang = user.udang || 0
    let ikan = user.ikan || 0
    let orca = user.orca || 0

    let dann = `
*Fish Pond*
Hiu: ${hiu}
Ikan: ${ikan}
Dory: ${dory}
Orca: ${orca}
Paus: ${paus}
Cumi: ${cumi}
Gurita: ${gurita}
Buntal: ${buntal}
Udang: ${udang}
Lumba²: ${lumba}
Lobster: ${lobster}
Kepiting: ${kepiting}
`.trim()

    conn.reply(m.chat, dann, m)
}

handler.help = ['kolam']
handler.tags = ['rpg']
handler.command = /^(kolam)$/i

module.exports = handler