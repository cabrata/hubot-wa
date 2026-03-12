const { getUser, updateEconomy, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (!args[0]) return m.reply(`❓ Masukkan jumlah uang yang ingin didonasikan ke kas Guild.\nContoh: *${usedPrefix + command} 10000000* atau *${usedPrefix + command} all*`);

    let userMoney = Number(user.economy?.money || user.money || 0);
    let amount = args[0].toLowerCase() === 'all' ? userMoney : parseInt(args[0]);

    if (isNaN(amount) || amount < 1) return m.reply('❌ Jumlah donasi harus berupa angka yang valid.');
    if (userMoney < amount) return m.reply(`💰 Uang kamu tidak cukup!\nUangmu saat ini: *Rp ${userMoney.toLocaleString('id-ID')}*`);

    // Potong uang player
    await updateEconomy(m.sender, { money: userMoney - amount });

    // Rekap ke Buku Donasi
    let donasiRecord = guild.donasi && typeof guild.donasi === 'object' ? guild.donasi : {};
    let sumbanganSebelumnya = Number(donasiRecord[m.sender] || 0);
    donasiRecord[m.sender] = sumbanganSebelumnya + amount;

    // Update Harta + Buku Donasi di database
    await db.guild.update({
        where: { id: guild.id },
        data: { 
            harta: BigInt(guild.harta) + BigInt(Math.floor(amount)),
            donasi: donasiRecord
        }
    });

    conn.reply(m.chat, `💸 *DONASI BERHASIL* 💸\n\nKamu telah menyumbangkan *Rp ${amount.toLocaleString('id-ID')}* ke Kas Guild.\nTotal kontribusimu sejauh ini: *Rp ${donasiRecord[m.sender].toLocaleString('id-ID')}* 📈`, m);
};

handler.help = ['guilddonasi <jumlah>'];
handler.tags = ['rpgG'];
handler.command = /^(guilddonasi|gdonasi|kasguild)$/i;
module.exports = handler;
