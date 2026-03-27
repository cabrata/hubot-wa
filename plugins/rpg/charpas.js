const malScraper = require('mal-scraper');
const { Marika, Characters } = require('@shineiichijo/marika');
const { anime } = new Marika();
const { db, getUser, updateUser } = require('../../lib/database');
const fs = require('fs');
const path = require('path');

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
            if (!query) return m.reply(`Format salah! Cara penggunaan:\n${usedPrefix + command} query`);
            try {
                m.reply(wait);
                const char = new Characters();
                let data
                if (!isNaN(query)) data = await char.getCharacterFullById(query);
                else {
                    var search = await malScraper.getResultsFromSearch(query, 'character');
                    if (!search[0]) return m.reply('Character not found.');
                    data = await char.getCharacterFullById(search[0].id);
                }
                let animeData = data.anime && data.anime.length > 0 ? data.anime[0] : null;
                let nik = data.nicknames.map(nick => nick);
                if (nik.length > 1) {
                    const lastNik = nik.pop();
                    nik = `- *Nicknames:* \`${nik.join(', ')}, and ${lastNik}\``;
                } else nik = `- *Nickname:* \`${nik.join(', ')}\``;

                const sVoiceJ = data.voices ? data.voices.find(item => item.language === 'Japanese') : null;
                let voiceActor = sVoiceJ ? `${sVoiceJ.person.name} (Japanese)` : 'Unknown';

                let teksChar = `🎭 *CHARACTER INFO*\n\n*\`${data.name}${data.name_kanji == null ? '' : ' ('+data.name_kanji+')'}\`*\n`;
                if (animeData) teksChar += `- *From:* \`${animeData.anime.title}\`\n- *Role:* \`${animeData.role == null ? 'Nothing' : animeData.role}\`\n`;
                teksChar += `${data.nicknames == '' ? '- *Nickname:* `Nothing`' : nik}\n- *Voice Actor:* \`${voiceActor}\`\n\n*mal-id:* \`${data.mal_id}\`\n*link:*\n\`${data.url}\``;

                let imageUrl = data.images.jpg.image_url;
                await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption: teksChar }, { quoted: m });
                await updateUser(m.sender, { lastCharSearch: JSON.stringify({ name: data.name, mal_id: data.mal_id, image: imageUrl }) });
                await conn.sendMessage(m.chat, { text: `Apakah kamu ingin melamar karakter \`${data.name}\`?\n\n1. Lamar 🤍\n2. Cek pasangan 💍` }, { quoted: m });
                global.charSession[m.sender] = true;
            } catch (err) { return m.reply('Error saat mencari character\n' + err); }
            break;
        }

        case 'cekpas': {
            let query = text;
            if (!query) return m.reply(`Format salah!`);
            try {
                m.reply(wait);
                const char = new Characters();
                let data
                if (!isNaN(query)) data = await char.getCharacterFullById(query);
                else {
                    var search = await malScraper.getResultsFromSearch(query, 'character');
                    if (!search[0]) return m.reply('Character not found.');
                    data = await char.getCharacterFullById(search[0].id);
                }
                let namaChar = data.name;
                let allUsers = await db.user.findMany({ where: { registered: true } });
                let sudahDimiliki = allUsers.find(u => {
                    let p = parseJSON(u.pasanganChar);
                    return p && p.name === namaChar;
                });
                if (sudahDimiliki) m.reply(`💔 Yah karakter *${namaChar}* sudah memiliki pasangan.`);
                else m.reply(`🤍 Karakter *${namaChar}* belum memiliki pasangan.\nKamu bisa melamarnya.`);
            } catch (err) { return m.reply('Error\n' + err); }
            break;
        }

        case 'pas': {
            let user = await getUser(m.sender)
            if (!user || !user.pasanganChar) return m.reply("Kamu belum memiliki pasangan. Gunakan .charpas untuk melamar terlebih dahulu 💌");

            let pasData = parseJSON(user.pasanganChar);
            if (!pasData) return m.reply("Data pasangan error/kosong.");
            let anak = parseJSON(user.anak) || [];

            let point = pasData.point || 0;
            let uang = pasData.uang || 0;
            let anakCount = Array.isArray(anak) ? anak.length : 0;

            let status = "Pdkt";
            if (point >= 50000 && point < 100000) status = "Pacaran 🥰";
            else if (point >= 100000 && point < 250000) status = "Menikah 💍";
            else if (point >= 250000) status = "Berkeluarga 🏡";

            let sejak = pasData.sejak || Date.now();
            let selisihMenit = Math.floor((Date.now() - sejak) / (1000 * 60));
            let tanggal = new Date(sejak).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

            let teks = `╔═════════════════════╗
║        *COUPLE PROFILE* ║
╚═════════════════════╝

*${pushname} ❤️ ${pasData.name || "-"}*
───────────────────────
*Sejak:* ${tanggal}
*Lama Bersama:* ${selisihMenit} Menit
───────────────────────
*Status :* ${status}
*Love Point :* ${point.toLocaleString('id-ID')} Pts
*Uang Istri :* Rp${uang.toLocaleString('id-ID')}
*Jumlah Anak :* ${anakCount} Anak 👶
═══════════════════════`;

            if (pasData.mediaPath && fs.existsSync(pasData.mediaPath)) {
                if (pasData.mimetype && pasData.mimetype.includes("video")) await conn.sendMessage(m.chat, { video: { url: pasData.mediaPath }, caption: teks.trim() }, { quoted: m });
                else await conn.sendMessage(m.chat, { image: { url: pasData.mediaPath }, caption: teks.trim() }, { quoted: m });
            } else if (pasData.image) {
                await conn.sendMessage(m.chat, { image: { url: pasData.image }, caption: teks.trim() }, { quoted: m });
            } else await m.reply(teks.trim());

            await m.reply(`╭─〔  Couple Interaction 〕─╮\n1. Action\n2. Beri Makan\n3. Kirim Uang\n╰──────────────────╯`);
            global.pasMenuSession[m.sender] = true;
            break;
        }

        case 'setpas': {
            let user = await getUser(m.sender);
            if (!user || !user.pasanganChar) return m.reply("Kamu belum memiliki pasangan.");
            let pasData = parseJSON(user.pasanganChar) || {};
            let media = m.quoted ? m.quoted : m;
            if (!media.mimetype || !/image|video/.test(media.mimetype)) return m.reply("Reply foto/video untuk setpas.");

            let now = Date.now();
            if (global.setPasCooldown[m.sender]) {
                let sisa = global.setPasCooldown[m.sender] + (30 * 60 * 1000) - now;
                if (sisa > 0) return m.reply(`Tunggu ${Math.floor(sisa / 60000)}m sebelum request lagi.`);
            }

            let groupStaff = "120363368633822650@g.us";
            let requestId = Date.now();
            let buffer;
            try { buffer = await media.download(); } catch { return m.reply("Download gagal."); }

            global.setPasRequest[requestId] = { user: m.sender, chat: m.chat, buffer, mimetype: media.mimetype, name: pasData.name };
            global.setPasCooldown[m.sender] = now;
            m.reply("✅ Request setpas dikirim ke staff.");

            let notifStaff = `📩 *SET PAS REQUEST*\nUser: @${m.sender.split('@')[0]}\nChar: ${pasData.name || '-'}\nID: ${requestId}\nGunakan:\n.approvepas ${requestId}\n.rejectpas ${requestId}`;
            if (/image/.test(media.mimetype)) await conn.sendMessage(groupStaff, { image: buffer, caption: notifStaff, mentions: [m.sender] });
            else await conn.sendMessage(groupStaff, { video: buffer, caption: notifStaff, mentions: [m.sender] });
            break;
        }

        case 'approvepas': {
            let caller = await getUser(m.sender);
            let isStaff = global.owner.includes(m.sender.split('@')[0]) || caller?.moderator || caller?.timSupport;
            if (!isStaff) return m.reply("Only staff.");
            
            let id = args[0]; if (!id) return m.reply("Masukkan ID request.");
            let data = global.setPasRequest[id]; if (!data) return m.reply("Request tidak ditemukan.");
            let user = await getUser(data.user);
            if (!user || !user.pasanganChar) return m.reply("User belum memiliki pasangan.");

            let userPas = parseJSON(user.pasanganChar) || {};
            let folderDir = path.join(__dirname, '../../pasangan');
            if (!fs.existsSync(folderDir)) fs.mkdirSync(folderDir, { recursive: true });
            let ext = data.mimetype.includes('video') ? 'mp4' : 'jpg';
            let fileName = `${data.user.split('@')[0]}.${ext}`;
            let filePath = path.join(folderDir, fileName);

            if (userPas.mediaPath && fs.existsSync(userPas.mediaPath)) {
                try { fs.unlinkSync(userPas.mediaPath); } catch(e){}
            }
            fs.writeFileSync(filePath, data.buffer);

            await updateUser(data.user, { pasanganChar: JSON.stringify({ ...userPas, mediaPath: filePath, mimetype: data.mimetype }) });
            await conn.sendMessage(data.chat, { text: `✨ Tampilan pasangan diperbarui!\nCharacter: ${data.name}`, mentions: [data.user] });
            delete global.setPasRequest[id];
            m.reply("✅ Disetujui.");
            break;
        }

        case 'rejectpas': {
            let caller = await getUser(m.sender);
            let isStaff = global.owner.includes(m.sender.split('@')[0]) || caller?.moderator || caller?.timSupport;
            if (!isStaff) return m.reply("Only staff.");
            let id = args[0]; if (!id) return m.reply("Masukkan ID.");
            let reason = args.slice(1).join(" ") || "No reason.";
            let data = global.setPasRequest[id]; if (!data) return m.reply("Not found.");
            await conn.sendMessage(data.chat, { text: `❌ Request setpas ditolak.\nReason: ${reason}`, mentions: [data.user] });
            delete global.setPasRequest[id];
            m.reply("Ditolak.");
            break;
        }

        case 'act': {
            let user = await getUser(m.sender);
            if (!user?.pasanganChar) return m.reply("Kamu belum memiliki pasangan.");

            let now = Date.now();
            if (global.actCooldown[m.sender]) {
                let sisa = global.actCooldown[m.sender] + 60000 - now;
                if (sisa > 0) return m.reply(`Tunggu ${Math.ceil(sisa / 1000)} detik lagi.`);
            }
            global.actCooldown[m.sender] = now;

            let pasangan = parseJSON(user.pasanganChar) || {};
            let currentPoint = pasangan.point || 0;

            const normalAct = [
                { short: "Ajak Makan Malam", fullText: "Kamu mengajak pasanganmu makan malam romantis.", point: 250 },
                { short: "Nonton Bareng", fullText: "Kamu nonton film bareng pasanganmu.", point: 200 },
                { short: "Jalan Sore", fullText: "Kamu jalan sore sambil pegangan tangan.", point: 180 },
                { short: "Masak Favoritnya", fullText: "Kamu memasakkan makanan favoritnya.", point: 300 }
            ];

            const romanceActs = [
                { short: "Cium Pasangan", type: "adult", adultType: "kiss" },
                { short: "Malam Romantis", type: "adult", adultType: "romance" }
            ];

            let actList = [...normalAct];

            // Kebuka cuma kalo udah nikah (100k pts)
            if (currentPoint >= 100000 && Math.random() < 0.6) {
                actList.push(romanceActs[Math.floor(Math.random() * romanceActs.length)]);
            }

            let shuffled = actList.sort(() => 0.5 - Math.random());
            let selected = shuffled.slice(0, 3);
            global.actSession[m.sender] = { list: selected };

            let teks = `╭───〔  A C T I O N   M E N U  〕───╮\n   Partner  : ${pasangan.name || '-'}\n   Love Pts : ${currentPoint.toLocaleString('id-ID')}\n╰──────────────────────╯\nChoose action:\n\n`;
            selected.forEach((v, i) => { teks += `   ${i + 1}. ${v.short}\n`; });
            teks += `\n────────────────────────\nReply number (1 - 3)\n_Tips: 100k Pts buat Nikah, kalau mau bikin anak pakai command .bikinanak!_`;
            m.reply(teks);
            break;
        }
    }
};

