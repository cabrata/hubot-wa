const request = require('node-fetch');
const { generateCuacaCard } = require('../../lib/cuacaCanvas');

const APIKey = "18d044eb8e1c06eaf7c5a27bb138694c";
const units = "metric";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Silakan masukkan nama kota!\n\nContoh: *${usedPrefix + command} Jakarta*`;

    try {
        await m.reply('⏳ Sedang mengecek cuaca...');

        const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(text)}&units=${units}&appid=${APIKey}`;
        const response = await request(url);
        const data = await response.json();

        if (data.cod === "404") {
            return m.reply(`❌ Kota "${text}" tidak ditemukan.`);
        } else if (data.cod !== 200) {
            return m.reply(`❌ Terjadi kesalahan: ${data.message || 'Unknown Error'}`);
        }

        const buffer = await generateCuacaCard(data);

        const caption = `*🌤️ INFO CUACA: ${data.name}*\n\n` +
            `🌡️ Suhu: ${Math.round(data.main.temp)}°C\n` +
            `🌥️ Kondisi: ${data.weather[0].description}\n` +
            `💨 Angin: ${data.wind.speed} m/s\n` +
            `💧 Kelembaban: ${data.main.humidity}%\n\n` +
            `_Hubot-wa Weather Service_`;

        await conn.sendMessage(m.chat, {
            image: buffer,
            caption: caption
        }, { quoted: m });

    } catch (e) {
        console.error(e);
        m.reply('❌ Terjadi kesalahan saat memproses data cuaca.');
    }
}

handler.help = ['cuaca <kota>'];
handler.tags = ['tools'];
handler.command = /^(cuaca)$/i;
// handler.limit = true; // Optional

module.exports = handler;
