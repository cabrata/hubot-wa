const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = {
    name: 'listprem',
    command: ['listprem', 'premlist'],
    category: 'owner',
    owner: true,
    desc: 'Menampilkan daftar user premium',

    async handler({ m, conn }) {
        await m.react('⏳')
        const now = Date.now()

        try {
            // Find users where premiumTime > Date.now()
            const users = await prisma.user.findMany({
                where: {
                    premiumTime: {
                        gt: now
                    }
                },
                select: {
                    jid: true,
                    name: true,
                    premiumTime: true
                },
                orderBy: {
                    premiumTime: 'asc'
                }
            })

            if (users.length === 0) {
                return m.reply('Belum ada user premium terdaftar.')
            }

            let text = `👑 *Daftar User Premium* 👑\n\nTotal: ${users.length} User\n\n`
            for (let i = 0; i < users.length; i++) {
                let u = users[i]
                let sisaMs = Number(u.premiumTime) - now
                let days = Math.floor(sisaMs / 86400000)
                let hours = Math.floor((sisaMs % 86400000) / 3600000)
                let until = new Date(Number(u.premiumTime)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

                text += `${i + 1}. *Name:* ${u.name || 'User'}\n`
                text += `   *Num:* @${u.jid.split('@')[0]}\n`
                text += `   *Sisa:* ${days} Hari ${hours} Jam\n`
                text += `   *Habis:* ${until}\n\n`
            }

            await conn.sendMessage(m.chat, {
                text: text,
                mentions: users.map(u => u.jid)
            }, { quoted: m.msg })

            await m.react('✅')
        } catch (e) {
            console.error(e)
            m.reply('Gagal mengambil data user premium dari database.')
        } finally {
            await prisma.$disconnect()
        }
    }
}
