const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (guild.owner !== m.sender) {
        return m.reply('⛔ Hanya *Owner* guild yang bisa mengajukan pergantian nama markas ke pemerintah pusat.');
    }

    let newName = args.join(' ').trim();
    if (!newName) return m.reply(`❓ Masukkan nama baru untuk markasmu!\nContoh: *${usedPrefix + command} Pasukan Berani Mati*`);
    if (newName.length > 20) return m.reply('❌ Nama guild tidak boleh lebih dari 20 karakter.');
    if (newName.toLowerCase() === guild.name.toLowerCase()) return m.reply('⚠️ Nama baru tidak boleh sama dengan nama markas yang sekarang.');

    // Cek ketersediaan nama biar nggak ada guild kembar
    let existingGuild = await db.guild.findFirst({ where: { name: newName } });
    if (existingGuild) return m.reply(`❌ Guild dengan nama *${newName}* sudah digunakan oleh markas lain! Cari nama lain.`);

    let cost = 100_000_000_000n; // Pajak Ganti Nama: 100 Miliar
    if (BigInt(guild.harta) < cost) {
        return m.reply(`🏦 Kas (*Harta*) guild tidak cukup untuk membayar pajak ganti nama!\n\nBiaya Administrasi: *Rp 100.000.000.000*\nKas Guild saat ini: *Rp ${Number(guild.harta).toLocaleString('id-ID')}*`);
    }

    // Eksekusi ganti nama dan potong Harta
    await db.guild.update({
        where: { id: guild.id },
        data: {
            name: newName,
            harta: BigInt(guild.harta) - cost
        }
    });

    m.reply(`🎉 *RE-BRANDING BERHASIL!* 🎉\n\nNama markas telah resmi diubah menjadi *${newName}*.\n_Biaya administrasi sebesar Rp 100 Miliar telah dipotong dari kas Harta markas._`);
};

handler.help = ['grename <nama_baru>'];
handler.tags = ['rpgG'];
handler.command = /^(guildrename|grename|gantinama)$/i;
module.exports = handler;
