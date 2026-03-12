const { getUser, updateRpg, updateJob } = require('../../lib/database')

let handler = async (m, { conn, args, text }) => {
    const JAIL_TIME = 60 * 60 * 1000 // 1 Jam
    let who = (m.mentionedJid && m.mentionedJid[0]) ? m.mentionedJid[0] : args[0] ? ((args.join('').replace(/[@ .+-]/g, '')).replace(/^\+/, '').replace(/-/g, '') + '@s.whatsapp.net') : '';
    
    const usar = await getUser(m.sender)
    if (!usar) return

    if (usar.job !== 'polisi') {
        return m.reply('*Akses Ditolak!* Hanya polisi yang bisa memenjarakan orang.')
    }

    if (!text) throw '*Siapa yang mau di penjara?*'
    if (!who) return m.reply('*Tag target atau ketik nomornya*')
    
    const user = await getUser(who)
    if (!user) return m.reply(`*Pengguna tidak ada dalam database*`)

    if (user.jail) return m.reply('*Target sudah berada di dalam penjara!*')
    
    // Simpan status penjara dan cooldown
    await updateRpg(who, { jail: true })
    await updateJob(who, { pekerjaan2: Date.now() + JAIL_TIME }) 
    
    // Beri exp kerja ke polisi
    await updateJob(m.sender, { jobexp: (usar.jobexp || 0) + 1 }) 

    setTimeout(() => {
        conn.reply(who, `🚨 *Kamu telah dipenjara oleh ${usar.name || 'Polisi'} selama 1 Jam!*`, null)
    }, 3000)

    conn.reply(m.chat, `Berhasil memenjarakan *@${(who || '').replace(/@s\.whatsapp\.net/g, '')}*\n🧤 +1 Tingkat Kerja Keras\n\n_Jika polisi diketahui memenjarai seseorang tanpa alasan tertentu, maka akan langsung diban oleh pihak atasan._`, m, { mentions: [who] })
}

handler.help = ['penjara *@user*']
handler.tags = ['rpg']
handler.command = /^(penjara)$/i

module.exports = handler
