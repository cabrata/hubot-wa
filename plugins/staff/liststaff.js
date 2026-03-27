const { getStaff, getOwnerDB } = require('../../lib/staffManager')

let handler = async (m) => {
    let ownerData = await getOwnerDB();
    let staffData = await getStaff();

    let groups = {};

    // ==========================================
    // 1. AMBIL KASTA DEWA
    // ==========================================
    for (let manKey in ownerData) {
        let properName = manKey;
        if (!groups[properName]) groups[properName] = [];

        let data = ownerData[manKey];
        if (data.owner) groups[properName].push({ jid: data.owner, name: data.names[data.owner] || 'Unknown', role: 'Owner', weight: 4, isBusy: false });
        
        if (data.staff) {
            data.staff.forEach(s => {
                groups[properName].push({ jid: s, name: data.names[s] || 'Unknown', role: 'Admin', weight: 3, isBusy: false });
            });
        }
    }

    // ==========================================
    // 2. AMBIL KASTA PEKERJA
    // ==========================================
    for (let jid in staffData) {
        let s = staffData[jid];
        let manKey = s.management || 'Lainnya';

        if (manKey.trim() === '-' || manKey.trim() === '') manKey = 'Ready To Take';

        if (!groups[manKey]) groups[manKey] = [];
        let isDuplicate = groups[manKey].find(v => v.jid === jid);
        
        if (!isDuplicate) {
            let bobot = 1; 
            let currentRole = s.role.toLowerCase();
            if (currentRole.includes('mod')) bobot = 2;
            if (currentRole.includes('super') || currentRole.includes('hrd')) bobot = 3; 
            if (manKey === 'Ready To Take' || currentRole.includes('trainee')) bobot = 0;

            // 🔥 Cek apakah staff ini lagi cuti
            let sibuk = s.busyTime && s.busyTime !== '-';

            groups[manKey].push({
                jid: jid,
                name: s.name,
                role: s.role,
                weight: bobot,
                isBusy: sibuk
            });
        }
    }

    // ==========================================
    // 3. FORMAT OUTPUT
    // ==========================================
    let teks = '*Staff list*\n\n';
    let groupKeys = Object.keys(groups).sort((a, b) => {
        let aLow = a.toLowerCase(), bLow = b.toLowerCase();
        if (aLow.includes('official') || aLow.includes('utama')) return -1;
        if (bLow.includes('official') || bLow.includes('utama')) return 1;
        if (a === 'Ready To Take') return 1;
        if (b === 'Ready To Take') return -1;
        return a.localeCompare(b);
    });

    for (let key of groupKeys) {
        let title = key;
        if (key !== 'Ready To Take' && key !== 'Lainnya') {
            title = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (!title.toLowerCase().includes('management') && !title.toLowerCase().includes('system')) {
                title += ' Management';
            }
        }

        teks += `*${title}*\n`;
        groups[key].sort((a, b) => b.weight - a.weight);

        groups[key].forEach(s => {
            let number = s.jid.split('@')[0];
            let numberText = s.jid.includes('N/A') ? 'N/A' : number;
            
            // 🔥 Nambahin tanda tidur kalau lagi cuti
            let emotCuti = s.isBusy ? ' *(💤 Busy)*' : '';

            teks += `• wa.me/${numberText} *${s.name}* (${s.role})${emotCuti}\n`;
        });
        teks += `\n`; 
    }

    teks += `| Nomor Staff bukan bot!\n| Staff number is not a bot!`;
    return m.reply(teks.trim());
}

handler.help = ['liststaff'];
handler.tags = ['info'];
handler.command = /^(liststaff|staff)$/i;

module.exports = handler;
