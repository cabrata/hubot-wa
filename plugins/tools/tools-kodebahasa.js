const { languageListDom, languageListIntl } = require('../../lib/langlist.js')

let handler = async (m, { conn }) => {
  const indonesianLang = Object.entries(languageListDom)
    .map(([code, name]) => `*${code}* - ${name}`)
    .join('\n');

  const intlLang = Object.entries(languageListIntl)
    .map(([code, name]) => `*${code}* - ${name}`)
    .join('\n');

  return conn.sendMessage(m.chat, {
    text: `Daftar bahasa yang tersedia:\n\n*Indonesian Languages:*\n${indonesianLang}\n\n*International Languages:*\n${intlLang}`,
    quoted: m
  });
};
handler.help = ['kodebahasa']
handler.tags = ['internet']
handler.command = /^(kodebahasa|kode-bahasa)$/i

module.exports = handler
