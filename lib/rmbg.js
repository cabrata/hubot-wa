const axios = require('axios');
const FormData = require('form-data');
const { randomUUID } = require('crypto');
const fileType = require('file-type');

/**
 * Kirim buffer gambar ke endpoint remove-bg dengan deteksi filetype otomatis
 * @param {Buffer} buffer - Buffer gambar
 * @returns {Promise<object>} - Respons dari server
 */
async function sendImageBuffer(buffer) {
  const type = await fileType.fromBuffer(buffer);
  
  if (!type || !type.mime.startsWith('image/')) {
    throw new Error('File yang dikirim bukan gambar.');
  }

  const randomFilename = `${randomUUID()}.${type.ext}`;

  const form = new FormData();
  form.append('file', buffer, {
    filename: randomFilename,
    contentType: type.mime
  });

  try {
    const response = await axios.post('http://eu2-node.caliphdev.com:8000/remove-bg', form, {
      headers: {
        ...form.getHeaders(),
        'accept': 'application/json'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    return response.data;
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = sendImageBuffer;