const { createHash } = require('crypto')
const { GoogleGenAI, Type } = require('@google/genai')
const { db, updateUser, updateEconomy, getUser } = require('../../lib/database')

let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i

// ==========================================
// 🗝️ API KEY MANAGER
// ==========================================
const OPENAI_KEY = process.env.OPENAI_API_KEY || 'your-openai-key-here'
const GEMINI_KEY_1 = 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo'
const GEMINI_KEY_2 = 'AIzaSyDYHD-oKoHidUXLG2_eZu2aJKmBNNXZsh0'

// ==========================================
// LAPIS 1: DATABASE LOKAL (SUPER CEPAT)
// ==========================================
const badwordsHardcore = ['kontol', 'kntl', 'titit', 'peler', 'pler', 'memek', 'mmk', 'itil', 'ngentot', 'ngewe', 'bajingan', 'bangsat', 'goblok', 'tolol', 'jancok', 'lonte', 'bokep', 'colmek', 'crot']
const badwordsSoft = ['asu', 'babi', 'anjing', 'anjir', 'sange', 'toket', 'payudara', 'bugil', 'pki', 'hitler', 'fuck', 'shit', 'bitch', 'porn']

function cekLokal(text) {
    let textLower = text.toLowerCase()
    let textBersih = textLower.replace(/[^a-z0-9]/g, '')
    for (let word of badwordsHardcore) {
        if (textBersih.includes(word)) return { safe: false, reason: `Kata kasar berat terdeteksi.` }
    }
    for (let word of badwordsSoft) {
        let regex = new RegExp(`\\b${word}\\b`, 'i')
        if (regex.test(textLower)) return { safe: false, reason: `Kata tidak pantas terdeteksi.` }
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
// LAPIS 3 & 4: GEMINI AI
// ==========================================
async function cekGemini(text, apiKey) {
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey })
        const config = {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: { type: Type.OBJECT, properties: { safe: { type: Type.BOOLEAN }, reason: { type: Type.STRING } } },
            systemInstruction: [{ text: `You are a strict safety guardrail checking usernames for toxicity/profanity in Indonesian and English. Return valid JSON only.` }],
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
// MASTER FILTER: THE 4-LAYER FORTRESS
// ==========================================
async function ultimateSafetyCheck(inputText) {
    console.log(`🔍 [MODERATION START] Mengecek nama: "${inputText}"...`)

    // 🛡️ LAPIS 1: LOKAL
    let local = cekLokal(inputText)
    if (!local.safe) {
        console.log(`❌ Terblokir di Lapis 1 (Lokal)`)
        return local
    }

    // 🛡️ LAPIS 2: OPENAI
    let openai = await cekOpenAI(inputText)
    if (openai && !openai.safe) {
        console.log(`❌ Terblokir di Lapis 2 (OpenAI)`)
        return openai
    }

    // 🛡️ LAPIS 3: GEMINI (MAIN KEY)
    let gemini1 = await cekGemini(inputText, GEMINI_KEY_1)
    if (gemini1 && !gemini1.safe) {
        console.log(`❌ Terblokir di Lapis 3 (Gemini 1)`)
        return gemini1
    }
    if (gemini1 && gemini1.safe) return gemini1

    // 🛡️ LAPIS 4: GEMINI (BACKUP KEY) -> Hanya jalan kalau Key 1 Error/Limit
    console.log(`⚠️ Menggunakan Lapis 4 (Gemini Backup Key)...`)
    let gemini2 = await cekGemini(inputText, GEMINI_KEY_2)
    if (gemini2 && !gemini2.safe) {
        console.log(`❌ Terblokir di Lapis 4 (Gemini 2)`)
        return gemini2
    }
    if (gemini2 && gemini2.safe) return gemini2

    // ✅ JIKA SEMUA API MATI / LIMIT TAPI LOLOS LOKAL
    console.log(`✅ Lolos semua filter.`)
    return { safe: true, reason: 'Aman' }
}

// ==========================================
// HANDLER PENDAFTARAN
// ==========================================
let handler = async function (m, { text, usedPrefix, conn }) {
    let userData = await getUser(m.sender)
    if (userData.registered === true)
        throw `Anda sudah terdaftar\nMau daftar ulang? ${usedPrefix}unreg <SN|SERIAL NUMBER>`

    if (!Reg.test(text)) throw `Format salah\n*${usedPrefix}daftar nama.umur*`

    let [_, name, splitter, age] = text.match(Reg)
    if (!name) throw 'Nama tidak boleh kosong (Alphanumeric)'
    if (!age) throw 'Umur tidak boleh kosong (Angka)'

    // Validasi Dasar Dulu Biar Gak Ngabisin Kuota API
    if (name.length < 3) throw 'Nama terlalu pendek (minimal 3 huruf)'
    if (name.length > 60) throw 'Nama terlalu panjang (maksimal 60 huruf)'
    if (age < 10) throw 'Anak kecil dilarang bermain bot'
    if (age > 50) throw 'Ketuaan'

    // Cek nama duplikat via Prisma
    const existingUser = await db.user.findFirst({
        where: { name: name.trim(), registered: true }
    })
    if (existingUser) throw `Nama "${name}" sudah digunakan. Gunakan nama lain.`

    await m.reply('⏳ Loading...\nNama anda akan kami cek di 3 Database Keamanan Berbeda...')

    // Eksekusi Pengecekan 4 Lapis
    let moderation = await ultimateSafetyCheck(name.trim())
    if (!moderation.safe) {
        throw `❌ Pendaftaran ditolak!\nNama *"${name}"* dinilai tidak pantas oleh sistem keamanan kami.\nAlasan: ${moderation.reason}`
    }

    age = parseInt(age)
    let now = Date.now()

    if (!global.pendingReg) global.pendingReg = {}

    if (age > 17) {
        global.pendingReg[m.sender] = {
            name: name.trim(),
            age,
            sender: m.sender,
            time: now
        }

        await conn.sendMessage(m.sender, { text: `Kamu berumur lebih dari 17 tahun.\n\nSilakan kirim bukti data diri kepada staff kami agar bisa diverifikasi.\nketik #liststaff untuk melihat daftar staff beserta nomornya.\n\nData kamu sudah kami catat, mohon tunggu verifikasi.` })
        await new Promise(resolve => setTimeout(resolve, 1000))
        await conn.sendMessage('120363368633822650@g.us', { text: `🛂 Permintaan Verifikasi Pendaftaran\n\nNama: ${name}\nUmur: ${age}\nNomor: wa.me/${m.sender.split('@')[0]}\n\nKetik:\n.verifikasi ${m.sender.split('@')[0]}\nUntuk menyetujui.` })
        return
    }

    // Jika umur <= 17: langsung daftar
    let sn = createHash('md5').update(m.sender).digest('hex')

    await updateUser(m.sender, {
        name: name.trim(),
        age: BigInt(age),
        regTime: BigInt(now),
        setName: BigInt(now),
        setAge: BigInt(now),
        registered: true,
        sn: sn,
    })

    await m.reply(`✅ Pendaftaran berhasil!\n\n╭─「 Info 」\n│ Nama: ${name}\n│ Umur: ${age} tahun\n╰────\nSerial Number: ${sn}`.trim())

    // Hadiah
    let money = 5000000000
    let exp = 500000
    let limit = 20000
    let saldo = 5000000000

    if (!userData.regSince || Number(userData.regSince) === 0) {
        await updateUser(m.sender, {
            regSince: BigInt(now),
            exp: { increment: BigInt(exp) },
            limit: { increment: BigInt(limit) },
        })
        await updateEconomy(m.sender, {
            money: { increment: money },
            saldo: { increment: saldo },
        })

        await new Promise(resolve => setTimeout(resolve, 500))
        return m.reply(`🎁 Hadiah Registrasi:\n\n- Money: ${money}\n- Exp: ${exp}\n- Limit: ${limit}\n- Saldo: ${saldo}\n\nJangan lupa follow channel dibawah ini ya untuk mendapatkan hadiah lainnya\nhttps://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m`)
    }
}

handler.help = ['daftar', 'reg', 'register'].map(v => v + ' <nama>.<umur>')
handler.tags = ['main']
handler.command = /^(daftar|reg(ister)?)$/i

module.exports = handler
