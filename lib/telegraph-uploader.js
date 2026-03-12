const { fromBuffer } = require('file-type');
const { default: axios } = require('axios');
const FormData = require('form-data');

module.exports = async (buffer) => {
  let { ext } = await fromBuffer(buffer);
  let form = new FormData();
  form.append('file', buffer, 'file.' + ext);
  let res = await axios.post('https://telegra.ph/upload', form, {
    headers: form.getHeaders()
  });
  return 'https://telegra.ph' + res.data[0].src;
};