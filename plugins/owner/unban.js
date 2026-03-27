const { getUser, updateUser } = require('../../lib/database.js')
const { getStaff } = require('../../lib/staffManager')

// Inisialisasi array untuk nyimpen antrean unban
global.unbanRequests = global.unbanRequests || []

// GANTI PAKE ID GRUP STAFF LU!
const STAFF_GROUP_ID = '120363368633822650@g.us' 

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let senderJid = m.sender
    
    // Tarik data pengirim
    let senderData = await getUser(senderJid) || {}
    let staffData = await getStaff() || {}
    
    let isOwner = global.owner.includes(senderJid.split('@')[0])
    let sv = staffData[senderJid]?.role === 'Supervisor'
    let mod = staffData[senderJid]?.role === 'Moderator'
    let timSup = senderData.timSupport

    if (!(isOwner || sv || mod || timSup)) return m.reply('Lau sape mpruy? 🗿')

    let who;
    let reason = '';
    let requestIndex = -1;

    // 1. CEK APAKAH INPUTAN ADALAH ANGKA DARI LIST TIM SUPPORT (Contoh: .unban 1)
    if (text && !isNaN(text) && Number(text) > 0 && Number(text) <= global.unbanRequests.length) {
        requestIndex = Number(text) - 1;
        let req = global.unbanRequests[requestIndex];
        who = req.who;
        reason = req.reason;
    } 
    // 2. JIKA BUKAN DARI LIST, AMBIL DARI TAG/REPLY/NOMOR MANUAL
    else {
        who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null
        if (!who && text && !isNaN(text.split(' ')[0])) who = text.split(' ')[0] + '@s.whatsapp.net'
        
        // Ekstrak alasan buat TimSup ngajuin unban
        if (text) {
            if (text.includes('|')) {
                reason = text.split('|')[1].trim()
            } else {
                reason = text.replace(/@\d+/g, '').replace(/^\d+/, '').trim()
            }
        }
    }

    if (!who) throw `Tag orangnya, balas pesannya, atau masukkan nomor antrean!\n\n*Contoh Manual:* ${usedPrefix + command} @user\n*Contoh Acc List:* ${usedPrefix + command} 1`

    // ==========================================
    // KHUSUS TIM SUPPORT (Hanya bisa request)
    // ==========================================
    if (timSup && !isOwner && !sv && !mod) {
        if (!reason || reason.length < 3) throw 'Alasan unban wajib diisi bang biar jelas!\n\n*Contoh:* .unban @user | Dia udah minta maaf ke owner'
        
        // Masukin ke list unban
        global.unbanRequests.push({
            who: who,
            reason: reason,
            requestedBy: senderJid.split('@')[0],
        })

        let indexReq = global.unbanRequests.length
        let staffMsg = `🔔 *REQUEST UNBAN MASUK* 🔔\n\nTim Support @${senderJid.split('@')[0]} meminta untuk membuka ban:\n🎯 *Target:* @${who.split('@')[0]}\n📋 *Alasan:* ${reason}\n\nKetik *${usedPrefix + command} ${indexReq}* untuk menyetujui request ini.`
        
        // Kirim notif ke grup staff
        await conn.sendMessage(STAFF_GROUP_ID, { text: staffMsg, mentions: [senderJid, who] })
        return m.reply(`✅ Request unban untuk @${who.split('@')[0]} berhasil dikirim ke grup Staff dan menunggu persetujuan.`)
    }

    // ==========================================
    // SISTEM HIERARKI (OWNER > SV > MOD)
    // ==========================================
    let targetStaffData = staffData[who] || {}
    let isTargetOwner = global.owner.includes(who.split('@')[0])
    let isTargetSv = targetStaffData.role === 'Supervisor'
    let isTargetMod = targetStaffData.role === 'Moderator'

    // Rules Supervisi: Gak bisa unban Owner atau sesama SV (buat jaga-jaga kalau kena ban sistem)
    if (sv && !isOwner) {
        if (isTargetOwner || isTargetSv) return m.reply('❌ Anda tidak memiliki hak untuk meng-unban jabatan yang setara atau lebih tinggi!')
    }
    
    // Rules Moderator: Gak bisa unban Owner, SV, dan sesama Mod
    if (mod && !isOwner && !sv) {
        if (isTargetOwner || isTargetSv || isTargetMod) return m.reply('❌ Anda tidak memiliki hak untuk meng-unban jabatan yang setara atau lebih tinggi!')
    }

    // ==========================================
    // EKSEKUSI UNBAN
    // ==========================================
    let user = await getUser(who)
    if (!user) throw 'Pengguna tidak ada di dalam database!'
    if (!user.banned) throw 'Loh? Orang ini emang nggak lagi di-ban kok.'

    // Reset data user ke kondisi normal (TIPE DATA HARUS PERSIS SAMA KAYA SQL)
    let updateData = {
        banned: false,
        Banneduser: false,
        banLevel: 0n,         
        bannedTime: 0,        
        bannedReason: ''      
    }

    await updateUser(who, updateData)

    // Hapus dari list antrean jika di-acc melalui list
    if (requestIndex !== -1) {
        global.unbanRequests.splice(requestIndex, 1)
    }

    await conn.sendMessage(m.chat, { 
        text: `✅ *UNBANNED SUCCESS*\n\nBerhasil membuka gembok ban untuk @${who.split('@')[0]}!\nDatabase telah disinkronisasi, sekarang dia bisa pakai bot lagi.`, 
        mentions: [who] 
    }, { quoted: m })
}

handler.help = ['unban @user', 'unban [nomor list]']
handler.tags = ['owner']
handler.command = /^unban$/i
// handler.owner udah dihapus biar role lain bisa make

module.exports = handler
