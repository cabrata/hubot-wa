const { getStaff } = require('../../lib/staffManager')

let handler = async (m, { conn, usedPrefix, command }) => {
    let staffData = await getStaff()
    
    let senderJid = m.sender;
    let senderWa = senderJid.split('@')[0];
    
    let isGlobalOwner = global.owner.map(v => v.replace(/[^0-9]/g, '')).includes(senderWa);
    let isStaff = !!staffData[senderJid];
    let isSupervisor = isStaff && staffData[senderJid].role.toLowerCase().includes('supervisor');

    if (!isGlobalOwner && !isStaff) {
        return m.reply('❌ Akses Ditolak! Kamu bukan anggota staff bot ini.');
    }

    m.reply('⏳ Memuat data absensi...')
    let today = new Date().toISOString().split('T')[0]

    // ==========================================
    // 📊 LOGIKA 1: OWNER & SUPERVISOR (LIHAT SEMUA)
    // ==========================================
    if (isGlobalOwner || isSupervisor) {
        let teks = `📊 *LAPORAN ABSENSI & AKTIVITAS STAFF*\n📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
        let groups = {};

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
                let disp = s.dispensasi || { cmd: 50, mod: 20 };
                
                let isCuti = s.busyTime && s.busyTime !== '-';
                let statusEmoji = '🟢'; 
                let detailCuti = '';

                // 🔥 Logika Status Cuti
                if (isCuti) {
                    statusEmoji = '💤';
                    let dateDiff = Math.ceil((new Date(s.busyTime) - new Date(today)) / (1000 * 60 * 60 * 24));
                    detailCuti = ` | Cuti: ${s.busyReason} (Sisa ${dateDiff} Hari)`;
                } else {
                    if (act.inactiveDays >= 1 && act.inactiveDays <= 2) statusEmoji = '🟡';
                    if (act.inactiveDays >= 3) statusEmoji = '🔴'; 
                }
                
                let modText = s.role.includes('Trainee') ? '' : ` | Mod: ${act.modCmds}/${disp.mod}`;
                
                teks += `${statusEmoji} *${s.name}* (${s.role})\n`;
                teks += `   └ Cmd: ${act.dailyCmds}/${disp.cmd}${modText} | Bolos: ${act.inactiveDays} Hari${detailCuti}\n`;
            });
            teks += '\n';
        }

        teks += `*Keterangan Indikator:*\n🟢 Aktif | 🟡 Kurang Aktif | 🔴 Bolos 3+ Hari | 💤 Cuti/Sibuk`;
        return m.reply(teks.trim());
    }

    // ==========================================
    // 👤 LOGIKA 2: STAFF BIASA (LIHAT DIRI SENDIRI)
    // ==========================================
    else {
        let s = staffData[senderJid];
        let act = s.activity || { dailyCmds: 0, modCmds: 0, inactiveDays: 0 };
        let disp = s.dispensasi || { cmd: 50, mod: 20 };
        let manKey = (s.management && s.management.trim() !== '-' && s.management.trim() !== '') ? s.management : 'Ready To Take';

        let isCuti = s.busyTime && s.busyTime !== '-';
        let statusEmoji = '🟢';
        let statusText = 'Aktif / Rajin';

        if (isCuti) {
            statusEmoji = '💤';
            let dateDiff = Math.ceil((new Date(s.busyTime) - new Date(today)) / (1000 * 60 * 60 * 24));
            statusText = `Sedang Cuti/Sibuk - ${s.busyReason} (Sisa ${dateDiff} Hari)`;
        } else {
            if (act.inactiveDays >= 1 && act.inactiveDays <= 2) {
                statusEmoji = '🟡';
                statusText = 'Kurang Aktif (Awas SP!)';
            }
            if (act.inactiveDays >= 3) {
                statusEmoji = '🔴';
                statusText = 'Pasif / Sering Bolos';
            }
        }

        let teks = `📝 *KARTU ABSENSI PERSONAL*\n\n`;
        teks += `👤 *Nama:* ${s.name}\n`;
        teks += `🛡️ *Role:* ${s.role}\n`;
        teks += `🏢 *Divisi:* ${manKey}\n\n`;
        
        teks += `*📊 Statistik Kamu:*\n`;
        teks += `└ Total Cmd Harian: ${act.dailyCmds} / ${disp.cmd} (Target)\n`;
        
        if (!s.role.includes('Trainee')) {
            teks += `└ Mod Cmd Dipakai: ${act.modCmds} / ${disp.mod} (Target)\n`;
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
