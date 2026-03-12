const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

/**
 * Upload epheremal file to file.io
 * `Expired in 1 day`
 * `100MB Max Filesize`
 * @param {Buffer} buffer File Buffer
 */
const fileIO = async (buffer) => {
  const { ext } = await fromBuffer(buffer) || {};
  const form = new FormData();
  form.append('file', buffer, `tmp.${ext}`);
  const res = await fetch('https://hutaofiles.caliph.dev/upload', { 
    method: 'POST',
    body: form
  });
  const json = await res.json();
  if (!json.success) throw json;
  return json.url;
};

/**
 * Upload file to https://file.botcahx.eu.org/
 * @returns {string|null|(string|null)[]}
 */
const api = async (buffer) => {
  let { ext } = await fromBuffer(buffer);
  let bodyForm = new FormData();
  bodyForm.append("file", buffer, "file." + ext);
  let res = await fetch("https://filezone-api.caliph.dev/upload", {
    method: "post",
    body: bodyForm,
  });
  let data = await res.json();
  let resultUrl = data.result ? data.result.url_file : '';
  return resultUrl;
}

module.exports = fileIO