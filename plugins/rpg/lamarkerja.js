//rpg-lamarkerja
const { getUser, updateJob } = require('../../lib/database')

let handler = async (m, { isPrems, args, conn, text, command, usedPrefix }) => {
    let user = await getUser(m.sender);
    if (!user) return

    const jobRequirements = {
        'gojek': { min: 10, max: 100000 },
        'kurir': { min: 10, max: 200000 },
        'sopir': { min: 10, max: 200000 },
        'karyawan indomaret': { min: 20, max: 300000 },
        'kantoran': { min: 30, max: 400000 },
        'dokter': { min: 50, max: 100000 },
        'frontend developer': { min: 40, max: 600000 },
        'web developer': { min: 40, max: 600000 },
        'backend developer': { min: 40, max: 600000 },
        'fullstack developer': { min: 50, max: 700000 },
        'game developer': { min: 40, max: 600000 },
        'pemain sepak bola': { min: 30, max: 500000 },
        'trader': { min: 40, max: 60000 },
        'hunter': { min: 20, max: 300000 },
        'polisi': { min: 30, max: 300000 }
    };

    if (!text) {
        let list = Object.keys(jobRequirements).map(j => `• ${capitalizeFirstLetter(j)} (Lv. ${jobRequirements[j].min})`).join('\n');
        return m.reply(`Silahkan pilih pekerjaan yang tersedia:\n\n${list}\n\nKetik *${usedPrefix + command} <nama pekerjaan>*`);
    }

    let job = text.toLowerCase();
    let kapital = capitalizeFirstLetter(job);

    if (!jobRequirements[job]) {
        return m.reply(`Pekerjaan *${kapital}* tidak tersedia di kota ini.\nSilakan cek list pekerjaan dengan mengetik *${usedPrefix + command}* tanpa nama pekerjaan.`);
    }

    let jobLevelRange = jobRequirements[job];
    let userLevel = user.level || 0;

    if (userLevel < jobLevelRange.min || userLevel > jobLevelRange.max) {
        throw `Maaf, level Anda tidak mencukupi untuk menjadi ${kapital}. Level yang dibutuhkan adalah antara ${jobLevelRange.min} dan ${jobLevelRange.max}. Level Anda saat ini adalah ${userLevel}.`;
    }

    if (user.job && user.job.toLowerCase() === job) {
        return m.reply(`Kamu saat ini sudah bekerja sebagai ${kapital}.`);
    }

    m.reply(`Kamu telah melamar *${kapital}* sebagai pekerjaanmu\n\n⤷ Tunggulah persetujuan dari pihak perusahaan dalam 30 detik agar diterima untuk bekerja.`);

    setTimeout(async () => {
        let successMsg = `🎉 Selamat, lamaran kerja kamu telah diterima oleh pihak perusahaan dan sekarang kamu dapat memulai untuk bekerja hari ini.\n\n⤷ Ketik *.job* untuk melihat detail pekerjaan.`.trim();
        
        await updateJob(m.sender, { job: job }); // Menyimpan status job di database
        conn.reply(m.chat, successMsg, m);
    }, 30000);
};

handler.help = ['lamarkerja'];
handler.tags = ['rpg'];
handler.command = /^lamarkerja$/i;

module.exports = handler;

function capitalizeFirstLetter(str) {
    let words = str.split(" ");
    for (let i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
    }
    return words.join(" ");
}