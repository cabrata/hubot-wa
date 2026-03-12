//rpg-koboy
const { getUser } = require('../../lib/database')

const handler = async (m, { conn }) => {
    conn.koboy = conn.koboy || {};
    const user = await getUser(m.sender);
    if (!user) return

    const cooldownPeriod = 5 * 60 * 60 * 1000; // 5 jam dalam milidetik
    const lastPlayed = Number(user.lastkoboy || 0);
    const now = Date.now();

    if (now - lastPlayed < cooldownPeriod) {
        const remainingTime = cooldownPeriod - (now - lastPlayed);
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
        return m.reply(`Anda sudah menangkap penjahat.\nTunggu *${hours} jam ${minutes} menit ${seconds} detik* lagi.`);
    }

    if (conn.koboy[m.chat]) return m.reply('Kamu sedang bermain game Koboy!');

    let playerPosition, criminalPosition;
    do {
        playerPosition = Math.floor(Math.random() * 6);
        criminalPosition = Math.floor(Math.random() * 6);
    } while (playerPosition === criminalPosition);

    let gameState = `🤠 *Koboy Mengejar Penjahat* 🏃‍♂️\n\nWilayah saya:\n${"・".repeat(playerPosition)}🤠${"・".repeat(5 - playerPosition)}\nWilayah penjahat:\n${"・".repeat(criminalPosition)}🏃‍♂️${"・".repeat(5 - criminalPosition)}\n\nKetik *'kanan'* untuk bergerak ke kanan.\nKetik *'kiri'* untuk bergerak ke kiri.`;

    let msg = await conn.sendMessage(m.chat, { text: gameState }, { quoted: m });

    conn.koboy[m.chat] = {
        sender: m.sender,
        playerPosition,
        criminalPosition,
        moveCount: 0,
        key: msg.key
    };
};

handler.help = ['koboy'];
handler.tags = ['rpg'];
handler.command = /^(koboy)$/i;
handler.group = true;

module.exports = handler;