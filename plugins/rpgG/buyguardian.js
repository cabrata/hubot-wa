const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    let staffList = Array.isArray(guild.staff) ? guild.staff : [];
    if (guild.owner !== m.sender && !staffList.includes(m.sender)) {
        return m.reply('⛔ Hanya Owner dan Staff yang bisa mengurus Guardian Markas.');
    }

    // Daftar Guardian (Diperluas & Harga Disesuaikan)
    let guardians = {
        'golem': { 
            id: 1,
            name: '🪨 Golem Batu', 
            price: 50_000_000_000n, 
            eliksir: 0, 
            def: 5000,
            desc: 'Penjaga dasar yang terbuat dari bebatuan kokoh. Tahan terhadap serangan fisik ringan.'
        },
        'valkyrie': { 
            id: 2,
            name: '👼 Valkyrie', 
            price: 500_000_000_000n, 
            eliksir: 500, 
            def: 15000,
            desc: 'Prajurit langit dengan pedang cahaya. Mampu memukul mundur pasukan musuh.'
        },
        'naga': { 
            id: 3,
            name: '🐉 Naga Api', 
            price: 2_000_000_000_000n, 
            eliksir: 2000, 
            def: 50000,
            desc: 'Naga raksasa yang menyemburkan api neraka. Pertahanan mutlak untuk markasmu!'
        },
        'titan': {
            id: 4,
            name: '🗿 Colossal Titan',
            price: 15_000_000_000_000n, 
            eliksir: 10000,
            def: 250000,
            desc: 'Raksasa legenda penghancur daratan. Membuat musuh mental sebelum menyerang.'
        }
    };

    let type = (args[0] || '').toLowerCase();
    let currentGuardian = guild.guardian || 'Tidak ada ❌';
    
    // Tampilkan Menu kalau argumen kosong/salah
    if (!guardians[type]) {
        let shopMenu = `🛡️ *GUILD GUARDIAN SHOP* 🛡️\n\n`;
        shopMenu += `🏛️ *Status Markas:*\n`;
        shopMenu += `💰 Kas Harta: Rp ${Number(guild.harta).toLocaleString('id-ID')}\n`;
        shopMenu += `💧 Eliksir: ${Number(guild.eliksir).toLocaleString('id-ID')}\n`;
        shopMenu += `🔰 Guardian Aktif: *${currentGuardian}*\n\n`;
        shopMenu += `🛒 *Daftar Guardian Tersedia:*\n\n`;

        for (let k in guardians) {
            let g = guardians[k];
            shopMenu += `*${g.id}. ${g.name}*\n`;
            shopMenu += `🛡️ Defense: +${g.def.toLocaleString('id-ID')}\n`;
            shopMenu += `💰 Harga: Rp ${g.price.toLocaleString('id-ID')}\n`;
            shopMenu += `💧 Eliksir: ${g.eliksir > 0 ? g.eliksir : 'Gratis'}\n`;
            shopMenu += `📜 _${g.desc}_\n`;
            shopMenu += `=> Ketik: *${usedPrefix + command} ${k}*\n\n`;
        }

        shopMenu += `_⚠️ Catatan: Membeli Guardian baru akan menggantikan Guardian yang lama. Harta dan Eliksir tidak dapat dikembalikan._`;
        return m.reply(shopMenu.trim());
    }

    let g = guardians[type];

    // Validasi jika guardian yang dibeli sama dengan yang sedang dipakai
    if (guild.guardian === g.name) {
        return m.reply(`⚠️ Markasmu saat ini sudah dilindungi oleh *${g.name}*. Pilih guardian lain jika ingin menggantinya.`);
    }

    // Validasi uang & eliksir (Support BigInt)
    if (BigInt(guild.harta) < g.price) {
        return m.reply(`❌ Kas (*Harta*) guild tidak cukup!\nBiaya: *Rp ${g.price.toLocaleString('id-ID')}*\nKas saat ini: *Rp ${Number(guild.harta).toLocaleString('id-ID')}*`);
    }
    if (Number(guild.eliksir) < g.eliksir) {
        return m.reply(`❌ *Eliksir* guild tidak cukup!\nButuh: *${g.eliksir}*\nDimiliki: *${Number(guild.eliksir)}*`);
    }

    // Animasi Loading Pakai Edit Message
    let { key } = await conn.sendMessage(m.chat, { text: `🔮 *Memulai Ritual Pemanggilan ${g.name}...*\n\nMengorbankan Harta dan Eliksir Markas ke dalam pusaran sihir...` }, { quoted: m });

    setTimeout(async () => {
        try {
            // Update data guild di database SQL
            await db.guild.update({
                where: { id: guild.id },
                data: {
                    harta: BigInt(guild.harta) - g.price,
                    eliksir: Number(guild.eliksir) - g.eliksir,
                    guardian: g.name
                }
            });

            let winMsg = `🎉 *RITUAL BERHASIL!* 🎉\n\nMarkas *${guild.name}* kini resmi dilindungi oleh Guardian raksasa:\n\n*${g.name}* 🛡️ (+${g.def.toLocaleString('id-ID')} Defense)\n\nPasukan musuh akan berpikir dua kali sebelum berani menyerang kalian!`;
            
            await conn.sendMessage(m.chat, { text: winMsg, edit: key });
        } catch (err) {
            console.log(err);
            await conn.sendMessage(m.chat, { text: `⚠️ Ritual gagal karena gangguan sistem. Harta dan Eliksir Markas aman.`, edit: key });
        }
    }, 4000); // Jeda 4 detik biar menegangkan
};

handler.help = ['buyguardian <nama>'];
handler.tags = ['rpgG'];
handler.command = /^(buyguardian|beliguardian|guardian)$/i;
module.exports = handler;
