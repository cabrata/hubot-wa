const fetch = require('node-fetch');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(`❌ Masukkan link pack stiker Telegram!\nContoh: *${usedPrefix + command} https://t.me/addstickers/Animals*`);

    let packName = args[0].split('/addstickers/')[1];
    if (!packName) return m.reply('❌ Link tidak valid! Pastikan formatnya https://t.me/addstickers/NamaPack');

    const botToken = global.APIKeys?.telegram;
    if (!botToken) return m.reply('❌ Token Telegram belum di-setup di config.js');

    let { key } = await conn.sendMessage(m.chat, { text: `⏳ Sedang mengambil data pack *${packName}* dari Telegram...` }, { quoted: m });

    try {
        // 1. Dapatkan daftar stiker
        let res = await fetch(`https://api.telegram.org/bot${botToken}/getStickerSet?name=${packName}`);
        let json = await res.json();

        if (!json.ok) return conn.sendMessage(m.chat, { text: `❌ Gagal mengambil data: ${json.description}`, edit: key });

        let stickers = json.result.stickers;
        if (!stickers || stickers.length === 0) return conn.sendMessage(m.chat, { text: '❌ Pack ini tidak memiliki stiker.', edit: key });

        // 2. Batasi jumlah stiker (kurangi jadi 20 agar tidak terlalu spam)
        let limit = stickers.length

        // Cek tipe pack
        const isAnimatedPack = json.result.is_animated; // TGS (Lottie)
        const isVideoPack = json.result.is_video; // WEBM
        let typeInfo = isVideoPack ? 'video (.webm)' : isAnimatedPack ? 'animated (.tgs)' : 'static (.webp)';

        await conn.sendMessage(m.chat, { text: `⏳ Mendownload dan mengirim ${limit} stiker (${typeInfo}) satu per satu... Proses ini memakan waktu agak lama untuk menghindari limit.`, edit: key });

        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');

        let successCount = 0;

        for (let i = 0; i < limit; i++) {
            let stiker = stickers[i];

            try {
                let webpBuffer = null;
                let isAnimated = false;

                if (stiker.is_video) {
                    // === VIDEO STICKER (.webm) → convert ke animated .webp pakai ffmpeg ===
                    let fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${stiker.file_id}`);
                    let fileJson = await fileRes.json();
                    if (!fileJson.ok) { /* fallback ke thumbnail di bawah */ }
                    else {
                        let dlRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileJson.result.file_path}`);
                        let buffer = await dlRes.buffer();

                        let tmpInput = path.resolve(`./tmp/stk_in_${Date.now()}_${i}.webm`);
                        let tmpOutput = path.resolve(`./tmp/stk_out_${Date.now()}_${i}.webp`);
                        fs.writeFileSync(tmpInput, buffer);

                        try {
                            execSync(`ffmpeg -y -i "${tmpInput}" -vcodec libwebp -loop 0 -an -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -q:v 70 "${tmpOutput}"`, {
                                timeout: 30000,
                                stdio: 'pipe'
                            });
                            webpBuffer = fs.readFileSync(tmpOutput);
                            isAnimated = true;
                        } catch (e) {
                            // ffmpeg gagal, fallback ke thumbnail
                        } finally {
                            if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
                            if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
                        }
                    }

                    // Fallback: pakai thumbnail jika ffmpeg gagal
                    if (!webpBuffer && stiker.thumbnail) {
                        webpBuffer = await downloadTelegramFile(botToken, stiker.thumbnail.file_id);
                        isAnimated = false;
                    }

                } else if (stiker.is_animated) {
                    // === TGS (Lottie) STICKER → pakai thumbnail sebagai fallback ===
                    // TGS memerlukan Lottie renderer, untuk saat ini pakai thumbnail .webp
                    if (stiker.thumbnail) {
                        webpBuffer = await downloadTelegramFile(botToken, stiker.thumbnail.file_id);
                    }
                    isAnimated = false; // thumbnail statis

                } else {
                    // === STATIC STICKER (.webp) → langsung pakai ===
                    webpBuffer = await downloadTelegramFile(botToken, stiker.file_id);
                    isAnimated = false;
                }

                if (!webpBuffer || webpBuffer.length === 0) continue;

                // Gunakan wa-sticker-formatter untuk metadata EXIF
                let stickerMetadata = {
                    type: StickerTypes.FULL,
                    pack: json.result.title || packName,
                    author: "HuTao Bot by @caliphdev",
                    quality: 50
                };

                let finalStickerBuffer = await (new Sticker(webpBuffer, stickerMetadata)).toBuffer();

                // Kirim stiker
                await conn.sendMessage(m.chat, { sticker: finalStickerBuffer });
                successCount++;

                // Update progress
                await conn.sendMessage(m.chat, { text: `⏳ Mengirim stiker ${successCount} dari ${limit} (${typeInfo})...\n\n_Mohon tunggu, proses ini sengaja diberi jeda agar tidak terkena limit WhatsApp._`, edit: key });

                // Jeda 1.5 detik agar tidak terkena rate limit WhatsApp
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (err) {
                console.error(`Error processing sticker ${i}:`, err.message);
                continue;
            }
        }

        if (successCount === 0) {
            return conn.sendMessage(m.chat, { text: '❌ Tidak ada stiker yang berhasil diproses dan dikirim.', edit: key });
        }

        await conn.sendMessage(m.chat, { text: `✅ Selesai! Berhasil mengirim ${successCount} stiker dari pack *${json.result.title || packName}*.`, edit: key });

    } catch (e) {
        console.error(e);
        conn.sendMessage(m.chat, { text: `❌ Terjadi kesalahan: ${e.message}`, edit: key });
    }
};

/**
 * Helper: Download file dari Telegram API
 */
async function downloadTelegramFile(botToken, fileId) {
    try {
        let fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        let fileJson = await fileRes.json();
        if (!fileJson.ok) return null;

        let dlRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileJson.result.file_path}`);
        return await dlRes.buffer();
    } catch {
        return null;
    }
}

handler.help = ['dlsticker <url_telegram>'];
handler.tags = ['tools'];
handler.command = /^(dlsticker|tgsticker)$/i;
module.exports = handler;
