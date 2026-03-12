const { GoogleGenAI, Type } = require('@google/genai')
const { getUser, updateEconomy, db } = require('../../lib/database')

// ==========================================
// 🗝️ API KEY MANAGER (Hati-hati ya keys-nya terekspos!)
// ==========================================
const OPENAI_KEY = process.env.OPENAI_API_KEY || 'your-openai-key-here'
const GEMINI_KEY_1 = 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo'
const GEMINI_KEY_2 = 'AIzaSyDYHD-oKoHidUXLG2_eZu2aJKmBNNXZsh0'

// ==========================================
// LAPIS 1: DATABASE LOKAL (SUPER CEPAT)
// ==========================================
const badwordsHardcore = ['kontol', 'kntl', 'titit', 'peler', 'pler', 'memek', 'mmk', 'itil', 'ngentot', 'ngewe', 'bajingan', 'bangsat', 'goblok', 'tolol', 'jancok', 'lonte', 'bokep', 'colmek', 'crot', 'lgbt', 'gay', 'lesbi', 'bencong']
const badwordsSoft = ['asu', 'babi', 'anjing', 'anjir', 'sange', 'toket', 'payudara', 'bugil', 'pki', 'hitler', 'fuck', 'shit', 'bitch', 'porn']

function cekLokal(text) {
    let textLower = text.toLowerCase()
    let textBersih = textLower.replace(/[^a-z0-9]/g, '')
    for (let word of badwordsHardcore) {
        if (textBersih.includes(word)) return { safe: false, reason: `Kata kasar/terlarang terdeteksi secara lokal.` }
    }
    for (let word of badwordsSoft) {
        let regex = new RegExp(`\\b${word}\\b`, 'i')
        if (regex.test(textLower)) return { safe: false, reason: `Kata tidak pantas terdeteksi secara lokal.` }
    }
    return { safe: true }
}

// ==========================================
// LAPIS 2: OPENAI MODERATION
// ==========================================
async function cekOpenAI(text) {
    try {
        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
            body: JSON.stringify({ model: "omni-moderation-latest", input: text })
        })
        const data = await response.json()

        if (data.error) throw new Error(data.error.message)

        if (data.results && data.results[0].flagged) {
            let cat = data.results[0].categories
            let alasan = "Melanggar standar komunitas"
            if (cat['sexual']) alasan = "Seksual/Pornografi"
            if (cat['hate']) alasan = "Ujaran kebencian/SARA"
            return { safe: false, reason: alasan }
        }
        return { safe: true }
    } catch (e) {
        console.error('🚨 [OPENAI ERROR]: Bypass ke lapis berikutnya.', e.message)
        return null
    }
}

// ==========================================
// LAPIS 3 & 4: GEMINI AI (Khusus Filter Nama Guild)
// ==========================================
async function cekGemini(text, apiKey) {
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey })
        const config = {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: { type: Type.OBJECT, properties: { safe: { type: Type.BOOLEAN }, reason: { type: Type.STRING } } },
            systemInstruction: [{ 
                text: `Kamu adalah penjaga keamanan ketat (Guardrail) yang bertugas mengecek kelayakan nama markas/guild RPG dalam bahasa Indonesia dan Inggris. 
Kamu HARUS MENOLAK (safe: false) jika nama mengandung:
1. Kata kasar, toksik, atau jorok.
2. SARA (Rasisme, hinaan agama, unsur politik ekstrem).
3. Unsur LGBT atau penyimpangan.
4. Menyindir, mengejek, atau menyerang nama orang spesifik (misal: "BudiJelek", "AntiAhmad").
5. Makna yang murni negatif atau meresahkan.

Nama yang diizinkan (safe: true) HANYA nama yang murni terdengar seperti faksi/klan/guild/pasukan yang keren, fantasi, atau normal.
Return valid JSON only.` 
            }],
        }
        const response = await ai.models.generateContentStream({ model: 'gemini-2.5-flash', config, contents: [{ role: 'user', parts: [{ text: text }] }] })

        let result = ''
        for await (const chunk of response) { result += chunk.text }

        return JSON.parse(result.replace(/```json/gi, '').replace(/```/g, '').trim())
    } catch (e) {
        console.error(`🚨 [GEMINI ERROR]: Bypass ke lapis berikutnya.`, e.message)
        return null
    }
}

