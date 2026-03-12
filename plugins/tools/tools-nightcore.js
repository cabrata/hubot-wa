const { exec } = require("child_process");
const fs = require("fs");
const { toAudio } = require("../../lib/converter");

async function handler(m, { conn, usedPrefix, command, text: q }) {
    qu = m.quoted ? m.quoted : m;
        mime = (m.quoted ? m.quoted : m.msg).mimetype || "";
        if (!/video|audio/.test(mime))
          throw `Balas video atau audio yang ingin ditambah efek nightcore dengan perintah *${usedPrefix + command}*`;
        await m.reply("Please wait... downloading");
        let dd = Date.now();
        let temp = `./tmp/${dd}-${m.sender.split("@")[0]}.mp3`;
        let tempres = `./tmp/${dd}-${m.sender.split("@")[0]}-after.mp3`;
        media = await qu.download();
        audio = await toAudio(media, "mp3");
        await fs.writeFileSync(temp, audio);
        await m.reply("Please wait... converting");
        exec(`sox '${temp}' '${tempres}' speed 1.2`, async (err) => {
          if (err || !fs.existsSync(tempres))
            return m.reply("Error! please report to admin bot!");
          await conn.sendMessage(
            m.chat,
            {
              audio: { url: tempres },
              mimetype: "audio/mpeg",
            },
            {
              quoted: m,
            },
          );
          if (fs.existsSync(temp)) await fs.promises.unlink(temp);
          if (fs.existsSync(tempres)) await fs.promises.unlink(tempres);
        });
        
}
handler.help = ['nightcore']
handler.tags = ['tools']
handler.command = /^(nightcore)$/i

module.exports = handler