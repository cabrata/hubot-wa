let handler = async (m, { conn, command, args, usedPrefix }) => {
    let user = m.user; // Ambil memori user saat ini
    if (!user) return;

    const tag = `@${m.sender.replace(/@.+/, '')}`;

    try {
        if (command === 'ytlive') {
            // Cek langsung dari object m.user
            if (!user.youtube_account || user.youtube_account === '') {
                return conn.reply(m.chat, `Hey Kamu Iya Kamu ${tag}\nBuat akun terlebih dahulu\nKetik: ${usedPrefix}createakunyt`, m, { mentions: [m.sender] });
            }

            let title = args.join(' ');
            if (!title || title.length > 50) {
                return conn.reply(m.chat, `${tag} Silakan berikan judul untuk live Anda (maksimal 50 karakter).`, m, { mentions: [m.sender] });
            }

            const cooldownTime = 600000; // 10 menit
            const lastLiveTime = Number(user.lastyoutuber || 0);

            if (Date.now() - lastLiveTime < cooldownTime) {
                const remainingCooldown = cooldownTime - (Date.now() - lastLiveTime);
                return m.reply(`Kamu sudah lelah sehabis stream. Tunggu selama:\n*${msToTime(remainingCooldown)}*`);
            }

            m.reply(`Menyiapkan perlengkapan live streaming...`);

            // Kalkulasi Hasil
            const randomSubscribers = Math.floor(Math.random() * (3000 - 10 + 1)) + 10;
            const randomViewers = Math.floor(Math.random() * (7000 - 10 + 1)) + 10;
            const randomLikes = Math.floor(Math.random() * (500 - 1 + 1)) + 1;
            const randomMoney = Math.floor(Math.random() * (5000000 - 1000 + 1)) + 1000;

            user.subscribers = (user.subscribers || 0) + randomSubscribers;
            user.viewers = (user.viewers || 0) + randomViewers;
            user.like = (user.like || 0) + randomLikes;
            user.money = (user.money || 0) + randomMoney;
            user.lastyoutuber = Date.now();

            let currentPlayButton = user.playButton || 0;
            let rewardMessage = "";

            // Check Milestone Play Button
            if (user.subscribers >= 100000 && currentPlayButton === 0) {
                user.playButton = 1;
                rewardMessage = "\n🎉 *SELAMAT!* Anda mendapatkan *⬜ Silver Play Button* karena telah mencapai 100K Subscribers!";
            } else if (user.subscribers >= 1000000 && currentPlayButton === 1) {
                user.playButton = 2;
                rewardMessage = "\n🎉 *LUAR BIASA!* Anda mendapatkan *🟧 Gold Play Button* karena telah mencapai 1M Subscribers!";
            } else if (user.subscribers >= 10000000 && currentPlayButton === 2) {
                user.playButton = 3;
                rewardMessage = "\n🎉 *LEGENDARIS!* Anda mendapatkan *💎 Diamond Play Button* karena telah mencapai 10M Subscribers!";
            }

            // Kirim Animasi dan Hasil
            setTimeout(() => {
                conn.reply(m.chat, `👋 Hai Kak ${tag}, Subscribermu sudah menunggu,\nwaktunya untuk live streaming kembali!`, m, { mentions: [m.sender] });
            }, 3000);

            setTimeout(() => {
                let resultMessage = `*🔴 LIVE STREAMING SELESAI*\n\n` +
                    `Judul: *${title}*\n` +
                    `🎥 Viewers: +${formatNumber(randomViewers)}\n` +
                    `👍 Likes: +${formatNumber(randomLikes)}\n` +
                    `🔔 Subscribers: +${formatNumber(randomSubscribers)}\n` +
                    `💰 Pendapatan Adsense: ${formatCurrency(randomMoney)}\n` +
                    `${rewardMessage}`;
                
                conn.reply(m.chat, resultMessage, m);
            }, 10000); 

        }
    } catch (err) {
        m.reply("📢 Error: " + err.message);
    }
};

function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'M';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'Jt';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function formatCurrency(num) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    const formattedTime = [];
    if (hours > 0) formattedTime.push(`${hours} jam`);
    if (minutes > 0) formattedTime.push(`${minutes} menit`);
    if (seconds > 0 && hours === 0) formattedTime.push(`${seconds} detik`);

    return formattedTime.join(' ');
}

handler.help = ['ytlive <judul>'];
handler.tags = ['rpg'];
handler.command = /^(ytlive)$/i;
handler.group = true;

module.exports = handler;
