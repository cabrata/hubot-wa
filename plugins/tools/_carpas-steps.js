// File: _carpas-steps.js
const fs = require('fs').promises; 
const path = require('path');
const { db } = require('../../lib/database.js'); // Import Prisma

// API Request manual, no require axios di luar biar ga crash
async function cariKotaDariKoordinat(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  try {
    let data;
    try {
        // Coba pakai axios kalau ada
        const axios = require('axios');
        const res = await axios.get(url, { headers: { 'User-Agent': 'HuTaoBot/1.0' } });
        data = res.data;
    } catch (e) {
        // Fallback pakai fetch bawaan Node.js
        const res = await fetch(url, { headers: { 'User-Agent': 'HuTaoBot/1.0' } });
        data = await res.json();
    }

    if (data && data.address) {
      const address = data.address;
      const kota = address.city || address.town || address.village || address.municipality || 'Tidak diketahui';
      return { kota, negara: address.country, kodeNegara: address.country_code };
    }
    return null;
  } catch (error) {
    return null;
  }
}

const processedIds = new Set();
const dedup = (id) => {
  if (!id) return false;
  if (processedIds.has(id)) return false;
  processedIds.add(id);
  setTimeout(() => processedIds.delete(id), 60000);
  return true;
};

// Fungsi AI Optional: Akan langsung dilewati (aman) kalau module ga ke-install
async function checkSafety(inputText) {
  try {
    const { GoogleGenerativeAI, Type } = require('@google/generative-ai'); 
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) return { safe: true, reason: "API Key tidak ada" }; 
    
    const ai = new GoogleGenerativeAI({ apiKey });
    const config = { 
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseSchema: { type: Type.OBJECT, properties: { safe: { type: Type.BOOLEAN }, reason: { type: Type.STRING }, }, },
      systemInstruction: [ { text: `You are a safety guardrail... Only respond in JSON format... If unsure, return safe.`, }, ],
    }
    const model = 'gemini-1.5-flash-latest'; 
    const contents = [{ role: 'user', parts: [{ text: inputText }] }];
    const response = await ai.models.generateContentStream({ model, config, contents });
    let result = ''; for await (const chunk of response) { result += chunk.text }
    return JSON.parse(result);
  } catch (error) {
    return { safe: true, reason: 'Pengecekan AI dilewati karena module absen.' }; 
  }
}

