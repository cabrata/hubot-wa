const { getStaff, saveStaff, getOwnerDB } = require('../../lib/staffManager')
const { db } = require('../../lib/database')

let handler = async (m, { conn, text, usedPrefix }) => {
    if (!text) return m.reply(`❓ Format: ${usedPrefix}takestaff 628xxx | Role (Moderator/Tim Support)`);
    
    let [nomor, roleRaw] = text.split('|').map(v => v?.trim());
    if (!nomor || !roleRaw) return m.reply('❌ Format salah! Gunakan pemisah |');

    let targetJid = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    let staffData = getStaff();
    let ownerData = getOwnerDB();

    if (!staffData[targetJid]) return m.reply('❌ Anak ini belum mendaftar pakai .joinstaff!');
    if (staffData[targetJid].management !== 'Ready To Take') return m.reply(`⚠️ Anak ini sudah menjadi milik *${staffData[targetJid].management}*!`);

   // ==========================================
    // 🕵️ LOGIKA HYBRID CHECK (Owner + Mod)
    // ==========================================
    let myManagement = null;
    let senderWa = m.sender;

    // A. Cek apakah pengirim adalah Owner/Admin (Database VIP)
    for (let key in ownerData) {
        if (ownerData[key].owner === senderWa || (ownerData[key].staff && ownerData[key].staff.includes(senderWa))) {
            myManagement = key;
            break;
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

    if (!myManagement || myManagement === 'Ready To Take') {
        return m.reply('❌ Kamu bukan bagian dari Management manapun! Kamu tidak berhak merekrut staff.');
    }

    let finalRole = roleRaw.toLowerCase().includes('mod') ? 'Moderator' : 'Tim Support';

    // Pindahkan Staff di JSON
    staffData[targetJid].management = myManagement;
    staffData[targetJid].role = finalRole;
    saveStaff(staffData);

    // Berikan pangkat mutlak di SQL
    await db.user.update({
        where: { jid: targetJid },
        data: finalRole === 'Moderator' ? { moderator: true, timSupport: true } : { timSupport: true, moderator: false }
    }).catch(() => {});

    m.reply(`🤝 *REKRUTMEN BERHASIL*\n\nStaff *${staffData[targetJid].name}* resmi ditarik dari bursa dan bergabung dengan *${myManagement.toUpperCase()}* sebagai *${finalRole}*.`);
}

handler.command = /^takestaff$/i;
module.exports = handler;
