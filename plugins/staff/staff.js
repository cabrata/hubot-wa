const { getStaff, saveStaff } = require('../../lib/staffManager')
const { db, getUser } = require('../../lib/database')

// Hierarki Pangkat Staff (Urutan dari bawah ke atas)
const ROLE_HIERARCHY = ['Trainee', 'Tim Support', 'Moderator', 'Supervisor'];

let handler = async (m, { conn, command, text, usedPrefix }) => {
    let staffData = getStaff()
    
    // ==========================================
    // 🛡️ PENGECEKAN HAK AKSES (DINAMIS)
    // ==========================================
    let senderWa = m.sender.split('@')[0];
    let isGlobalOwner = global.owner.map(v => v.replace(/[^0-9]/g, '')).includes(senderWa);
    
    // Cek apakah dia Supervisor (HRD) di JSON
    let isSupervisor = staffData[m.sender] && staffData[m.sender].role.toLowerCase().includes('supervisor');

    // =====================================
    // FITUR 1 & 2: REKRUT & PECAT (Akses: Owner & Supervisor)
    // =====================================
    if (/^(addstaff|delstaff)$/i.test(command)) {
        if (!isGlobalOwner && !isSupervisor) {
            return m.reply('❌ Akses Ditolak! Hanya Owner dan *Supervisor (HRD)* yang dapat mengatur staff.');
        }

        if (command === 'addstaff') {
            if (!text) return m.reply(`❓ Format: ${usedPrefix}addstaff 628xxx | Role (Support/Moderator/Supervisor) | Management`)
            
            let [nomor, roleRaw, management] = text.split('|').map(v => v?.trim())
            if (!nomor || !roleRaw || !management) return m.reply('❌ Format salah! Pastikan pakai pemisah |')

            let jid = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
            if (staffData[jid]) return m.reply('⚠️ Nomor ini sudah terdaftar sebagai staff!')

            let userDB = await getUser(jid)
            let namaStaff = userDB?.name || await conn.getName(jid) || 'Unknown'

            // Validasi input role
            let inputRole = roleRaw.toLowerCase()
            let finalRole = 'Tim Support'
            if (inputRole.includes('mod')) finalRole = 'Moderator'
            if (inputRole.includes('super') || inputRole.includes('hrd')) finalRole = 'Supervisor'

            // ⚠️ Supervisor gak boleh angkat orang jadi Supervisor (Cuma Owner yg boleh)
            if (!isGlobalOwner && finalRole === 'Supervisor') return m.reply('⛔ Hanya Owner yang bisa mengangkat seseorang menjadi Supervisor!')

            staffData[jid] = {
                name: namaStaff,
                role: finalRole,
                management: management,
                botNumber: '-',
                addedAt: Date.now(),
                activity: { dailyCmds: 0, modCmds: 0, inactiveDays: 0, lastResetDay: new Date().toISOString().split('T')[0] }
            }
            saveStaff(staffData)

            let isModUp = finalRole === 'Moderator' || finalRole === 'Supervisor';
            await db.user.update({
                where: { jid: jid },
                data: isModUp ? { moderator: true, timSupport: true } : { timSupport: true, moderator: false }
            }).catch(() => {})

            return m.reply(`✅ *STAFF BERHASIL DITAMBAHKAN*\n\n👤 Nama: ${namaStaff}\n🛡️ Role: ${finalRole}\n🏢 Management: ${management}`)
        }

        if (command === 'delstaff') {
            if (!text) return m.reply(`❓ Format: ${usedPrefix}delstaff 628xxx`)
            let jid = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
            
            if (!staffData[jid]) return m.reply('❌ Staff tersebut tidak ditemukan di database.')
            
            let targetRole = staffData[jid].role.toLowerCase();
            
            // Proteksi Kudeta
            if (global.owner.includes(jid.split('@')[0])) return m.reply('⚠️ Kamu tidak bisa memecat Owner!');
            if (!isGlobalOwner && targetRole.includes('supervisor')) return m.reply('⚠️ Supervisor tidak bisa memecat sesama Supervisor!');

            let nama = staffData[jid].name
            delete staffData[jid]
            saveStaff(staffData)

            await db.user.update({
                where: { jid: jid },
                data: { moderator: false, timSupport: false }
            }).catch(() => {})

            return m.reply(`🗑️ Akses staff untuk *${nama}* berhasil dicabut permanen dari sistem.`)
        }
    }

    // =====================================
    // FITUR 3: PROMOTE & DEMOTE (Akses: KHUSUS OWNER)
    // =====================================
    if (/^(spromote|sdemote)$/i.test(command)) {
        if (!isGlobalOwner) return m.reply('👑 Fitur Naik/Turun pangkat hanya bisa dilakukan oleh *Developer (Owner)*.');
        if (!text) return m.reply(`❓ Format: ${usedPrefix}${command} 628xxx`);

        let jid = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        if (!staffData[jid]) return m.reply('❌ Orang ini bukan staff bot.');

        let currentRole = staffData[jid].role;
        let currentIndex = ROLE_HIERARCHY.findIndex(r => r.toLowerCase() === currentRole.toLowerCase());

        if (currentIndex === -1) currentIndex = 1; // Default ke Tim Support kalo rolenya aneh

        if (command === 'spromote') {
            if (currentIndex >= ROLE_HIERARCHY.length - 1) return m.reply(`⭐ *${staffData[jid].name}* sudah mencapai pangkat tertinggi (*${ROLE_HIERARCHY[currentIndex]}*).`);
            currentIndex++;
        } else {
            if (currentIndex <= 0) return m.reply(`📉 *${staffData[jid].name}* sudah berada di pangkat terendah (*Trainee*). Pecat saja kalau tidak berguna.`);
            currentIndex--;
        }

        let newRole = ROLE_HIERARCHY[currentIndex];
        staffData[jid].role = newRole;
        saveStaff(staffData);

        // Update hak akses SQL berdasarkan pangkat baru
        let isModUp = newRole === 'Moderator' || newRole === 'Supervisor';
        let isSupportUp = newRole !== 'Trainee'; 

        await db.user.update({
            where: { jid: jid },
            data: { moderator: isModUp, timSupport: isSupportUp }
        }).catch(() => {});

        let icon = command === 'spromote' ? '📈' : '📉';
        return m.reply(`${icon} *UPDATE PANGKAT*\n\nStaff *${staffData[jid].name}* telah di-${command} menjadi *${newRole}*!`);
    }
}

handler.help = ['addstaff', 'delstaff', 'spromote', 'sdemote']
handler.tags = ['staff']
handler.command = /^(addstaff|delstaff|spromote|sdemote)$/i

module.exports = handler
