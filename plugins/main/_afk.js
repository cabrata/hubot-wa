const { updateUser, getUser } = require('../../lib/database')

let handler = m => m
handler.before = async function (m, { conn }) {
    let user = m.user

    // 1. Jika user sedang AFK dan mengirim pesan, matikan AFK-nya
    if (user.afk > -1) {
        let text = m.text ? `\nKamu berhenti AFK${user.afkReason ? ' setelah ' + user.afkReason : ''}` : ''

        let durasi = clockString(Date.now() - user.afk)
        await m.reply(`Kamu berhenti AFK setelah ${durasi}${text}`)

        await updateUser(m.sender, {
            afk: -1n,
            afkReason: ''
        })
    }

    // 2. Mengecek apakah pesan ini me-mention seseorang yang sedang AFK
    let jids = [...new Set([
        ...((m.msg || {}).contextInfo?.mentionedJid || []),
        ...(m.quoted ? [m.quoted.sender] : [])
    ])]

    for (let jid of jids) {
        if (!jid) continue
        let mentionedUser = await getUser(jid)
        if (!mentionedUser || mentionedUser.afk < 0) continue

        let durasi = clockString(Date.now() - mentionedUser.afk)
        let alasan = mentionedUser.afkReason ? '\nAlasan: ' + mentionedUser.afkReason : ''

        await m.reply(`Jangan tag dia! Dia sedang AFK selama ${durasi}${alasan}`)
    }

    return true
}

module.exports = handler

function clockString(ms) {
    if (isNaN(ms)) return '--'
    let d = Math.floor(ms / 86400000)
    let h = Math.floor((ms % 86400000) / 3600000)
    let m = Math.floor((ms % 3600000) / 60000)
    let s = Math.floor((ms % 60000) / 1000)
    let res = []
    if (d > 0) res.push(`${d} hari`)
    if (h > 0) res.push(`${h} jam`)
    if (m > 0) res.push(`${m} menit`)
    if (s > 0 || res.length === 0) res.push(`${s} detik`)
    return res.join(', ')
}
