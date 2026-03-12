const { getStaff, saveStaff } = require('../../lib/staffManager')
const { db } = require('../../lib/database')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 🛡️ VERIFIKASI GRUP KHUSUS
    if (m.chat !== '120363368633822650@g.us') {
        return m.reply('❌ Pendaftaran staff hanya bisa dilakukan di *Grup Pusat*!');
    }
    
    let staffData = getStaff();
    if (staffData[m.sender]) return m.reply('⚠️ Kamu sudah terdaftar di database staff!');

    if (!text) return m.reply(`❓ *FORMAT PENDAFTARAN:*\n\n${usedPrefix}${command} Nama | Umur | Nomor Bot (opsional)\n\n_Contoh:_ ${usedPrefix}${command} Nabil | 17 | 628123456789`);

    let [nama, umur, botNum] = text.split('|').map(v => v?.trim());
    
    // 🛡️ VERIFIKASI ISI DATA
    if (!nama || !umur) return m.reply('❌ Nama dan Umur wajib diisi!');
    if (isNaN(umur)) return m.reply('❌ Umur harus berupa angka!');

    // Masukkan ke "Ready To Take"
    staffData[m.sender] = {
        name: nama,
        role: 'Trainee', // Status sementara sebelum diambil
        management: 'Ready To Take',
        age: umur,
        botNumber: botNum || '-',
        addedAt: Date.now(),
        activity: { dailyCmds: 0, modCmds: 0, inactiveDays: 0, lastResetDay: new Date().toISOString().split('T')[0] }
    };

    saveStaff(staffData);

    // Kasih pangkat Tim Support "bodong" (sementara) biar dia terdeteksi di sistem
    await db.user.update({
        where: { jid: m.sender },
        data: { timSupport: true }
    }).catch(() => {});

    let teks = `🎉 *PENDAFTARAN DITERIMA* 🎉\n\n` +
               `Selamat datang, *${nama}*! Data kamu telah diverifikasi dan masuk ke bursa pencarian.\n\n` +
               `🏢 Status: *Ready To Take*\n` +
               `📌 Menunggu di-take oleh Owner Management.`;
    m.reply(teks);
}

handler.command = /^joinstaff$/i;
handler.group = true;
module.exports = handler;
