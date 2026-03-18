const { getStaff, getOwnerDB } = require('../../lib/staffManager')

let handler = async (m) => {
    let ownerData = await getOwnerDB();
    let staffData = await getStaff();

    let groups = {};

    // ==========================================
    // 1. AMBIL KASTA DEWA (Owner & Admin)
    // ==========================================
    for (let manKey in ownerData) {
        let properName = manKey;
        if (!groups[properName]) groups[properName] = [];

        let data = ownerData[manKey];

        if (data.owner) {
            groups[properName].push({ jid: data.owner, name: data.names[data.owner] || 'Unknown', role: 'Owner', weight: 4 });
        }

        if (data.staff) {
            data.staff.forEach(s => {
                groups[properName].push({ jid: s, name: data.names[s] || 'Unknown', role: 'Admin', weight: 3 });
            });
        }
    }

    // ==========================================
    // 2. AMBIL KASTA PEKERJA (Mod, Support, Trainee)
    // ==========================================
    for (let jid in staffData) {
        let s = staffData[jid];
        let manKey = s.management || 'Lainnya';

        // 🔥 LOGIKA BARU: Kalo management-nya "-" atau kosong, langsung lempar ke Ready To Take
        if (manKey.trim() === '-' || manKey.trim() === '') {
            manKey = 'Ready To Take';
        }

        if (!groups[manKey]) groups[manKey] = [];

        // Cek duplikat (kalau dia udah ada di Kasta Dewa, skip aja)
        let isDuplicate = groups[manKey].find(v => v.jid === jid);
        if (!isDuplicate) {
            // Tentukan Bobot Pangkat
            let bobot = 1; // Default: Support
            let currentRole = s.role.toLowerCase();
            if (currentRole.includes('mod')) bobot = 2;
            if (currentRole.includes('super') || currentRole.includes('hrd')) bobot = 3; // Supervisor di atas MK
            if (manKey === 'Ready To Take' || currentRole.includes('trainee')) bobot = 0;

            groups[manKey].push({
                jid: jid,
                name: s.name,
                role: s.role,
                weight: bobot
            });
        }
    }

    // ==========================================
    // 3. FORMAT OUTPUT (Persis Screenshot)
    // ==========================================
    let teks = '*Staff list*\n\n';

    // Urutkan Management: Official Paling Atas, Ready To Take Paling Bawah
    let groupKeys = Object.keys(groups).sort((a, b) => {
        let aLow = a.toLowerCase(), bLow = b.toLowerCase();
        
        // Official prioritas utama (paling atas)
        if (aLow.includes('official') || aLow.includes('utama')) return -1;
        if (bLow.includes('official') || bLow.includes('utama')) return 1;
        
        // Ready To Take dibuang ke paling bawah
        if (a === 'Ready To Take') return 1;
        if (b === 'Ready To Take') return -1;
        
        return a.localeCompare(b); // Sisanya sesuai abjad
    });

    for (let key of groupKeys) {
        let title = key;

        // 🔥 LOGIKA BARU: Jangan ubah nama atau nambahin kata "Management" buat Ready To Take
        if (key !== 'Ready To Take' && key !== 'Lainnya') {
            title = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (!title.toLowerCase().includes('management') && !title.toLowerCase().includes('system')) {
                title += ' Management';
            }
        }

        teks += `*${title}*\n`;

        // Urutkan orang di dalam grupnya dari pangkat tertinggi ke terendah
        groups[key].sort((a, b) => b.weight - a.weight);

        groups[key].forEach(s => {
            let number = s.jid.split('@')[0];
            let numberText = s.jid.includes('N/A') ? 'N/A' : number;

            // Format List Utama Tanpa Bot Number
            teks += `• wa.me/${numberText} *${s.name}* (${s.role})\n`;
        });
        teks += `\n`; // Spasi antar grup
    }

    teks += `| Nomor Staff bukan bot!\n| Staff number is not a bot!`;

    return m.reply(teks.trim());
}

handler.help = ['liststaff'];
handler.tags = ['info'];
handler.command = /^(liststaff|staff)$/i;

module.exports = handler;
