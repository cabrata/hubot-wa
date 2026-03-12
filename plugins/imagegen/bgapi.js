const axios = require('axios');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
    name: 'bgapi',
    command: ['bgapi'],
    tags: ['imagegen'],
    desc: 'Hapus background gambar lalu tambahkan background template',
    async handler({ m, conn }) {
        const isImage = m.mtype === 'imageMessage';
        const isQuotedImage = m.quoted?.mtype === 'imageMessage';

        if (!isImage && !isQuotedImage) {
            return m.reply('Kirim/reply gambar dengan caption *.bgapi*');
        }

        await m.react('⏱️');

        try {
            const q = isImage ? m : m.quoted;
            let mediaBuffer = await q.download();

            async function getWebToken() {
                const r = await axios.get('https://removal.ai/wp-admin/admin-ajax.php?action=ajax_get_webtoken&security=b9f203363d', {
                    headers: {
                        Accept: '*/*',
                        Referer: 'https://removal.ai/upload/',
                        'User-Agent': 'Mozilla/5.0',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                return r.data.data.webtoken;
            }

            async function removebg(buffer, filename = 'image.png') {
                const webtoken = await getWebToken();
                const form = new FormData();
                form.append('image_file', buffer, filename);
                const r = await axios.post('https://api.removal.ai/3.0/remove', form, {
                    headers: {
                        ...form.getHeaders(),
                        origin: 'https://removal.ai',
                        'user-agent': 'Mozilla/5.0',
                        'web-token': webtoken
                    }
                });
                return r.data;
            }

            async function processCanvas(personUrl) {
                const bg = await loadImage('https://files.catbox.moe/w6v52h.jpg');
                const person = await loadImage(personUrl);

                const canvas = createCanvas(bg.width, bg.height);
                const ctx = canvas.getContext('2d');

                ctx.drawImage(bg, 0, 0);

                let scale = bg.height * 0.92 / person.height;
                let w = person.width * scale;
                let h = person.height * scale;

                const maxWidth = bg.width * 0.65;
                if (w > maxWidth) {
                    scale = maxWidth / person.width;
                    w = person.width * scale;
                    h = person.height * scale;
                }

                const rightOffset = -80;
                const x = bg.width - w - rightOffset;
                const y = bg.height - h + 3;

                ctx.drawImage(person, x, y, w, h);

                return canvas.toBuffer('image/png');
            }

            const removeResult = await removebg(mediaBuffer, 'image.png');
            if (!removeResult || !removeResult.url) {
                 throw new Error("Gagal menghapus background");
            }
            const canvasBuffer = await processCanvas(removeResult.url);

            await conn.sendMessage(m.chat, { 
                image: canvasBuffer,
                caption: "success"
            }, { quoted: m });

            await m.react('✅');
        } catch (error) {
            console.error(error);
            await m.reply("❌ error: " + error.message);
            await m.react('❌');
        }
    }
}
