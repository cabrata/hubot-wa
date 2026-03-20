//rpg-daily
const { getUser, updateUser, updateCooldown } = require('../../lib/database')
const prem = 1000; 
const free = 100; 

let handler = async (m, {conn, text, isPrems}) => {
    let user = await getUser(m.sender)
    if (!user) return

    let lastClaimTime = Number(user.lastclaim || 0)
    let currentTime = Date.now();

    if (currentTime - lastClaimTime < 86400000) {
        throw `🎁 *Anda telah mengumpulkan hadiah harian Anda*\n\n🕚 Masuk kembali *${msToTime(86400000 - (currentTime - lastClaimTime))}*`;
    }

    let reward = isPrems ? prem : free;
    
    await updateUser(m.sender, { exp: Number(user.exp || 0) + reward });
    await updateCooldown(m.sender, { lastclaim: currentTime });

    m.reply(`
🎁 *HADIAH XP*
*Spam terus untuk mendapatkan xp*
cek .balance jumlah xp mu!
🆙 *XP* : +${reward}`);
}

handler.help = handler.command = ['daily'];
handler.tags = ['rpg'];
module.exports = handler;

function msToTime(duration) {
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    return hours + " Jam " + minutes + " Menit";
}