// ==========================================
// MASTER FILTER
// ==========================================
async function ultimateSafetyCheck(inputText) {
    console.log(`🔍 [MODERATION START] Mengecek nama guild: "${inputText}"...`)

    let local = cekLokal(inputText)
    if (!local.safe) return local

    let openai = await cekOpenAI(inputText)
    if (openai && !openai.safe) return openai

    let gemini1 = await cekGemini(inputText, GEMINI_KEY_1)
    if (gemini1 && !gemini1.safe) return gemini1
    if (gemini1 && gemini1.safe) return gemini1

    console.log(`⚠️ Menggunakan Lapis 4 (Gemini Backup Key)...`)
    let gemini2 = await cekGemini(inputText, GEMINI_KEY_2)
    if (gemini2 && !gemini2.safe) return gemini2
    if (gemini2 && gemini2.safe) return gemini2

    return { safe: true, reason: 'Aman' }
}

// ==========================================
// HANDLER BUAT GUILD
// ==========================================
let handler = async (m, { conn, args, usedPrefix }) => {
    if (!args[0]) return m.reply(`❓ Contoh penggunaan: *${usedPrefix}createguild <nama_guild>*`);
    
    let guildName = args.join(' ').trim();
    if (guildName.length > 20) return m.reply('❌ Nama guild maksimal 20 karakter.');
    if (guildName.length < 3) return m.reply('❌ Nama guild minimal 3 karakter.');

    let user = await getUser(m.sender);
    if (!user) return m.reply('Kamu belum terdaftar di dalam database.');

    if (user?.guildId || user?.guild) return m.reply('❌ Kamu sudah tergabung dalam guild. Keluar dulu jika ingin membuat yang baru.');

    const cost = 20_000_000_000;
    let userMoney = Number(user.economy?.money || user.money || 0);
    if (userMoney < cost) {
        return m.reply(`💰 Uang kamu tidak cukup.\nMembutuhkan *Rp ${cost.toLocaleString('id-ID')}* money untuk mendirikan markas.`);
    }

    // 🛡️ PENGECEKAN NAMA GUILD VIA AI (4 LAPIS)
    await conn.sendMessage(m.chat, { text: `🛡️ *System Scanning...*\nMengecek kelayakan nama markas *"${guildName}"* menggunakan AI Security...` }, { quoted: m });
    
    let moderation = await ultimateSafetyCheck(guildName);
    if (!moderation.safe) {
        return m.reply(`🛑 *PEMBUATAN GUILD DITOLAK!*\n\nNama markas dinilai melanggar aturan sistem kami.\n📝 *Alasan AI:* ${moderation.reason}\n\n_Silakan gunakan nama markas yang pantas, tidak berbau SARA, tidak menyindir, dan murni nama klan/guild._`);
    }

    try {
        let existingGuild = await db.guild.findFirst({ where: { name: guildName } });
        if (existingGuild) return m.reply(`❌ Guild dengan nama *${guildName}* sudah ada! Cari nama lain.`);

        let guildId = 'G-' + Date.now();

        // Potong Uang dan Update User
        await updateEconomy(m.sender, { money: userMoney - cost });
        await db.user.update({
            where: { jid: m.sender },
            data: { guildId: guildId }
        });

        // Buat Data Guild
        await db.guild.create({
            data: {
                id: guildId,
                name: guildName,
                owner: m.sender,
                level: 1,
                exp: 0,
                eliksir: 0,
                harta: 0,
                members: [m.sender], 
                staff: [],
                waitingRoom: []
            }
        });

        m.reply(`🎉 Selamat! Markas *${guildName}* berhasil didirikan.\nUang kamu terpotong Rp ${cost.toLocaleString('id-ID')}.\nKamu otomatis menjadi Owner markas.`);
    } catch (e) {
        console.error(e);
        m.reply('⚠️ Terjadi kesalahan sistem saat membuat guild.');
    }
};

handler.help = ['createguild <nama>'];
handler.tags = ['rpgG'];
handler.command = /^(createguild|buatguild)$/i;
handler.register = true;
module.exports = handler;