handler.before = async function (m, { conn }) {
    global.actSession = global.actSession || {};
    global.charSession = global.charSession || {};
    global.pasMenuSession = global.pasMenuSession || {};
    global.putusSession = global.putusSession || {};
    let budy = m.text; if (!budy) return;

    if (global.actSession[m.sender]) {
        let session = global.actSession[m.sender];
        let user = await getUser(m.sender);
        if (!user || !user.pasanganChar) { delete global.actSession[m.sender]; return; }

        if (['1', '2', '3'].includes(budy)) {
            let pilihan = parseInt(budy) - 1;
            let selected = session.list[pilihan];
            if (!selected) return;

            let pasData = parseJSON(user.pasanganChar) || {};
            let before = pasData.point || 0;
            let newPoint = before;

            if (selected.type === "adult") {
                if (selected.adultType === "kiss") {
                    newPoint += 1000;
                    m.reply("Kamu mencium pasanganmu dengan lembut... dia membalasnya dengan mesra. 💕");
                } else if (selected.adultType === "romance") {
                    newPoint += 2500;
                    m.reply("Malam itu terasa hangat dan penuh cinta... kalian menghabiskan waktu bersama. 🌙❤️");
                }
            } else {
                newPoint += selected.point;
                m.reply(selected.fullText);
            }
            
            await updateUser(m.sender, { pasanganChar: JSON.stringify({ ...pasData, point: newPoint }) });
            m.reply(`Pass Point : ${before.toLocaleString('id-ID')} --> ${newPoint.toLocaleString('id-ID')}`);
            delete global.actSession[m.sender];
            return true; 
        }
    } 
    else if (global.charSession[m.sender]) {
        let user = await getUser(m.sender)
        if (!user || !user.lastCharSearch) { delete global.charSession[m.sender]; return; }
        if (['1', '2'].includes(budy)) {
            let searchData = parseJSON(user.lastCharSearch) || {};
            let namaChar = searchData.name;
            let allUsers = await db.user.findMany({ where: { registered: true } });
            let sudahDimiliki = allUsers.find(u => {
                let p = parseJSON(u.pasanganChar);
                return p && p.name === namaChar;
            });
            if (budy === '1') {
                if (user.pasanganChar) m.reply('Kamu sudah memiliki pasangan anime💢.');
                else if (sudahDimiliki) m.reply(`💔 Gagal! ${namaChar} sudah memiliki pasangan.`);
                else {
                    await updateUser(m.sender, {
                        pasanganChar: JSON.stringify({ name: searchData.name, mal_id: searchData.mal_id, image: searchData.image, point: 0, uang: 0, sejak: Date.now() }),
                        lastCharSearch: null
                    });
                    m.reply(`🤍 Selamat! Kamu berhasil melamar ${namaChar} 💖\n_Tips: Kumpulkan 100k Love Point untuk Menikah resminya!_`);
                }
            }
            if (budy === '2') {
                if (sudahDimiliki) m.reply(`💔 Yah karakter *${namaChar}* sudah memiliki pasangan.`);
                else m.reply(`🤍 Karakter *${namaChar}* belum memiliki pasangan.\nKamu bisa melamarnya.`);
            }
            delete global.charSession[m.sender];
            return true;
        }
    } 
    else if (global.pasMenuSession[m.sender]) {
        let user = await getUser(m.sender)
        if (!user || !user.pasanganChar) { delete global.pasMenuSession[m.sender]; return; }
        if (['1', '2', '3'].includes(budy)) {
            if (budy === '1') {
                delete global.pasMenuSession[m.sender];
                return m.reply("Gunakan .act untuk melakukan aksi 💭");
            }
            if (budy === '2') {
                let pasData = parseJSON(user.pasanganChar) || {};
                await updateUser(m.sender, { pasanganChar: JSON.stringify({ ...pasData, point: (pasData.point || 0) + 100 }) });
                m.reply("🥘 Kamu memberi makan pasanganmu. +100 Point");
            }
            if (budy === '3') m.reply("Gunakan .transferpas jumlah untuk memberi uang 💵");
            delete global.pasMenuSession[m.sender];
            return true;
        }
    } 
    else if (global.putusSession[m.sender]) {
        let user = await getUser(m.sender)
        if (!user || !user.pasanganChar) { delete global.putusSession[m.sender]; return; }
        if (['1', '2'].includes(budy)) {
            if (budy === '1') {
                let pasData = parseJSON(user.pasanganChar) || {};
                let nama = pasData.name || "pasanganmu";
                if (pasData.mediaPath && fs.existsSync(pasData.mediaPath)) {
                    try { fs.unlinkSync(pasData.mediaPath); } catch (e) {}
                }
                await updateUser(m.sender, { pasanganChar: null })
                m.reply(`💔 Kamu resmi putus dengan ${nama}...\nHak asuh anak jatuh ke tangan Istri. 🥀`);
            }
            if (budy === '2') m.reply("❤️ Kamu memutuskan untuk tetap bersama demi anak-anak.");
            delete global.putusSession[m.sender];
            return true;
        }
    }
};

handler.help = [ 'characterpas', 'pas', 'setpas', 'approvepas', 'rejectpas', 'act', 'cekpas'];
handler.tags = ['rpg'];
handler.command = /^(charpas|characterpas|pas|setpas|approvepas|rejectpas|act|cekpas)$/i;
handler.register = true;
module.exports = handler;