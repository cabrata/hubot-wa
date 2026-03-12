const { getUser, db } = require('../../lib/database')

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    if (!guild) return m.reply('⚠️ Data Guild tidak ditemukan.');

    if (guild.owner !== m.sender) {
        return m.reply('⛔ Hanya *Owner* guild yang memiliki akses ke brankas untuk membagikan gaji!');
    }

    if (!args[0]) {
        return m.reply(`❓ Masukkan nominal Harta kas yang ingin dibagikan!\nContoh: *${usedPrefix + command} 1000000000*\n_(Nominal tersebut akan dibagi rata ke seluruh member)_`);
    }

    let amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1) return m.reply('❌ Nominal harus berupa angka yang valid.');

    if (BigInt(guild.harta) < BigInt(amount)) {
        return m.reply(`🏦 Kas Guild (*Harta*) tidak cukup!\n\nKas saat ini: *Rp ${Number(guild.harta).toLocaleString('id-ID')}*\nNominal ditarik: *Rp ${amount.toLocaleString('id-ID')}*`);
    }

    let memList = Array.isArray(guild.members) ? guild.members : [];
    if (memList.length < 2) {
        return m.reply('💤 Kamu adalah satu-satunya anggota di guild ini. Rekrut member lain dulu sebelum bagi-bagi gaji!');
    }

    // Kalkulasi pembagian
    let perMember = Math.floor(amount / memList.length);
    let totalDitarik = BigInt(perMember * memList.length); // Disesuaikan biar nggak ada sisa desimal

    let { key } = await conn.sendMessage(m.chat, { text: `💸 *Membuka Brankas Guild...*\n\nMenghitung jatah untuk ${memList.length} anggota...` }, { quoted: m });

    setTimeout(async () => {
        try {
            // 1. Kurangi Kas Guild
            await db.guild.update({
                where: { id: guild.id },
                data: { harta: BigInt(guild.harta) - totalDitarik }
            });

            // 2. Transfer uang ke masing-masing member
            for (let jid of memList) {
                try {
                    await db.userEconomy.update({
                        where: { jid: jid },
                        data: { money: { increment: perMember } }
                    });
                } catch (e) {
                    // Abaikan kalau ada member yang datanya belum komplit di userEconomy
                }
            }

            let msg = `💰 *GAJIAN GUILD CAIR!* 💰\n\nOwner @${m.sender.split('@')[0]} baru saja membagikan Harta kas guild sebesar *Rp ${Number(totalDitarik).toLocaleString('id-ID')}*!\n\nSetiap anggota (termasuk Owner) mendapatkan:\n💵 *Rp ${perMember.toLocaleString('id-ID')}*\n\n_Uang telah otomatis masuk ke saldo (.dompet / .bal) masing-masing member._`;
            
            await conn.sendMessage(m.chat, { text: msg, edit: key, mentions: [m.sender] });

        } catch (err) {
            console.log(err);
            await conn.sendMessage(m.chat, { text: `⚠️ Terjadi kesalahan saat mentransfer gaji. Harta guild aman.`, edit: key });
        }
    }, 3000);
};

handler.help = ['guildshare <nominal>'];
handler.tags = ['rpgG'];
handler.command = /^(guildshare|gshare|gajiguild)$/i;
module.exports = handler;
