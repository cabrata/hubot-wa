const { getUser, updateUser } = require('../../lib/database.js')
const { getStaff } = require('../../lib/staffManager')

// Inisialisasi array untuk nyimpen antrean ban (jangan dihapus)
global.banRequests = global.banRequests || []

// GANTI PAKE ID GRUP STAFF LU! (Bisa liat ID pake command pengecek ID grup)
const STAFF_GROUP_ID = '120363368633822650@g.us' 

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let senderJid = m.sender
    
    // Tarik data pengirim (buat ngecek role)
    let senderData = await getUser(senderJid) || {}
    let staffData = await getStaff() || {}
    
    let isOwner = global.owner.includes(senderJid.split('@')[0])
    let sv = staffData[senderJid]?.role === 'Supervisor'
    let mod = staffData[senderJid]?.role === 'Moderator'
    let timSup = senderData.timSupport // Diambil dari data pengirim, bukan target

    if (!(isOwner || sv || mod || timSup)) return m.reply('Lau sape mpruy? 🗿')

    let who;
    let reason = '';
    let requestIndex = -1;

    // 1. CEK APAKAH INPUTAN ADALAH ANGKA DARI LIST TIM SUPPORT (Contoh: .ban 1)
    if (text && !isNaN(text) && Number(text) > 0 && Number(text) <= global.banRequests.length) {
        requestIndex = Number(text) - 1;
        let req = global.banRequests[requestIndex];
        who = req.who;
        reason = req.reason;
    } 
    // 2. JIKA BUKAN DARI LIST, AMBIL DARI TAG/REPLY/NOMOR MANUAL
    else {
        who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null
        if (!who && text && !isNaN(text.split(' ')[0])) who = text.split(' ')[0] + '@s.whatsapp.net'
        
        // Ekstrak alasan (support pemisah "|" atau spasi biasa)
        if (text) {
            if (text.includes('|')) {
                reason = text.split('|')[1].trim()
            } else {
                reason = text.replace(/@\d+/g, '').replace(/^\d+/, '').trim()
            }
        }
    }

    if (!who) throw `Tag orangnya, balas pesannya, atau masukkan nomor antrean!\n\n*Contoh Manual:* ${usedPrefix + command} @user | alasan\n*Contoh Acc List:* ${usedPrefix + command} 1`
    if (who === conn.user.jid) throw 'Ngapain ban bot sendiri dah 🗿'

    // ==========================================
    // KHUSUS TIM SUPPORT (Hanya bisa request)
    // ==========================================
    if (timSup && !isOwner && !sv && !mod) {
        if (!reason || reason.length < 3) throw 'Alasan wajib diisi dengan jelas bang!\n\n*Contoh:* .ban @user | Spam berulang kali'
        
        // Masukin ke list
        global.banRequests.push({
            who: who,
            reason: reason,
            requestedBy: senderJid.split('@')[0],
        })

        let indexReq = global.banRequests.length
        let staffMsg = `🔔 *REQUEST BAN MASUK* 🔔\n\nTim Support @${senderJid.split('@')[0]} meminta untuk membanned:\n🎯 *Target:* @${who.split('@')[0]}\n📋 *Alasan:* ${reason}\n\nKetik *${usedPrefix + command} ${indexReq}* untuk menyetujui request ini.`
        
        // Kirim notif ke grup staff
        await conn.sendMessage(STAFF_GROUP_ID, { text: staffMsg, mentions: [senderJid, who] })
        return m.reply(`✅ Request ban untuk @${who.split('@')[0]} berhasil dikirim ke grup Staff dan menunggu persetujuan.`)
    }

    // ==========================================
    // SISTEM HIERARKI (OWNER > SV > MOD)
    // ==========================================
    if (!reason) reason = 'Melanggar rules bot'

    let targetStaffData = staffData[who] || {}
    let isTargetOwner = global.owner.includes(who.split('@')[0])
    let isTargetSv = targetStaffData.role === 'Supervisor'
    let isTargetMod = targetStaffData.role === 'Moderator'

    // Owner bisa bebas (kecuali ban owner)
    if (isTargetOwner) throw 'Mana berani ban Owner 🥶'
    
    // Rules Supervisi: Gak bisa ban SV
    if (sv && !isOwner) {
        if (isTargetSv) return m.reply('❌ Anda tidak memiliki hak untuk nge-banned sesama Supervisor!')
    }
    
    // Rules Moderator: Gak bisa ban SV dan sesama Mod
    if (mod && !isOwner && !sv) {
        if (isTargetSv) return m.reply('❌ Moderator tidak berhak membanned Supervisor!')
        if (isTargetMod) return m.reply('❌ Anda tidak memiliki hak untuk nge-banned sesama Moderator!')
    }

    // ==========================================
    // EKSEKUSI BANNED
    // ==========================================
    let user = await getUser(who)
    if (!user) throw 'Pengguna tidak ditemukan di dalam database!'

    let updateData = {
        banned: true,
        banLevel: 9,
        bannedTime: BigInt(Date.now()),
        bannedUntil: 0n,
        bannedReason: `[Manual Ban] ${reason}`
    }

    await updateUser(who, updateData)

    // Hapus dari list antrean jika di-acc melalui list
    if (requestIndex !== -1) {
        global.banRequests.splice(requestIndex, 1)
    }

    await conn.sendMessage(m.chat, { 
        text: `🔨 *BANNED SUCCESS*\n\nBerhasil membanned @${who.split('@')[0]}!\n*Alasan:* ${reason}`, 
        mentions: [who] 
    }, { quoted: m })
    
    return conn.sendMessage(who, { 
        text: `🚫 *USER BANNED*\n\nNomor anda tidak dapat menggunakan bot HuTao lagi!\n*Alasan:* ${reason}`, 
        mentions: [who] 
    })
}

handler.help = ['ban @user [alasan]', 'ban [nomor list]']
handler.tags = ['owner']
handler.command = /^(ban|banned)$/i

module.exports = handler
