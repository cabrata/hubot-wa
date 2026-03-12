const malScraper = require('mal-scraper');
const { Marika, Characters } = require('@shineiichijo/marika');
const { anime } = new Marika();
const { db, getUser, updateUser } = require('../../lib/database');
const fs = require('fs');
const path = require('path');

// OBENG SAKTI: Fungsi buat ngubah String JSON dari Database SQL jadi Objek beneran
function parseJSON(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    global.setPasRequest = global.setPasRequest || {};
    global.setPasCooldown = global.setPasCooldown || {};
    global.actCooldown = global.actCooldown || {};
    global.actSession = global.actSession || {};
    global.charSession = global.charSession || {};
    global.pasMenuSession = global.pasMenuSession || {};

    let pushname = m.pushName || m.sender.split('@')[0];
    let wait = "⏳ _Sedang mencari data..._";

    switch (command) {
        case 'characterpas':
        case 'charpas': {
            let query = text;
            if (!query) return m.reply(`Format salah! Cara penggunaan:\n${usedPrefix + command} query\nContoh:\n${usedPrefix + command} Kano chinatsu`);

            try {
                m.reply(wait);
                var search = await malScraper.getResultsFromSearch(query, 'character');
                const hasil = search[0];
                if (!hasil) return m.reply('Character not found.');

                const char = new Characters();
                const data = await char.getCharacterFullById(hasil.id);
                
                let animeData = data.anime && data.anime.length > 0 ? data.anime[0] : null;
                
                let nik = data.nicknames.map(nick => nick);
                if (nik.length > 1) {
                    const lastNik = nik.pop();
                    nik = `- *Nicknames:* \`${nik.join(', ')}, and ${lastNik}\``;
                } else {
                    nik = `- *Nickname:* \`${nik.join(', ')}\``;
                }

                const sVoiceJ = data.voices ? data.voices.find(item => item.language === 'Japanese') : null;
                let voiceActor = sVoiceJ ? `${sVoiceJ.person.name} (Japanese)` : 'Unknown';

                let teksChar = `🎭 *CHARACTER INFO*\n\n`;
                teksChar += `*\`${data.name}${data.name_kanji == null ? '' : ' ('+data.name_kanji+')'}\`*\n`;
                if (animeData) {
                    teksChar += `- *From:* \`${animeData.anime.title}\`\n`;
                    teksChar += `- *Role:* \`${animeData.role == null ? 'Nothing' : animeData.role}\`\n`;
                }
                teksChar += `${data.nicknames == '' ? '- *Nickname:* `Nothing`' : nik}\n`;
                teksChar += `- *Voice Actor:* \`${voiceActor}\`\n\n`;
                teksChar += `*mal-id:* \`${data.mal_id}\`\n`;
                teksChar += `*link:*\n\`${data.url}\``;

                let imageUrl = data.images.jpg.image_url;

                await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption: teksChar }, { quoted: m });

                // Stringify data agar aman di SQL
                await updateUser(m.sender, {
                    lastCharSearch: JSON.stringify({ name: data.name, mal_id: data.mal_id, image: imageUrl })
                });

                await conn.sendMessage(m.chat, {
                    text: `Apakah kamu ingin melamar karakter \`${data.name}\`?\n\n1. Lamar 🤍\n2. Cek pasangan 💍`
                }, { quoted: m });

                global.charSession[m.sender] = true;

            } catch (err) {
                console.log(err);
                return m.reply('Error saat mencari character\n' + err);
            }
            break;
        }

        case 'pas': {
            let user = await getUser(m.sender)
            if (!user || !user.pasanganChar)
                return m.reply("Kamu belum memiliki pasangan. Gunakan .charpas untuk melamar terlebih dahulu 💌");

            let pasData = parseJSON(user.pasanganChar);
            if (!pasData) return m.reply("Data pasangan error/kosong.");

            let pasanganList = Array.isArray(pasData) ? pasData : [pasData];
            if (pasanganList.length === 0) return m.reply("Data pasangan tidak ditemukan.");

            let data = pasanganList[0];
            let point = data.point || 0;
            let uang = data.uang || data.money || 0;

            let status = "Pdkt";
            if (point >= 50 && point < 200) status = "Pacaran";
            else if (point >= 200 && point < 300) status = "Menikah";
            else if (point >= 300) status = "Berkeluarga 🏡";

            let sejak = data.sejak || data.since || Date.now();
            let selisihMenit = Math.floor((Date.now() - sejak) / (1000 * 60));

            let tanggal = new Date(sejak).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric"
            });

            let teks = `
╔═════════════════════╗
║        *COUPLE PROFILE* ║
╚═════════════════════╝

*${pushname} ❤️ ${data.name || "-"}*
───────────────────────
*Sudah berpasangan sejak : ${tanggal}*
*Sudah berpasangan selama : ${selisihMenit} Menit*
───────────────────────
*Status : ${status}*
*Love Point : ${point}*
*Uang pasangan : ${uang}*
═══════════════════════
`;

            // Proses pemanggilan file fisik dari storage
            if (data.mediaPath && fs.existsSync(data.mediaPath)) {
                if (data.mimetype && data.mimetype.includes("video")) {
                    await conn.sendMessage(m.chat, { video: { url: data.mediaPath }, caption: teks.trim() }, { quoted: m });
                } else {
                    await conn.sendMessage(m.chat, { image: { url: data.mediaPath }, caption: teks.trim() }, { quoted: m });
                }
            } else if (data.image) {
                // Jika belum punya custom foto, ambil foto original dari MyAnimeList
                await conn.sendMessage(m.chat, { image: { url: data.image }, caption: teks.trim() }, { quoted: m });
            } else {
                await m.reply(teks.trim());
            }

            let menu = `
╭─〔  Couple Interaction 〕─╮

1. Action
2. Beri Makan
3. Kirim Uang

Balas dengan angka untuk memilih.

╰──────────────────╯`;
            await m.reply(menu);
            global.pasMenuSession[m.sender] = true;
            break;
        }

        case 'setpas': {
            let user = await getUser(m.sender)
            if (!user || !user.pasanganChar) return m.reply("Kamu belum memiliki pasangan. Gunakan .charpas terlebih dahulu 💌");

            let pasData = parseJSON(user.pasanganChar) || {};
            let media = m.quoted ? m.quoted : m;
            if (!media.mimetype || !/image|video/.test(media.mimetype)) return m.reply("Reply atau kirim foto/video untuk dijadikan tampilan pasangan.");

            const cooldown = 30 * 60 * 1000;
            let now = Date.now();

            if (global.setPasCooldown[m.sender]) {
                let sisa = global.setPasCooldown[m.sender] + cooldown - now;
                if (sisa > 0) {
                    let menit = Math.floor(sisa / 60000);
                    let detik = Math.floor((sisa % 60000) / 1000);
                    return m.reply(`Tunggu ${menit}m ${detik}s sebelum request lagi ⏳`);
                }
            }

            let groupStaff = "120363368633822650@g.us";
            let requestId = Date.now();
            let buffer;

            try {
                buffer = await media.download();
                if (!buffer) throw new Error("Download gagal");
            } catch {
                return m.reply("Gagal mengambil media. Coba kirim ulang.");
            }

            global.setPasRequest[requestId] = {
                user: m.sender, chat: m.chat, buffer: buffer, mimetype: media.mimetype, name: pasData.name || "Unknown"
            };

            global.setPasCooldown[m.sender] = now;
            m.reply("✅ Request perubahan tampilan pasangan sudah dikirim ke staff.");

            let notifStaff = `
📩 *SET PAS REQUEST*

👤 User: @${m.sender.split('@')[0]}
📞 wa.me/${m.sender.split('@')[0]}

💞 *Info Pasangan User*
• Nama: ${pasData.name || '-'}
• Gender: ${pasData.gender || '-'}
• Source: ${pasData.source || '-'}
• ID Char: ${pasData.id || '-'}

🆔 Request ID: ${requestId}

Gunakan:
.approvepas ${requestId}
.rejectpas ${requestId} <reason>
`;

            if (/image/.test(media.mimetype)) {
                await conn.sendMessage(groupStaff, { image: buffer, caption: notifStaff, mentions: [m.sender] });
            } else if (/video/.test(media.mimetype)) {
                await conn.sendMessage(groupStaff, { video: buffer, caption: notifStaff, mentions: [m.sender] });
            }
            break;
        }

        case 'approvepas': {
            let caller = await getUser(m.sender)
            let isROwner = global.owner.includes(m.sender.split('@')[0]);
            let isStaff = isROwner || caller?.moderator || caller?.timSupport
            if (!isStaff) return m.reply("Only staff can use this command.");
            
            let id = args[0];
            if (!id) return m.reply("Masukkan ID request.");

            let data = global.setPasRequest[id];
            if (!data) return m.reply("Request tidak ditemukan.");

            let user = await getUser(data.user)
            if (!user || !user.pasanganChar) return m.reply("User belum memiliki pasangan.");

            let userPas = parseJSON(user.pasanganChar) || {};
            
            // Konfigurasi direktori penyimpanan
            let folderDir = path.join(__dirname, '../../pasangan');
            if (!fs.existsSync(folderDir)) {
                fs.mkdirSync(folderDir, { recursive: true });
            }

            // Tentukan ekstensi berdasarkan mimetype
            let ext = data.mimetype.includes('video') ? 'mp4' : 'jpg';
            let fileName = `${data.user.split('@')[0]}.${ext}`;
            let filePath = path.join(folderDir, fileName);

            // Jika sebelumnya sudah punya foto/video (misal jpg lalu diganti mp4), hapus yang lama biar bersih
            if (userPas.mediaPath && fs.existsSync(userPas.mediaPath)) {
                fs.unlinkSync(userPas.mediaPath);
            }

            // Simpan buffer ke dalam folder
            fs.writeFileSync(filePath, data.buffer);

            // Update nested JSON di SQL, cuma nyimpen path/lokasi foldernya doang!
            await updateUser(data.user, { 
                pasanganChar: JSON.stringify({ 
                    ...userPas, 
                    mediaPath: filePath, 
                    mimetype: data.mimetype 
                }) 
            });

            await conn.sendMessage(data.chat, {
                text: `✨ Tampilan pasangan kamu berhasil diperbarui!\n\nCharacter: ${data.name}`,
                mentions: [data.user]
            });

            delete global.setPasRequest[id];
            m.reply("✅ Setpass berhasil disetujui dan media disimpan di server.");
            break;
        }

        case 'rejectpas': {
            let caller = await getUser(m.sender)
            let isROwner = global.owner.includes(m.sender.split('@')[0]);
            let isStaff = isROwner || caller?.moderator || caller?.timSupport
            if (!isStaff) return m.reply("Only staff can use this command.");

            let id = args[0];
            if (!id) return m.reply("Masukkan ID request.");

            let reason = args.slice(1).join(" ") || "No reason provided.";
            let data = global.setPasRequest[id];
            if (!data) return m.reply("Request tidak ditemukan.");

            await conn.sendMessage(data.chat, { text: `❌ Request setpas kamu ditolak.\n\nReason: ${reason}`, mentions: [data.user] });

            delete global.setPasRequest[id];
            m.reply("❌ Setpas berhasil ditolak.");
            break;
        }

        case 'act': {
            let user = await getUser(m.sender)
            if (!user?.pasanganChar) return m.reply("Kamu belum memiliki pasangan.");

            const cooldown = 60 * 1000;
            let now = Date.now();

            if (global.actCooldown[m.sender]) {
                let sisa = global.actCooldown[m.sender] + cooldown - now;
                if (sisa > 0) {
                    let detik = Math.ceil(sisa / 1000);
                    return m.reply(`Tunggu ${detik} detik lagi sebelum melakukan aksi lagi`);
                }
            }

            global.actCooldown[m.sender] = now;
            let pasangan = parseJSON(user.pasanganChar) || {};

            const normalAct = [
                { short: "Ajak Makan Malam", fullText: "Kamu mengajak pasanganmu makan malam romantis.", point: 20 },
                { short: "Nonton Bareng", fullText: "Kamu nonton film bareng pasanganmu.", point: 15 },
                { short: "Jalan Sore", fullText: "Kamu jalan sore sambil pegangan tangan.", point: 18 },
                { short: "Peluk Hangat", fullText: "Kamu memeluk pasanganmu dengan hangat.", point: 12 },
                { short: "Masak Favoritnya", fullText: "Kamu memasakkan makanan favoritnya.", point: 22 },
                { short: "Video Call", fullText: "Kamu video call sampai larut malam.", point: 14 }
            ];

            const adultActs = [
                { short: "Cium Pasangan", type: "adult", adultType: "kiss" },
                { short: "Malam Romantis", type: "adult", adultType: "romance" },
                { short: "Bikin Anak", type: "adult", adultType: "baby" }
            ];

            let actList = [...normalAct];
            if (Math.random() < 0.5) {
                let randomAdult = adultActs[Math.floor(Math.random() * adultActs.length)];
                actList.push(randomAdult);
            }

            let shuffled = actList.sort(() => 0.5 - Math.random());
            let selected = shuffled.slice(0, 3);

            global.actSession[m.sender] = { list: selected };

            let teks = `
╭───〔  A C T I O N   M E N U  〕───╮

   Partner  : ${pasangan.name || '-'}
   Love Pts : ${pasangan.point || 0}

╰──────────────────────╯

Choose one action:

`;
            selected.forEach((v, i) => { teks += `   ${i + 1}. ${v.short}\n`; });
            teks += `\n────────────────────────\nReply with number (1 - 3)`;

            m.reply(teks);
            break;
        }
    }
};

