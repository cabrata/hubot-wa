const SpeakEngine = require("google-tts-api");

let handler = async (m, { conn, args, text }) => {
  conn.sendMessage(m.chat, { react: { text: "⌛", key: m.key } });

  if (!args[0]) return m.reply("Please give me a text so that I can speak it!");

  let texttosay = text
    ? text
    : m.quoted && m.quoted.text
      ? m.quoted.text
      : m.text;

  const texttospeechurl = SpeakEngine.getAudioUrl(texttosay, { lang: "id", slow: false });

  conn.sendMessage(m.chat, {
    audio: { url: texttospeechurl },
    mimetype: "audio/mpeg",
    fileName: `A17SpeechEngine.mp3`,
  }, { quoted: m });
};

handler.help = ["tts"];
handler.tags = ["spund"];
handler.command = /^(tts)$/i;

module.exports = handler;