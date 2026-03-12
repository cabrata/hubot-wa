//rpg-coinflip
const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { getUser, updateEconomy, updateUser } = require('../../lib/database')

const handler = async (m, { conn, args, text }) => {
    var arr = ["atas", "bawah"];
    if (!arr.includes(args[0])) throw "Pilih Atas Atau Bawah? format .putarkoin atas/bawah";
    var terbang = arr[Math.floor(Math.random() * arr.length)];
    var res;
    var pesan;
    var stiker;
    var MiliSecond = 3000; //1 second

    let coins = parseInt(Math.floor(Math.random() * 10000));
    let exp = parseInt(Math.floor(Math.random() * 100));
    
    let player = await getUser(m.sender);
    if (!player) return

    if (terbang == "atas") {
        res = "https://cdn-icons-png.flaticon.com/512/1490/1490832.png";
        stiker = await createSticker(false, res, wm, author, 30);
        conn.sendFile(m.chat, stiker, 'sticker.webp', text);
    
        pesan = `*[ Menang ]*\n\nKamu Mendapatkan:\n${new Intl.NumberFormat('en-US').format(coins)} Money\n${new Intl.NumberFormat('en-US').format(exp)} XP\n`;

        setTimeout(function() {
            conn.reply(m.chat, pesan, m);
        }, MiliSecond);

        await updateEconomy(m.sender, { money: (player.money || 0) + coins, tiketcoin: (player.tiketcoin || 0) + 1 });
        await updateUser(m.sender, { exp: (player.exp || 0) + exp });
        
    } else if (terbang == "bawah") {
        res = "https://cdn-icons-png.flaticon.com/512/4315/4315581.png";
        stiker = await createSticker(false, res, wm, author, 30);
        conn.sendFile(m.chat, stiker, 'sticker.webp', text);
    
        pesan = `*[ Kalah ]*\n\nKamu Kehilangan:\n${new Intl.NumberFormat('en-US').format(coins)} Money\n${new Intl.NumberFormat('en-US').format(exp)} XP\n`;

        setTimeout(function() {
            conn.reply(m.chat, pesan, m);
        }, MiliSecond);

        await updateEconomy(m.sender, { money: (player.money || 0) - coins, tiketcoin: (player.tiketcoin || 0) - 1 });
        await updateUser(m.sender, { exp: (player.exp || 0) - exp });
    }
}
handler.help = ["coinflip"];
handler.tags = ["rpg"];
handler.command = /^(coinflip|putarkoin)$/i;
module.exports = handler;

async function createSticker(img, url, wm, author, quality) {
    let stickerMetadata = {
        type: 'full',
        pack: wm,
        author: author,
        quality
    };
    return (new Sticker(img ? img : url, stickerMetadata)).toBuffer();
}