// ==========================================
// SESSION HANDLER UNTUK INTERAKSI COUPLE
// ==========================================
handler.before = async function (m, { conn }) {
    global.actSession = global.actSession || {};
    global.charSession = global.charSession || {};
    global.pasMenuSession = global.pasMenuSession || {};
    global.putusSession = global.putusSession || {};

    let budy = m.text;
    if (!budy) return;

    if (global.actSession[m.sender]) {
        let session = global.actSession[m.sender];
        let user = await getUser(m.sender);

        if (!user || !user.pasanganChar) {
            delete global.actSession[m.sender];
            return;
        }

        if (['1', '2', '3'].includes(budy)) {
            let pilihan = parseInt(budy) - 1;
            let selected = session.list[pilihan];
            if (!selected) return;

            let pasData = parseJSON(user.pasanganChar) || {};
            let before = pasData.point || 0;
            let newPoint = before;

            if (selected.type === "adult") {
                if (before < 200) {
                    let ngambek = ["Ihh apaan sih? Kita belum nikah tau 😠", "Baru kenal udah aneh-aneh aja kamu!", "Aku nggak mau ah, belum waktunya 🙄", "Kamu apasih... aku jadi malu banget!"];
                    let randomNgambek = ngambek[Math.floor(Math.random() * ngambek.length)];
                    
                    newPoint = Math.max(0, before - 30);
                    await updateUser(m.sender, { pasanganChar: JSON.stringify({ ...pasData, point: newPoint }) });
                    
                    m.reply(randomNgambek);
                    m.reply(`Pass Point : ${before} --> ${newPoint}`);
                } else {
                    let suksesText = [];
                    if (selected.adultType === "kiss") {
                        suksesText = ["Kamu mencium pasanganmu dengan lembut... dia jadi salting 😳", "Dia membalas ciumanmu dengan malu-malu.", "Duh kamu ini... bikin aku deg-degan tau!"];
                        newPoint += 35;
                    }
                    if (selected.adultType === "romance") {
                        suksesText = ["Malam itu terasa hangat dan penuh cinta 💕", "Kalian menghabiskan waktu romantis bersama.", "Dia tersenyum malu sambil memelukmu erat."];
                        newPoint += 50;
                    }
                    if (selected.adultType === "baby") {
                        suksesText = ["duhh enakk sayangg~", "ahh~", "sayangg mending di kasur aja biar makin enakkk~"];
                        newPoint += 70;
                    }
                    
                    await updateUser(m.sender, { pasanganChar: JSON.stringify({ ...pasData, point: newPoint }) });
                    let randomSukses = suksesText[Math.floor(Math.random() * suksesText.length)];
                    m.reply(randomSukses);
                    m.reply(`Pass Point : ${before} --> ${newPoint}`);
                }
            } else {
                newPoint += selected.point;
                await updateUser(m.sender, { pasanganChar: JSON.stringify({ ...pasData, point: newPoint }) });
                m.reply(selected.fullText);
                m.reply(`Pass Point : ${before} --> ${newPoint}`);
            }
            delete global.actSession[m.sender];
            return true; 
        }
    } 
    else if (global.charSession[m.sender]) {
        let user = await getUser(m.sender)
        if (!user || !user.lastCharSearch) {
            delete global.charSession[m.sender];
            return;
        }

        if (['1', '2'].includes(budy)) {
            let searchData = parseJSON(user.lastCharSearch) || {};
            let namaChar = searchData.name;
            
            // Cek di database apakah karakter sudah ada yang punya
            let allUsers = await db.user.findMany({ where: { registered: true } });
            let sudahDimiliki = allUsers.find(u => {
                let p = parseJSON(u.pasanganChar);
                return p && p.name === namaChar;
            });

            if (budy === '1') {
                if (user.pasanganChar) {
                    m.reply('Kamu sudah memiliki pasangan anime💢.');
                } else {
                    if (sudahDimiliki) {
                        m.reply(`💔 Gagal! ${namaChar} sudah memiliki pasangan.`);
                    } else {
                        await updateUser(m.sender, {
                            pasanganChar: JSON.stringify({
                                name: searchData.name, mal_id: searchData.mal_id, image: searchData.image, point: 0, uang: 0, sejak: Date.now()
                            }),
                            lastCharSearch: null
                        });
                        m.reply(`🤍 Selamat! Kamu berhasil melamar ${namaChar} 💖`);
                    }
                }
            }
            if (budy === '2') {
                if (sudahDimiliki) {
                    m.reply(`💔 Yah karakter *${namaChar}* sudah memiliki pasangan.`);
                } else {
                    m.reply(`🤍 Karakter *${namaChar}* belum memiliki pasangan.\nKamu bisa melamarnya.`);
                }
            }
            delete global.charSession[m.sender];
            return true;
        }
    } 
    else if (global.pasMenuSession[m.sender]) {
        let user = await getUser(m.sender)
        if (!user || !user.pasanganChar) {
            delete global.pasMenuSession[m.sender];
            return;
        }

        if (['1', '2', '3'].includes(budy)) {
            if (budy === '1') {
                delete global.pasMenuSession[m.sender];
                return m.reply("Gunakan .act untuk melakukan aksi 💭");
            }
            if (budy === '2') {
                let pasData = parseJSON(user.pasanganChar) || {};
                await updateUser(m.sender, { 
                    pasanganChar: JSON.stringify({ ...pasData, point: (pasData.point || 0) + 10 }) 
                });
                m.reply("🥘 Kamu memberi makan pasanganmu. +10 Point");
            }
            if (budy === '3') {
                m.reply("Gunakan .transferpas jumlah untuk memberi uang 💵");
            }
            delete global.pasMenuSession[m.sender];
            return true;
        }
    } 
    else if (global.putusSession[m.sender]) {
        let user = await getUser(m.sender)
        if (!user || !user.pasanganChar) {
            delete global.putusSession[m.sender];
            return;
        }

        if (['1', '2'].includes(budy)) {
            if (budy === '1') {
                let pasData = parseJSON(user.pasanganChar) || {};
                let nama = pasData.name || "pasanganmu";
                
                // Kalau ada file custom image/video, sekalian kita hapus fisiknya dari server
                if (pasData.mediaPath && fs.existsSync(pasData.mediaPath)) {
                    try { fs.unlinkSync(pasData.mediaPath); } catch (e) { console.log("Gagal menghapus file:", e); }
                }

                await updateUser(m.sender, { pasanganChar: null })
                m.reply(`💔 Kamu resmi putus dengan ${nama}...`);
            }
            if (budy === '2') {
                m.reply("❤️ Kamu memutuskan untuk tetap bersama.");
            }
            delete global.putusSession[m.sender];
            return true;
        }
    }
};

handler.help = [ 'characterpas', 'pas', 'setpas', 'approvepas', 'rejectpas', 'act'];
handler.tags = ['rpg'];
handler.command = /^(charpas|characterpas|pas|setpas|approvepas|rejectpas|act)$/i;
handler.register = true;
module.exports = handler;