const before = async (m, { conn, text, usedPrefix }) => {
  try {
    if (!m || m.isGroup) return;
    if (m.message?.protocolMessage || m.message?.senderKeyDistributionMessage || m.message?.reactionMessage || m.messageStubType || m.broadcast) return;
    if (m.key?.fromMe || m.fromMe || m.isBaileys) return;
    
    const mid = m.key?.id || m.id;
    if (!dedup(mid)) return;
    
    // Fix m.text saat user nge-reply pesan bot
    let msgText = m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    msgText = msgText.trim();

    // Pastikan bot utama yang merespon (Mencegah bot kloningan ikut nimbrung)
    let jid1 = conn.user?.jid?.replace(/:.*@/, '@');
    let jid2 = global.conn?.user?.jid?.replace(/:.*@/, '@');
    if (jid1 && jid2 && jid1 !== jid2) return;

    global.carpasProfileState = global.carpasProfileState || {};
    const sender = m.sender;
    const state = global.carpasProfileState[sender];
    
    if (!state) return;

    state.profile = state.profile || {};
    state.updatedAt = Date.now();

    switch (state.step) {
      case 'awaiting_gender': {
        return; 
      }

      case 'catatan': {
        // Jangan baca kalau itu command murni (kayak .menu)
        if (msgText.startsWith(usedPrefix || '.')) return;

        if (!msgText) return m.reply('⚠️ Kirim catatan teks (5–150 karakter).');
        if (msgText.length > 150) return m.reply('⚠️ Maksimal 150 karakter.');
        if (msgText.length < 5) return m.reply('⚠️ Minimal 5 karakter.');
        
        await m.reply('🔎 Memeriksa catatanmu...');
        
        const safetyResult = await checkSafety(msgText);
        if (!safetyResult.safe) { return m.reply(`⚠️ Catatan ditolak: ${safetyResult.reason}.\n\nHarap sopan & tidak mengandung SARA/kontak pribadi. Kirim ulang.`); }
        
        state.profile.catatan = msgText;
        state.step = 'lokasi';
        global.carpasProfileState[sender] = state; 

        await new Promise(resolve => setTimeout(resolve, 1500)); // Pengganti conn.delay bawaan
        return m.reply('📍 Sip! Catatanmu aman. Kirim Live Location (Lokasi Terkini).\n\nNote: Gunakan live location 15 menit agar lokasi anda tetap aman!');
      }

      case 'lokasi': {
        const live = m.message?.liveLocationMessage;
        const loc = m.message?.locationMessage;
        let lat, lon;
        
        if (live && live.degreesLatitude && live.degreesLongitude) { 
            lat = live.degreesLatitude; lon = live.degreesLongitude;
        } else if (loc && loc.degreesLatitude && loc.degreesLongitude) { 
            lat = loc.degreesLatitude; lon = loc.degreesLongitude;
        }
        
        if (!lat || !lon) { 
            return m.reply('⚠️ Itu bukan Live Location. Pastikan Anda mengirim "Lokasi Terkini".');
        }

        await m.reply('🕵️‍♀️ Memverifikasi lokasimu...');
        
        // Deteksi negara otomatis dari nomor pengirim (Tanpa butuh module tambahan!)
        const senderNumber = m.sender.replace(/@.+/, '');
        let userRegionCode = 'unknown';
        if (senderNumber.startsWith('62')) userRegionCode = 'id';
        else if (senderNumber.startsWith('60')) userRegionCode = 'my';
        else if (senderNumber.startsWith('65')) userRegionCode = 'sg';
        else if (senderNumber.startsWith('673')) userRegionCode = 'bn';

        const infoLokasi = await cariKotaDariKoordinat(lat, lon);
        const locationCountryCode = infoLokasi ? infoLokasi.kodeNegara : null; 

        if (!infoLokasi || !locationCountryCode) {
          return m.reply('⚠️ Gagal memverifikasi koordinat lokasi Anda. Coba kirim ulang lokasi.');
        }

        if (userRegionCode !== 'unknown' && locationCountryCode && userRegionCode.toLowerCase() !== locationCountryCode.toLowerCase()) {
          return m.reply(`⚠️ Lokasi Ditolak.\nLokasi yang Anda kirim (${locationCountryCode.toUpperCase()}) tidak sesuai dengan kode negara nomor HP Anda (${userRegionCode.toUpperCase()}).\n\nHarap gunakan lokasi di negara yang sama dengan nomor Anda!.`);
        }
        
        state.profile.lat = lat;
        state.profile.lon = lon;
        state.profile.kota = infoLokasi.kota || 'Tidak diketahui';
        state.profile.negara = infoLokasi.negara || 'Tidak diketahui';
        
        state.step = 'media';
        global.carpasProfileState[sender] = state; 
        
        await m.reply(`✅ Lokasi terverifikasi di ${infoLokasi.kota}, ${infoLokasi.negara}.\n\n📸 Mantap! Terakhir, kirim foto atau video pendek (maks 5 detik & 1MB).`);
        return;
      }

      case 'media': {
        const video = m.message?.videoMessage;
        const image = m.message?.imageMessage;
        
        if (!video && !image) return m.reply('⚠️ Kirim foto atau video (maks 5 detik & 1MB) ya.');
        if (video && Number(video.seconds || 0) > 5) return m.reply('⚠️ Durasi video maksimal 5 detik.');
        
        const q = m;
        const mimetype = image?.mimetype || video?.mimetype || q?.mimetype;
        if (!mimetype) return m.reply('⚠️ Tipe media ga kebaca, coba kirim ulang.');

        await m.reply('⏳ Memproses media profil...');

        try {
          const buffer = await q.download();
          if (!buffer?.length) throw new Error('Unduh media gagal');

          const maxSize = 1 * 1000 * 1000; 
          if (buffer.length > maxSize) {
            return m.reply(`⚠️ Ukuran file terlalu besar (${(buffer.length / 1000000).toFixed(2)} MB). Maksimal 1 MB.`);
          }

          let ext = 'bin';
          const mt = (mimetype || '').toLowerCase();
          if (mt.includes('/')) ext = mt.split('/')[1] || 'bin';
          if (ext.includes('jpeg')) ext = 'jpg';
          if (ext.includes('webp')) ext = 'webp';
          if (mt.includes('mp4')) ext = 'mp4';
          if (mt.includes('gif')) ext = 'gif'; 

          const storageDir = path.join(process.cwd(), 'profile'); 

          await fs.mkdir(storageDir, { recursive: true }); 
          
          const filename = `${sender.split('@')[0]}.${ext}`; 
          const filePath = path.join(storageDir, filename);

          await fs.writeFile(filePath, buffer);
          state.profile.media = filename; 

                   // Cek apakah dia udah punya profil atau belum (buat nentuin dapat hadiah atau nggak)
          let existingProfile = await db.carpas.findUnique({ where: { jid: sender } });

          // === SIMPAN KE PRISMA SQL ===
          await db.carpas.upsert({
            where: { jid: sender },
            update: {
                nama: state.profile.nama,
                umur: state.profile.umur,
                gender: state.profile.gender,
                lat: state.profile.lat,
                lon: state.profile.lon,
                media: state.profile.media,
                catatan: state.profile.catatan
            },
            create: {
                jid: sender,
                nama: state.profile.nama,
                umur: state.profile.umur,
                gender: state.profile.gender,
                lat: state.profile.lat,
                lon: state.profile.lon,
                media: state.profile.media,
                catatan: state.profile.catatan
            }
          });

          // Hapus state registrasi sementara dari RAM
          delete global.carpasProfileState[sender];

          // Berikan hadiah HANYA JIKA ini profil baru
          if (!existingProfile) {
              await db.userEconomy.update({
                 where: { jid: sender },
                 data: { money: { increment: 10000000000000 } }
              });
              await db.user.update({
                 where: { jid: sender },
                 data: { exp: { increment: 250000 }, limit: { increment: 20000 } }
              });
              
              await m.reply(`✅ Berhasil! Profil barumu tersimpan.\nKetik *${usedPrefix || '.'}lihatprofile* untuk cek profilmu.\nAnda dapat langsung menggunakan fitur *${usedPrefix || '.'}caripasangan* (maintenance)`);
              await new Promise(resolve => setTimeout(resolve, 1500));
              return m.reply(`🎁 Anda mendapatkan hadiah pendaftaran profil:\n- Money: 10T\n- Exp: 250k\n- Limit: 20k`);
          } else {
              // Kalau cuma update profil, ga dapet hadiah lagi
              return m.reply(`✅ Berhasil! Profilmu berhasil di-update.\nKetik *${usedPrefix || '.'}lihatprofile* untuk melihat perubahannya.`);
          }


        } catch (e) {
          console.error('media processing error:', e);
          return m.reply(`⚠️ Gagal memproses media: ${e.message}. Coba kirim ulang media.`);
        }
      }
      default: {
        delete global.carpasProfileState[sender];
        return;
      }
    }
  } catch (e) {
    console.error('Error _carpas-steps:', e);
    if (m?.sender) delete global.carpasProfileState[m.sender];
    return m.reply('⚠️ Terjadi error saat proses profil. Sesi dibatalkan, coba lagi ya.');
  }
}

const handler = () => {};
handler.before = before;
module.exports = handler;
exports.before = before;
