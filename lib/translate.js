const fetch = require('node-fetch');

async function translate(text, lang) {
  if (!text.trim() || !lang) return '';

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.append('client', 'gtx');
  url.searchParams.append('sl', 'auto');
  url.searchParams.append('dt', 't');
  url.searchParams.append('tl', lang);
  url.searchParams.append('q', text);

  try {
    const response = await fetch(url.href);
    const data = await response.json();

    if (data && Array.isArray(data[0])) {
      const translation = data[0].map((item) => item[0].trim()).join('\n');
      return { translation, lang: lang, originalText: text };
    }
    return '';
  } catch (error) {
    console.error('Error translating text:', error);
    throw error;
  }
}

module.exports = { translate };