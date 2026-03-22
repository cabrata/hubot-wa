let handler = async (m, { conn, args }) => {
    let id = m.chat
    let groupMetadata = await conn.groupMeta(id)
    let participants = groupMetadata.participants || []
    
    global.onlineList = global.onlineList || {}
    let groupOnlineData = global.onlineList[id] || {}
    let onlineUsers = []
    
    // Check members online (< 5 minutes)
    for (let participant of participants) {
        let jid = participant.id || participant.phoneNumber
        if (jid && groupOnlineData[jid]) {
            let data = groupOnlineData[jid]
            let isRecent = (Date.now() - data.time <= 5 * 60 * 1000)
            if (isRecent && data.action !== 'unavailable') {
                onlineUsers.push({ jid, action: data.action })
            }
        }
    }
    
    if (onlineUsers.length === 0) {
        return m.reply('Tidak ada admin/member yang sedang aktif/online (berdasarkan aktivitas < 5 menit terakhir di grup ini).')
    }
    
    let text = `*Daftar Member Online (Aktif < 5 Menit)*\n\nHari ini pada ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`
    
    text += onlineUsers.map((v, i) => {
        let actionStr = ''
        switch (v.action) {
            case 'composing': actionStr = 'Sedang mengetik... ✍️'; break;
            case 'recording': actionStr = 'Sedang merekam suara... 🎙️'; break;
            case 'available': actionStr = 'Online / Membaca chat 👀'; break;
            default: actionStr = `Online (${v.action})`; break;
        }
        return `${i + 1}. @${v.jid.split('@')[0]} - ${actionStr}`
    }).join('\n')
    
    text += `\n\n_Data ini didapatkan dari aktivitas presence di grup ini._`
    
    await conn.sendMessage(m.chat, { text, mentions: onlineUsers.map(v => v.jid) }, { quoted: m })
}

handler.help = ['listonline', 'online']
handler.tags = ['group']
handler.command = /^(listonline|online)$/i
handler.group = true

module.exports = handler
