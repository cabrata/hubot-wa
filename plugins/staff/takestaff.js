const { getStaff, saveStaff, getOwnerDB } = require('../../lib/staffManager')
const { db } = require('../../lib/database')

let handler = async (m, { conn, text, usedPrefix }) => {
    if (!text) return m.reply(`❓ Format: ${usedPrefix}takestaff 628xxx | Role (Moderator/Tim Support)`);
    
    let [nomor, roleRaw] = text.split('|').map(v => v?.trim());
    if (!nomor || !roleRaw) return m.reply('❌ Format salah! Gunakan pemisah |');

    let targetJid = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    // 🔥 FIX 1: Jangan lupa dikasih await bang
    let staffData = await getStaff();
    let ownerData = await getOwnerDB();

    if (!staffData[targetJid]) return m.reply('❌ Anak ini belum mendaftar pakai .joinstaff!');
    
    // 🔥 FIX 2: Benerin jebakan logika OR (||) jadi AND (&&)
    let targetMan = staffData[targetJid].management ? staffData[targetJid].management.trim() : '-';
    if (targetMan !== '-' && targetMan !== '' && targetMan !== 'Ready To Take') {
        return m.reply(`⚠️ Anak ini sudah menjadi milik *${staffData[targetJid].management}*!`);
    }

   // ==========================================
    // 🕵️ LOGIKA HYBRID CHECK (Owner + Mod)
    // ==========================================
    let myManagement = null;
    let senderWa = m.sender;

    // A. Cek apakah pengirim adalah Owner/Admin (Database VIP)
    if (ownerData) {
        for (let key in ownerData) {
            // Kita cek apakah JID sender ada di array staff botOwnership
            if (ownerData[key].staff && ownerData[key].staff.includes(senderWa)) {
                myManagement = ownerData[key].owner; // Ambil nama management aslinya
                break;
            }
        }
    }

    // B. Cek apakah pengirim adalah Moderator/Supervisor (Database Staff)
    if (!myManagement && staffData[senderWa]) {
        let s = staffData[senderWa];
        let role = (s.role || '').toLowerCase();

        // Hanya Moderator atau Supervisor yang punya wewenang take
        if (role.includes('moderator') || role.includes('supervisor')) {
            myManagement = s.management;
        } else {
            return m.reply('❌ Akses Ditolak! Kamu adalah *Tim Support*. Hanya Moderator atau Supervisor yang boleh merekrut staff baru!');
        }
    }

    if (!myManagement || myManagement === 'Ready To Take' || myManagement === '-') {
        return m.reply('❌ Kamu bukan bagian dari Management manapun! Kamu tidak berhak merekrut staff.');
    }

    let finalRole = roleRaw.toLowerCase().includes('mod') ? 'Moderator' : 'Tim Support';

    // Pindahkan Staff di JSON
    staffData[targetJid].management = myManagement;
    staffData[targetJid].role = finalRole;
    await saveStaff(staffData); // 🔥 FIX 3: Tambahin await pas nge-save

    // Berikan pangkat mutlak di SQL
    await db.user.update({
        where: { jid: targetJid },
        data: finalRole === 'Moderator' ? { moderator: true, timSupport: true } : { timSupport: true, moderator: false }
    }).catch(() => {});

    m.reply(`🤝 *REKRUTMEN BERHASIL*\n\nStaff *${staffData[targetJid].name}* resmi ditarik dari bursa dan bergabung dengan *${myManagement}* sebagai *${finalRole}*.`);
}

handler.command = /^takestaff$/i;
module.exports = handler;
