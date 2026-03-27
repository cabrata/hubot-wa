const { getOwnerDB, saveOwnerDB } = require('../../lib/staffManager')
const { db, getUser } = require('../../lib/database')

let handler = async (m, { conn, command, text }) => {
    if (!text) throw `❌ *Format salah!*\n\nContoh penggunaan:\n` +
        `#addmanagement rune | 6285129735706\n` +
        `#delmanagement rune\n` +
        `#addbotowner rune | 6285129735706 | 62895329058610\n` +
        `#delbotowner rune | 62895329058610\n` +
        `#updateownship rune | addbot/delbot/addstaff/delstaff/owner | 628xxx`

    const [key, field, value] = text.split('|').map(a => a?.trim())
    const manKey = key?.toLowerCase()
    
    // Ambil data JSON terbaru
    let ownershipData = getOwnerDB()

    // Fungsi kecil buat ngambil nama otomatis dari Database/WA
    const fetchName = async (jid) => {
        let userDB = await getUser(jid)
        return userDB?.name || await conn.getName(jid) || 'Unknown'
    }

    const formatJid = (num) => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    // Fungsi kecil buat update akses SQL otomatis
    const updateSQLAccess = async (jid, isGranted) => {
        await db.user.update({
            where: { jid: jid },
            data: { moderator: isGranted, timSupport: isGranted }
        }).catch(() => {}) // Catch biar gak error kalo nomornya blm pernah interaksi sama bot
    }

    switch (command) {
        // ============== ADD MANAGEMENT ==============
        case 'addmanagement': {
            if (!key || !field) return m.reply(`Format: #addmanagement key | nomor owner`)
            if (ownershipData[manKey]) return m.reply(`⚠️ Management "${manKey}" sudah ada!`)

            let ownerJid = formatJid(field)
            let ownerName = await fetchName(ownerJid)

            ownershipData[manKey] = {
                owner: ownerJid,
                bots: [],
                staff: [],
                names: { [ownerJid]: ownerName } 
            }

            saveOwnerDB(ownershipData)
            
            // 🔄 INTEGRASI SQL: Berikan akses penuh
            await updateSQLAccess(ownerJid, true)

            m.reply(`✅ *Management Baru Dibuat!*\n\n🆔 Key: ${manKey}\n👑 Owner: ${ownerName} (@${ownerJid.split('@')[0]})\n\n_Akses SQL Moderator & Support telah diberikan otomatis._`)
            break
        }
        
        // ============== DELETE MANAGEMENT ==============
        case 'delmanagement': {
            if (!key) return m.reply(`Format: #delmanagement key`)
            let data = ownershipData[manKey]
            if (!data) return m.reply(`❌ Management "${manKey}" tidak ditemukan!`)

            // 🔄 INTEGRASI SQL: Cabut akses Owner dan semua Staff-nya sebelum datanya dihapus
            await updateSQLAccess(data.owner, false)
            for (let staffJid of data.staff) {
                await updateSQLAccess(staffJid, false)
            }

            delete ownershipData[manKey]
            saveOwnerDB(ownershipData)
            m.reply(`🗑️ Management "${manKey}" beserta seluruh akses SQL stafnya berhasil dihapus permanen.`)
            break
        }

        // ============== ADD BOT OWNER ==============
        case 'addbotowner': {
            const [botNumber] = text.split('|').slice(2).map(a => a?.trim())
            if (!key || !field || !botNumber) return m.reply(`Format: #addbotowner key | nomor utama | nomor bot`)
            if (!ownershipData[manKey]) return m.reply(`❌ Management "${manKey}" tidak ditemukan!`)

            let utamaJid = formatJid(field)
            let botJid = formatJid(botNumber)
            let data = ownershipData[manKey]

            // Cek duplikat
            if (data.bots.includes(botJid)) return m.reply(`⚠️ Bot ${botNumber} sudah ada di management "${manKey}"!`)
            if (!data.staff.includes(utamaJid)) {
                data.staff.push(utamaJid)
                // 🔄 INTEGRASI SQL: Berikan akses ke staff baru
                await updateSQLAccess(utamaJid, true)
            }

            // Tambah Bot & Cari Namanya
            data.bots.push(botJid)
            data.names[utamaJid] = await fetchName(utamaJid)
            data.names[botJid] = await fetchName(botJid)

            saveOwnerDB(ownershipData)
            m.reply(`✅ *Bot Baru Ditambahkan!*\n\n🏢 Management: ${manKey}\n🤖 Bot: ${data.names[botJid]} (@${botJid.split('@')[0]})\n👤 Staff Utama: ${data.names[utamaJid]}`)
            break
        }

        // ============== DELETE BOT OWNER ==============
        case 'delbotowner': {
            if (!key || !field) return m.reply(`Format: #delbotowner key | nomor bot`)
            if (!ownershipData[manKey]) return m.reply(`❌ Management "${manKey}" tidak ditemukan!`)

            let botJid = formatJid(field)
            let data = ownershipData[manKey]

            if (!data.bots.includes(botJid)) return m.reply(`⚠️ Bot ${field} tidak ditemukan di "${manKey}"!`)

            data.bots = data.bots.filter(v => v !== botJid)
            saveOwnerDB(ownershipData)
            m.reply(`🗑️ Bot @${botJid.split('@')[0]} berhasil dihapus dari management "${manKey}".`)
            break
        }

        // ============== UPDATE OWNERSHIP ==============
        case 'updateownship': {
            if (!key || !field || !value) return m.reply(`❌ Format: #updateownship key | field | value\n\nContoh:\n#updateownship rune | addbot | 6285129735706`)

            let data = ownershipData[manKey]
            if (!data) return m.reply(`⚠️ Management "${manKey}" tidak ditemukan.`)

            let targetJid = formatJid(value)
            let targetName = await fetchName(targetJid)

            switch (field.toLowerCase()) {
                case 'owner':
                    // Cabut akses owner lama, kasih ke owner baru
                    await updateSQLAccess(data.owner, false) 
                    data.owner = targetJid
                    data.names[targetJid] = targetName
                    await updateSQLAccess(targetJid, true)
                    break
                case 'addstaff':
                    if (data.staff.includes(targetJid)) return m.reply(`⚠️ Nomor sudah terdaftar sebagai staff`)
                    data.staff.push(targetJid)
                    data.names[targetJid] = targetName
                    await updateSQLAccess(targetJid, true)
                    break
                case 'delstaff':
                    data.staff = data.staff.filter(num => num !== targetJid)
                    await updateSQLAccess(targetJid, false)
                    break
                case 'addbot':
                    if (data.bots.includes(targetJid)) return m.reply(`⚠️ Nomor sudah terdaftar sebagai bot`)
                    data.bots.push(targetJid)
                    data.names[targetJid] = targetName
                    break
                case 'delbot':
                    data.bots = data.bots.filter(num => num !== targetJid)
                    break
                default:
                    return m.reply(`⚠️ Field tidak valid!\nGunakan: owner | addstaff | delstaff | addbot | delbot`)
            }

            saveOwnerDB(ownershipData)
            m.reply(`✅ *Data Ownership Diperbarui!*\n\n🏢 Management: ${manKey}\n🛠️ Aksi: ${field.toUpperCase()}\n🎯 Target: ${targetName} (@${targetJid.split('@')[0]})\n\n_Sinkronisasi database SQL berhasil._`)
            break
        }

        default:
            return m.reply(`❌ Perintah tidak dikenali!`)
    }
}

handler.help = ['addmanagement', 'delmanagement', 'addbotowner', 'delbotowner', 'updateownship']
handler.tags = ['staff']
handler.command = /^(addmanagement|delmanagement|addbotowner|delbotowner|updateownship)$/i
handler.rowner = true

module.exports = handler
