const { getStaff, saveStaff, getOwnerDB, saveOwnerDB } = require('../../lib/staffManager')
const { db } = require('../../lib/database')

let handler = async (m, { conn, command, text }) => {
    if (!text) return m.reply(`❓ *Format:*\n.editstaff 628xxx | field | value\n\n*Field yang tersedia:*\n- name (Ganti nama)\n- role (Ganti jabatan: Moderator/Support)\n- man (Pindah Management)\n\n*Contoh:* .editstaff 628xxx | name | Nabil Ganteng`)

    let [nomor, fieldRaw, value] = text.split('|').map(v => v?.trim())
    if (!nomor || !fieldRaw || !value) return m.reply('❌ Format salah! Pastikan pakai pemisah |')

    let targetJid = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    let field = fieldRaw.toLowerCase()
    
    let staffData = getStaff()
    let ownerData = getOwnerDB()

    // Cek apakah target ada di staff.json
    if (!staffData[targetJid]) {
        // Cek kalau target ternyata orang dalem (VIP/Owner) -> Biar Owner bisa ganti namanya sendiri
        let isVip = false
        for (let man in ownerData) {
            let mData = ownerData[man]
            if (mData.owner === targetJid || (mData.staff && mData.staff.includes(targetJid))) {
                if (field === 'name') {
                    mData.names[targetJid] = value
                    saveOwnerDB(ownerData)
                    return m.reply(`✅ Nama VIP/Owner berhasil diubah menjadi *${value}*.`)
                } else {
                    return m.reply(`⚠️ Untuk VIP/Owner, kamu hanya bisa mengubah 'name' di sini.`)
                }
            }
        }
        return m.reply('❌ Nomor tersebut tidak ditemukan di database staff.')
    }

    let targetData = staffData[targetJid]
    let senderJid = m.sender

    // ==========================================
    // 🛡️ SISTEM HAK AKSES (AUTHORIZATION)
    // ==========================================
    let isGlobalOwner = global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(senderJid)
    let isVipAdmin = false
    for (let man in ownerData) {
        if (ownerData[man].owner === senderJid || (ownerData[man].staff && ownerData[man].staff.includes(senderJid))) {
            isVipAdmin = true; break;
        }
    }

    let isSelf = senderJid === targetJid
    let senderStaffData = staffData[senderJid]
    
    // Syarat Moderator Management: Sender adalah Staff, rolenya Mod, dan Management-nya SAMA dgn target
    let isModOfSameManagement = senderStaffData && 
                                senderStaffData.role.toLowerCase().includes('mod') && 
                                senderStaffData.management === targetData.management

    // ==========================================
    // ⚙️ EKSEKUSI PERUBAHAN
    // ==========================================
    
    // 1. Edit Nama (Bebas buat diri sendiri, Mod se-divisi, atau Owner)
    if (field === 'name') {
        if (isGlobalOwner || isVipAdmin || isSelf || isModOfSameManagement) {
            let oldName = targetData.name
            targetData.name = value
            saveStaff(staffData)
            return m.reply(`✅ Nama berhasil diubah!\n\n📛 Lama: ${oldName}\n🆕 Baru: ${value}`)
        } else {
            return m.reply(`⛔ Kamu tidak punya akses untuk mengganti nama orang ini!`)
        }
    }

    // 2. Edit Role / Jabatan (Mod se-divisi cuma bisa promote/demote anak Support, Owner bebas)
    if (field === 'role') {
        let isMod = value.toLowerCase().includes('mod')
        let finalRole = isMod ? 'Moderator' : 'Support'

        if (isGlobalOwner || isVipAdmin) {
            // Owner bebas
            targetData.role = finalRole
        } else if (isModOfSameManagement && !isSelf) {
            // Mod se-divisi gak boleh promote orang lain jadi Mod (cuma Owner yg boleh), tapi boleh ngubah hal lain
            if (finalRole === 'Moderator') return m.reply(`⛔ Hanya Owner/VIP yang bisa mengangkat seseorang menjadi Moderator.`)
            targetData.role = finalRole
        } else {
            return m.reply(`⛔ Kamu tidak punya akses untuk mengubah jabatan!`)
        }

        saveStaff(staffData)
        
        // Sync ke SQL
        await db.user.update({
            where: { jid: targetJid },
            data: isMod ? { moderator: true, timSupport: true } : { moderator: false, timSupport: true }
        }).catch(() => {})

        return m.reply(`✅ Jabatan *${targetData.name}* berhasil diubah menjadi *${finalRole}*. (Tersinkronisasi dengan database)`)
    }

    // 3. Edit Management (Hanya Owner/VIP yang bisa mindahin orang ke divisi lain)
    if (field === 'man' || field === 'management') {
        if (isGlobalOwner || isVipAdmin) {
            let oldMan = targetData.management
            targetData.management = value
            saveStaff(staffData)
            return m.reply(`✅ Divisi berhasil dipindah!\n\n🏢 Lama: ${oldMan}\n🏢 Baru: ${value}`)
        } else {
            return m.reply(`⛔ Hanya Owner & VIP Admin yang bisa memindahkan divisi/management staff.`)
        }
    }

    return m.reply(`⚠️ Field tidak valid. Gunakan: name / role / man`)
}

handler.help = ['editstaff']
handler.tags = ['staff']
handler.command = /^(editstaff)$/i
handler.rowner = false // Sengaja dibikin false biar Mod/Staff bisa pake (tapi difilter di dalem script)

module.exports = handler
