const { getStaff } = require('../../lib/staffManager')

let handler = async (m, { conn, usedPrefix, command }) => {
    let staffData = await getStaff()
    
    // ==========================================
    // 🛡️ PENGECEKAN IDENTITAS SENDER
    // ==========================================
    let senderJid = m.sender;
    let senderWa = senderJid.split('@')[0];
    
    let isGlobalOwner = global.owner.map(v => v.replace(/[^0-9]/g, '')).includes(senderWa);
    let isStaff = !!staffData[senderJid];
    let isSupervisor = isStaff && staffData[senderJid].role.toLowerCase().includes('supervisor');

    // Kalo yang ngetik bukan owner dan kaga kedaftar jadi staff sama sekali, tolak!
    if (!isGlobalOwner && !isStaff) {
        return m.reply('❌ Akses Ditolak! Kamu bukan anggota staff bot ini.');
    }

    m.reply('⏳ Memuat data absensi...')

    // ==========================================
    // 📊 LOGIKA 1: OWNER & SUPERVISOR (LIHAT SEMUA)
    // ==========================================
    if (isGlobalOwner || isSupervisor) {
        let teks = `📊 *LAPORAN ABSENSI & AKTIVITAS STAFF*\n📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
        let groups = {};

        // Kelompokkin berdasarkan Management
        for (let jid in staffData) {
            let s = staffData[jid];
            let manKey = (s.management && s.management.trim() !== '-' && s.management.trim() !== '') ? s.management : 'Ready To Take';
            
            if (!groups[manKey]) groups[manKey] = [];
            groups[manKey].push({ jid, ...s });
        }

        for (let key in groups) {
            let title = key === 'Ready To Take' ? key : key.toUpperCase();
            teks += `🏢 *${title}*\n`;
            
            groups[key].sort((a, b) => {
                let actA = a.activity || { inactiveDays: 0 };
                let actB = b.activity || { inactiveDays: 0 };
                return actA.inactiveDays - actB.inactiveDays;
            });

            groups[key].forEach(s => {
                let act = s.activity || { dailyCmds: 0, modCmds: 0, inactiveDays: 0 };
                
                let statusEmoji = '🟢'; 
                if (act.inactiveDays >= 1 && act.inactiveDays <= 2) statusEmoji = '🟡';
                if (act.inactiveDays >= 3) statusEmoji = '🔴'; 
                
                let modText = s.role.includes('Trainee') ? '' : ` | Mod Cmd: ${act.modCmds}`;
                
                teks += `${statusEmoji} *${s.name}* (${s.role})\n`;
                teks += `   └ Total Cmd: ${act.dailyCmds}${modText} | Bolos: ${act.inactiveDays} Hari\n`;
            });
            teks += '\n';
        }

        teks += `*Keterangan Indikator:*\n🟢 Aktif (Bolos 0 hari)\n🟡 Kurang Aktif (Bolos 1-2 hari)\n🔴 Pasif / AFK (Bolos 3+ hari)`;
        return m.reply(teks.trim());
    }

    // ==========================================
    // 👤 LOGIKA 2: STAFF BIASA (LIHAT DIRI SENDIRI)
    // ==========================================
    else {
        let s = staffData[senderJid];
        let act = s.activity || { dailyCmds: 0, modCmds: 0, inactiveDays: 0 };
        let manKey = (s.management && s.management.trim() !== '-' && s.management.trim() !== '') ? s.management : 'Ready To Take';

        // Tentukan status emoji buat personal
        let statusEmoji = '🟢';
        let statusText = 'Aktif / Rajin';
        if (act.inactiveDays >= 1 && act.inactiveDays <= 2) {
            statusEmoji = '🟡';
            statusText = 'Kurang Aktif (Awas SP!)';
        }
        if (act.inactiveDays >= 3) {
            statusEmoji = '🔴';
            statusText = 'Pasif / Sering Bolos';
        }

        let teks = `📝 *KARTU ABSENSI PERSONAL*\n\n`;
        teks += `👤 *Nama:* ${s.name}\n`;
        teks += `🛡️ *Role:* ${s.role}\n`;
        teks += `🏢 *Divisi:* ${manKey}\n\n`;
        
        teks += `*📊 Statistik Kamu:*\n`;
        teks += `└ Total Cmd Harian: ${act.dailyCmds}\n`;
        
        // Trainee kan ga punya akses modCmd, jadi disembunyiin aja
        if (!s.role.includes('Trainee')) {
            teks += `└ Mod Cmd Dipakai: ${act.modCmds}\n`;
        }
        
        teks += `└ Total Bolos: ${act.inactiveDays} Hari\n\n`;
        teks += `*Status Saat Ini:* ${statusEmoji} ${statusText}`;

        return m.reply(teks.trim());
    }
}

handler.help = ['cekabsen', 'absenstaff'];
handler.tags = ['staff'];
handler.command = /^(cekabsen|absenstaff|staffabsen)$/i;

module.exports = handler;
