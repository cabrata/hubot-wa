const acrcloud = require('acrcloud');

let acr = new acrcloud({
    host: 'identify-ap-southeast-1.acrcloud.com',
    access_key: 'e430de71dce68c4aba3dc1b11e11635d',
    access_secret: 'BmUFbelsrUCOeeeyvTzGDBpws2uw6Sf7n27yvjMe'
});

const handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || '';
        if (/video|audio/.test(mime)) {
            let buffer = await q.download();
            m.reply(wait);
            let { status, metadata } = await acr.identify(buffer);
            if (status.code !== 0) throw status.msg;
            let { title, artists, album, genres, release_date } = (metadata.humming || metadata.music)[0];
            let txt = `*• Title:* ${title}${artists ? `\n*• Artists:* ${artists.map(v => v.name).join(', ')}` : ''}`;
            txt += `${album ? `\n*• Album:* ${album.name}` : ''}${genres ? `\n*• Genres:* ${genres.map(v => v.name).join(', ')}` : ''}\n`;
            txt += `*• Release Date:* ${release_date}`;
            m.reply(txt);
        } else {
            throw `Reply audio/video with command ${usedPrefix + command}`;
        }
    } catch (error) {
        console.error(error);
        throw error
    }
};

handler.help = ['whatmusic <reply audio>'];
handler.tags = ['tools'];
handler.command = /^(whatmusic|whatsmusic|musikapa|whatmusik|detectmusic|deteksimusik|detectmusik)$/i;

module.exports = handler;