const { getStaff, saveStaff } = require('../../lib/staffManager')

let handler = async (m, { conn, text, command, usedPrefix }) => {
    let staffData = await getStaff()

    // Cek Hak Akses (Cuma Owner & HRD)
    let senderWa = m.sender.split('@')[0];
    let isGlobalOwner = global.owner.map(v => v.replace(/[^0-9]/g, '')).includes(senderWa);
    let isSupervisor = staffData[m.sender] && staffData[m.sender].role.toLowerCase().includes('supervisor');

    if (!isGlobalOwner && !isSupervisor) {
        return m.reply('❌ Akses Ditolak! Cuma Owner dan HRD (Supervisor) yang bisa ngurus dispensasi & cuti.');
    }

    let type = command.toLowerCase()

    // ==========================================
    // 1. FITUR STAFF BUSY (CUTI)
    // ==========================================
    if (type === 'staffbusy') {
        if (!text) return m.reply(`❓ Format:\n- Aktifin: ${usedPrefix}staffbusy 628xxx | Alasan | Jumlah Hari\n- Matiin: ${usedPrefix}staffbusy 628xxx`)

        let args = text.split('|').map(v => v?.trim())
        let nomor = args[0]
        let jid = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

        if (!staffData[jid]) return m.reply('❌ Orang ini bukan staff bot.')

        // Kalau cuma masukin nomor (matiin cuti)
        if (args.length === 1) {
            staffData[jid].busyReason = '-'
            staffData[jid].busyTime = '-'
            await saveStaff(staffData)
            return m.reply(`✅ Status sibuk/cuti untuk *${staffData[jid].name}* berhasil dicabut. Target absen kembali normal!`)
        }

        // Kalau masukin alasan & durasi hari
        let alasan = args[1]
        let durasi = parseInt(args[2])

        if (!alasan || isNaN(durasi)) return m.reply('❌ Format hari/alasan salah! Contoh: .staffbusy 628xxx | Sibuk Ujian | 30')

        // Hitung tanggal selesai
        let date = new Date()
        date.setDate(date.getDate() + durasi)
        let expDate = date.toISOString().split('T')[0]

        staffData[jid].busyReason = alasan
        staffData[jid].busyTime = expDate
        await saveStaff(staffData)

        return m.reply(`💤 *IZIN CUTI DITERIMA*\n\n👤 Nama: ${staffData[jid].name}\n📝 Alasan: ${alasan}\n⏳ Durasi: ${durasi} Hari\n📅 Berakhir: ${expDate}\n\nSelama masa ini, dia aman dari hukuman SP dan kick harian.`)
    }

    // ==========================================
    // 2. FITUR STAFF CMD (DISPENSASI TARGET)
    // ==========================================
    if (type === 'staffcmd') {
        if (!text) return m.reply(`❓ Format: ${usedPrefix}staffcmd 628xxx | Target Cmd | Target Mod Cmd\n📌 Contoh: ${usedPrefix}staffcmd 628123 | 20 | 5`)

        let args = text.split('|').map(v => v?.trim())
        let nomor = args[0]
        let jid = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        let tCmd = parseInt(args[1])
        let tMod = parseInt(args[2])

        if (!staffData[jid]) return m.reply('❌ Orang ini bukan staff bot.')
        if (isNaN(tCmd) || isNaN(tMod)) return m.reply('❌ Target harus berupa angka!')

        // Bikin objek dispensasi kalau belum ada (jaga-jaga)
        if (!staffData[jid].dispensasi) staffData[jid].dispensasi = { cmd: 50, mod: 20 }

        staffData[jid].dispensasi.cmd = tCmd
        staffData[jid].dispensasi.mod = tMod
        await saveStaff(staffData)

        return m.reply(`✅ *DISPENSASI TARGET*\n\n👤 Nama: ${staffData[jid].name}\n🎯 Target Baru:\n- Normal Cmd: ${tCmd} per hari\n- Mod Cmd: ${tMod} per hari`)
    }
}

handler.help = ['staffbusy', 'staffcmd']
handler.tags = ['staff']
handler.command = /^(staffbusy|staffcmd)$/i

module.exports = handler
