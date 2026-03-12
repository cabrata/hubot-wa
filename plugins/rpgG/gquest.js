const { getUser, updateCooldown, db } = require('../../lib/database')

let handler = async (m, { conn }) => {
    let user = await getUser(m.sender);
    let userGuildId = user?.guildId || user?.guild;
    if (!userGuildId) return m.reply('❌ Kamu belum tergabung dalam guild.');

    // Pakai cooldown lastkerja atau bikin custom, di sini kita pakai lastberkebon yg jarang dipakai
    let cdTime = 43200000; // 12 Jam
    let lastQuest = Number(user.cooldown?.lastberkebon || 0);

    if (Date.now() - lastQuest < cdTime) {
        let ms = cdTime - (Date.now() - lastQuest);
        let h_time = Math.floor(ms / 3600000);
        let m_time = Math.floor((ms / 60000) % 60);
        return m.reply(`⏳ Kamu sudah menyelesaikan misi markas hari ini.\nKembali lagi dalam *${h_time} Jam ${m_time} Menit*.`);
    }

    let guild = await db.guild.findUnique({ where: { id: userGuildId } });
    
    // Hadiah Quest (Random)
    let dptExp = Math.floor(Math.random() * 50) + 20; // 20 - 70 EXP
    let dptEliksir = Math.floor(Math.random() * 10) + 5; // 5 - 15 Eliksir

    let misiText = [
        "Membantu memperbaiki tembok markas yang rusak",
        "Berpatroli mengelilingi perbatasan wilayah markas",
        "Menemukan mata air ajaib di hutan dan membawa pulang Eliksir",
        "Melatih pasukan prajurit baru di tempat latihan",
        "Membersihkan sisa-sisa pertempuran di aula utama"
    ];
    let misiSelesai = misiText[Math.floor(Math.random() * misiText.length)];

    let { key } = await conn.sendMessage(m.chat, { text: `🚶‍♂️ *Menjalankan Misi Markas...*\n\n_${misiSelesai}..._` }, { quoted: m });

    setTimeout(async () => {
        await db.guild.update({
            where: { id: guild.id },
            data: {
                exp: Number(guild.exp) + dptExp,
                eliksir: Number(guild.eliksir) + dptEliksir
            }
        });

        await updateCooldown(m.sender, { lastberkebon: Date.now() });

        let msg = `📜 *MISI SELESAI!* 📜\n\nKerja kerasmu membuahkan hasil untuk markas *${guild.name}*!\n\n🎁 *Kontribusi:*\n✨ +${dptExp} EXP Guild\n💧 +${dptEliksir} Eliksir\n\n_Markas perlahan menjadi lebih kuat berkat bantuanmu!_`;
        
        await conn.sendMessage(m.chat, { text: msg, edit: key });
    }, 3000);
};

handler.help = ['guildquest'];
handler.tags = ['rpgG'];
handler.command = /^(guildquest|gquest|misiguild)$/i;
module.exports = handler;
