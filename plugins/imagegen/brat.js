const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

const THEMES = ['green', 'white', 'black', 'blue', 'strike', 'red'];

async function processBratPuppeteer(text, themeName) {
    const executablePath = execSync('which chromium || which google-chrome || which chrome || which chromium-browser').toString().trim();
    const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 500, height: 500 });
        await page.goto('https://bratgen.pages.dev');

        await page.evaluate((txt, theme) => {
            const input = document.getElementById('textInput');
            input.value = txt;
            input.dispatchEvent(new Event('input'));
            setupTheme(theme);
        }, text, themeName);

        await new Promise(r => setTimeout(r, 1000));

        await page.evaluate(() => {
            const input = document.getElementById('textInput');
            input.value = "";
            input.dispatchEvent(new Event('input'));
        });
        
        await page.type("#textInput", text);
        
        // Wait a small moment to ensure textFit recalculates after typing
        await new Promise(r => setTimeout(r, 500));

        const element = await page.$('#textOverlay');
        const buffer = await element.screenshot();

        await browser.close();
        return buffer;
    } catch (e) {
        await browser.close();
        throw e;
    }
}

module.exports = {
    name: 'brat',
    command: ['brat'],
    group: false,
    admin: false,
    botAdmin: false,
    owner: false,
    premium: false,
    private: false,
    limit: 1,
    tags: ['tools'],
    desc: 'Buat stiker generator Brat dengan berbagai tema via Puppeteer',

    async handler({ m, conn, args, isOwner }) {
        let text = args.join(' ');
        if (!text && m.quoted?.text) {
            text = m.quoted.text;
        }

        const availableThemes = THEMES.join(', ');
        
        if (!text) {
            return m.reply(`Kirim/reply teks dengan caption *.brat <teks>*\n\n*Tema Opsional:* gunakan flag *-t* diikuti nama tema di akhir.\nContoh: *.brat the moment -t red*\n\n*Tema yang tersedia:*\n${availableThemes}`);
        }

        let theme = 'white';
        
        const themeMatch = text.match(/\s-t\s+([a-zA-Z]+)$/i);
        if (themeMatch) {
            theme = themeMatch[1].toLowerCase();
            text = text.replace(themeMatch[0], '').trim();
        }

        if (!text) {
            return m.reply('Teks tidak boleh kosong setelah nama tema dimasukkan.');
        }

        if (!THEMES.includes(theme)) {
            return m.reply(`Tema "${theme}" tidak ditemukan. Tema yang tersedia:\n${availableThemes}`);
        }

        await m.react('⏳');

        try {
            const stickerBuffer = await processBratPuppeteer(text, theme);

            let stickerName = "HuTao Bot"
            let stickerAuthor = '@caliphdev'

            const { getUser } = require('../../lib/database')
            const user = m.user || await getUser(m.sender).catch(() => null)

            if (user && (user.premiumTime > Date.now() || isOwner)) {
                if (user.exifPack) stickerName = user.exifPack;
                if (user.exifAuthor) stickerAuthor = user.exifAuthor;
            }

            let finalSticker;
            try {
                let stickerMetadata = {
                    type: StickerTypes.FULL,
                    pack: stickerName,
                    author: stickerAuthor,
                    quality: 50
                }

                finalSticker = await (new Sticker(stickerBuffer, stickerMetadata)).toBuffer()
            } catch (err) {
                console.error(err)
                return m.reply('❌ Gagal mengonversi gambar ke sticker format.')
            }

            await conn.sendMessage(m.chat, {
                sticker: finalSticker,
            }, { quoted: m.msg })

            await m.react('✅')

        } catch (e) {
            console.error(e);
            await m.react('❌')
            m.reply('❌ Gagal membuat sticker brat: ' + (e.message || e))
        }
    },
}
