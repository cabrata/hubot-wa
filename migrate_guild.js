const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function migrateGuilds() {
    console.log('⏳ Memulai Migrasi Guild dari database.json ke MySQL...')

    // Baca database.json
    const dbPath = path.join(__dirname, 'database.json')
    if (!fs.existsSync(dbPath)) {
        console.log('❌ File database.json tidak ditemukan!')
        return process.exit(1)
    }

    try {
        let rawData = fs.readFileSync(dbPath, 'utf-8')
        let data = JSON.parse(rawData)

        let guildsRaw = data?.guilds || {}
        let guilds = Object.entries(guildsRaw).map(([id, g]) => ({ id, ...g }))

        if (guilds.length === 0) {
            console.log('ℹ️ Tidak ada data guild yang perlu dimigrasi.')
            return process.exit(0)
        }

        console.log(`🔍 Ditemukan ${guilds.length} guild. Mulai proses migrasi...`)

        let success = 0
        let failed = 0

        for (const g of guilds) {
            try {
                // Cek guild duplikat
                const existing = await prisma.guild.findUnique({ where: { id: g.id } })
                if (existing) {
                    console.log(`⏩ Guild ${g.name} (${g.id}) sudah ada, dilompati.`)
                    continue
                }

                // Cek Owner
                const owner = await prisma.user.findUnique({ where: { jid: g.owner } })
                if (!owner) {
                    console.log(`⚠️ Owner guild ${g.name} (${g.owner}) tidak ditemukan di DB MySQL. Melewati guild ini.`)
                    failed++
                    continue
                }

                // Siapkan data anggota yang valid di MySQL
                let validMembers = []
                for (let memberJid of (g.members || [])) {
                    let member = await prisma.user.findUnique({ where: { jid: memberJid } })
                    if (member) validMembers.push({ jid: memberJid })
                }

                // Buat Data Guild
                await prisma.guild.create({
                    data: {
                        id: g.id,
                        name: g.name,
                        isPrivate: g.isPrivate || false,
                        ownerJid: g.owner,
                        createdAt: new Date(g.createdAt || Date.now()),
                        level: g.level || 1,
                        exp: g.exp || 0,
                        eliksir: g.eliksir || 0,
                        harta: BigInt(g.harta || 0),
                        guardian: g.guardian,
                        attack: g.attack || 0,
                        staff: JSON.stringify(g.staff || []),
                        waitingRoom: JSON.stringify(g.waitingRoom || []),
                        members: {
                            connect: validMembers
                        }
                    }
                })

                // Update guildId untuk tiap member yang valid
                await prisma.user.updateMany({
                    where: { jid: { in: validMembers.map(m => m.jid) } },
                    data: { guildId: g.id }
                })

                console.log(`✅ Guild ${g.name} berhasil dimigrasi dengan ${validMembers.length} anggota.`)
                success++
            } catch (err) {
                console.error(`❌ Gagal memigrasi guild ${g.name}:`, err.message)
                failed++
            }
        }

        console.log('\n=======================================')
        console.log(`🎉 Migrasi Selesai!`)
        console.log(`   Berhasil: ${success}`)
        console.log(`   Gagal/Dilewati: ${failed}`)
        console.log('=======================================\n')

    } catch (e) {
        console.error('❌ Terjadi kesalahan fatal:', e)
    } finally {
        await prisma.$disconnect()
    }
}

migrateGuilds()
