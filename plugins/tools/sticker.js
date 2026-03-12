const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

module.exports = {
    name: 'sticker',
    command: ['sticker', 'stiker', 's'],
    group: false,
    admin: false,
    botAdmin: false,
    owner: false,
    premium: false,
    private: false,
    tags: ['tools'],
    desc: 'Buat sticker dari gambar/video',

    async handler({ m, conn, args, isOwner }) {
        const isImage = m.mtype === 'imageMessage'
        const isVideo = m.mtype === 'videoMessage'
        const isQuotedImage = m.quoted?.mtype === 'imageMessage'
        const isQuotedVideo = m.quoted?.mtype === 'videoMessage'
        const isQuotedSticker = m.quoted?.mtype === 'stickerMessage'

        if (!isImage && !isVideo && !isQuotedImage && !isQuotedVideo && !isQuotedSticker) {
            return m.reply('Kirim/reply gambar atau video (max 10 detik) dengan caption *.sticker*')
        }

        await m.react('⏳')

        try {
            // Download media
            const q = (isImage || isVideo) ? m : m.quoted;
            const buffer = await q.download();

            let stickerName = "HuTao Bot"
            let stickerAuthor = '@caliphdev'

            // If user is premium and didn't provide args, try to use their custom watermark
            // Get user data directly from m.user since handler provides it implicitly if fetched, otherwise fetch it
            const { getUser } = require('../../lib/database')
            const user = m.user || await getUser(m.sender).catch(() => null)

            // is premium or owner
            if (user && (user.premiumTime > Date.now() || isOwner)) {
                if (args.length > 0) {
                    let fullText = args.join(' ');
                    let [pack, author] = fullText.split('|');
                    stickerName = pack ? pack.trim() : stickerName;
                    if (author !== undefined) {
                        stickerAuthor = author.trim();
                    } else if (pack) {
                        stickerAuthor = '';
                    }
                } else {
                    if (user.exifPack) stickerName = user.exifPack;
                    if (user.exifAuthor) stickerAuthor = user.exifAuthor;
                }
            }

            let stickerBuffer;
            try {
                const { Sticker, StickerTypes } = require('wa-sticker-formatter')
                let stickerMetadata = {
                    type: StickerTypes.FULL,
                    pack: stickerName,
                    author: stickerAuthor,
                    quality: 50
                }

                stickerBuffer = await (new Sticker(buffer, stickerMetadata)).toBuffer()
            } catch (err) {
                console.error(err)
                return m.reply('❌ Gagal membuat sticker.')
            }

            await conn.sendMessage(m.chat, {
                sticker: stickerBuffer,
            }, { quoted: m.msg })

            await m.react('✅')

            // Cleanup
        } catch (e) {
            await m.react('❌')
            m.reply('❌ Gagal membuat sticker: ' + (e.message || e))
        }
    },
}
