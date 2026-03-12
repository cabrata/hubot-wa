//rpg-cerai
const { getUser, updateEconomy, updateUser } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender)
    if (!user) return m.reply("User tidak ditemukan di database.");

    switch (command) {
        case 'cerai': {
            if (!user.pasanganChar) {
                return m.reply(`Kamu aja masih jomblo, mau cerai sama siapa? 🗿\nKetik *${usedPrefix}charpas* buat cari pasangan dulu.`);
            }

            let namaPasangan = user.pasanganChar.name;

            let teks = `⚖️ *SURAT PANGGILAN PENGADILAN* ⚖️\n\n`;
            teks += `Apakah kamu yakin ingin mengajukan gugatan cerai / putus hubungan dengan *${namaPasangan}*?\n\n`;
            
            teks += `⚠️ *KONSEKUENSI PERCERAIAN:*\n`;
            if (user.statusNikah) {
                teks += `1. **Harta Gono-Gini:** 50% dari total uangmu (Rp${(user.money || 0).toLocaleString('id-ID')}) akan diserahkan kepada mantan.\n`;
            } else {
                teks += `1. Karena belum nikah resmi, uangmu aman. Tapi semua kenangan akan hilang.\n`;
            }

            if (user.anak && user.anak.length > 0) {
                teks += `2. **Hak Asuh Anak:** Hak asuh atas ${user.anak.length} anakmu akan jatuh ke tangan ${namaPasangan}. Anak akan dicoret dari KK-mu.\n\n`;
            } else if (user.hamil) {
                teks += `2. **Kandungan:** Anak yang sedang dikandung akan dibawa oleh ${namaPasangan}.\n\n`;
            } else {
                teks += `\n`;
            }

            teks += `Balas pesan ini dengan angka:\n`;
            teks += `*1.* Lanjut Cerai 🔨\n`;
            teks += `*2.* Batalkan (Masih Sayang) 🥺`;

            m.reply(teks);

            global.ceraiSession = global.ceraiSession || {};
            global.ceraiSession[m.sender] = true;
            break;
        }
    }
};

handler.before = async function (m, { conn }) {
    global.ceraiSession = global.ceraiSession || {};
    let budy = m.text;

    if (!budy) return;

    if (global.ceraiSession[m.sender]) {
        let user = await getUser(m.sender)
        
        if (!user || !user.pasanganChar) {
            delete global.ceraiSession[m.sender];
            return;
        }

        if (['1', '2'].includes(budy)) {
            let namaPasangan = user.pasanganChar.name;

            if (budy === '2') {
                m.reply(`Syukurlah... Tolong selesaikan masalah kalian baik-baik ya. Jangan jadikan perpisahan sebagai jalan keluar. 💖`);
                delete global.ceraiSession[m.sender];
                return true;
            }

            if (budy === '1') {
                let teksCerai = `🔨 *TOK! TOK! TOK!* 🔨\n\n`;
                teksCerai += `Pengadilan telah resmi mengesahkan perceraianmu dengan *${namaPasangan}*.\n\n`;
                
                let sisaUang = user.money || 0

                if (user.statusNikah) {
                    let hartaGonoGini = Math.floor((user.money || 0) * 0.5);
                    sisaUang -= hartaGonoGini;
                    await updateEconomy(m.sender, { money: sisaUang });
                    teksCerai += `💸 *Harta Gono-Gini:*\nUangmu telah dipotong sebesar Rp${hartaGonoGini.toLocaleString('id-ID')} untuk diberikan kepada mantan pasanganmu.\n`;
                    teksCerai += `💳 Sisa Uangmu Sekarang: Rp${sisaUang.toLocaleString('id-ID')}\n\n`;
                }

                if (user.anak && user.anak.length > 0) {
                    teksCerai += `👶 *Hak Asuh Anak:*\nHak asuh atas ${user.anak.length} anak jatuh kepada *${namaPasangan}*. Nama mereka telah dihapus dari Kartu Keluargamu.\n\n`;
                } else if (user.hamil) {
                    teksCerai += `🤰 *Status Kandungan:*\nMantanmu membawa pergi anak yang sedang berada di kandungannya.\n\n`;
                }

                teksCerai += `Semua datamu di Kartu Keluarga (KK) telah di-reset menjadi *Lajang/Single*.\nSemoga kamu menemukan kebahagiaan yang baru. 🥀`;

                // Reset Semua Data Pasangan & Keluarga ke SQL (null/false/0)
                await updateUser(m.sender, {
                    pasanganChar: null,
                    statusNikah: false,
                    tanggalNikah: 0,
                    anak: null,       
                    hamil: false,      
                    hamilStart: 0, 
                    lastKencan: 0, 
                    lastCekAyang: 0,
                    lastRawatAnak: 0,
                    gift: null       
                })

                m.reply(teksCerai);
                delete global.ceraiSession[m.sender];
                return true;
            }
        }
    }
};

handler.help = ['cerai'];
handler.tags = ['fun', 'rpg'];
handler.command = ['cerai', 'putus', 'divorce'];

module.exports = handler;