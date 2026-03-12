//rpg-jobkerja
const { getUser, updateEconomy, updateUser, updateJob } = require('../../lib/database')
const cooldown = 300000; // 5 menit dalam milidetik

let handler = async (m, { isPrems, conn, text, usedPrefix, command }) => {
    const user = await getUser(m.sender);
    if (!user) return;

    if (user.job === 'Pengangguran' || user.job === '-' || !user.job) {
        throw `Kamu belum mempunyai pekerjaan. Ketik *${usedPrefix}lamarkerja* untuk melamar pekerjaan`;
    }

    if (user.jail === true) {
        throw '*Kamu tidak bisa melakukan aktivitas karena masih dalam penjara!*';
    }
    if (user.culik === true) {
        throw '*Kamu tidak bisa melakukan aktivitas karena masih dalam sel penculik!*';
    }

    // Cek cooldown
    let pekerjaan1 = Number(user.pekerjaan1 || 0);
    if (Date.now() - pekerjaan1 < cooldown) {
        let remainingTime = pekerjaan1 + cooldown - Date.now();
        let formattedTime = new Date(remainingTime).toISOString().substr(14, 5); // Tampilkan MM:SS aja biar ringkas
        throw `Kamu sudah pergi bekerja sebelumnya. Tunggu selama *${formattedTime}* menit untuk bekerja lagi`;
    }
  
    const jobList = {
        'gojek': [11000, 10000, 10000],
        'kantoran': [32000, 32000, 40000],
        'game developer': [420000, 410000, 400000],
        'backend developer': [130000, 130000, 140000],
        'web developer': [72000, 72000, 80000],
        'sopir': [26000, 25000, 25000],
        'kurir': [15000, 14000, 14000],
        'frontend developer': [52000, 52000, 60000],
        'fullstack developer': [210000, 210000, 200000],
        'pemain sepak bola': [900000, 900000, 1000000],
        'karyawan indomaret': [27000, 27000, 30000],
        'pembunuh bayaran': [31000, 31000, 40000],    
        'pemburu manusia': [31000, 31000, 40000],        
        'polisi': [31000, 31000, 40000],
        'trader': [1700000, 1700000, 2000000],
        'dokter': [1700000, 1700000, 2000000],
        'hunter': [1700000, 1700000, 2000000]
    };

    let userJobKey = user.job.toLowerCase();
    
    if (jobList[userJobKey]) {
        let [moneyMax, expMax, bankMax] = jobList[userJobKey];
        let money = Math.floor(Math.random() * moneyMax);
        let exp = Math.floor(Math.random() * expMax);
        let bank = Math.floor(Math.random() * bankMax); // Di kode lama variabel bank diabaikan, sekarang aku tambahin ke rekening biar berguna

        // Save ke Database via function helpers
        await updateEconomy(m.sender, { 
            money: (user.money || 0) + money,
            bank: (user.bank || 0) + bank 
        });
        
        await updateUser(m.sender, { exp: (user.exp || 0) + exp });
        await updateJob(m.sender, { 
            jobexp: (user.jobexp || 0) + 1,
            pekerjaan1: Date.now() 
        });

        let message = `*Berikut pendapatan dari pekerjaan ${capitalizeFirstLetter(user.job)}* \n• Money : Rp. ${money.toLocaleString()}
        \n• Bank  : Rp. ${bank.toLocaleString()}
        \n• Exp : ${exp.toLocaleString()}
        \n• Tingkat Kerja Keras : +1 🧟‍♂️`;

        conn.reply(m.chat, message, m);
    } else {
        throw `Pekerjaan *${user.job}* tidak terdaftar di sistem penggajian.`;
    }
};

handler.help = ['jobkerja'];
handler.tags = ['rpg'];
handler.command = /^(jobkerja)$/i;
handler.registered = true;

module.exports = handler;

function capitalizeFirstLetter(str) {
  let words = str.split(" ");
  for (let i = 0; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
  }
  return words.join(" ");
}