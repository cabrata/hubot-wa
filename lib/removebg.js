const axios = require('axios');
const FormData = require('form-data');
const { randomUUID } = require('crypto');
const fileType = require('file-type');

/**
 * Kirim buffer gambar dan terima hasil dalam bentuk buffer (image)
 * @param {Buffer} buffer - Buffer gambar input
 * @returns {Promise<{ data: Buffer, contentType: string }>} - Buffer hasil dan tipe MIME
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
    const response = await axios.post(
      'http://eu2-node.caliphdev.com:8000/remove-bg',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'accept': 'image/*' // atau sesuaikan dengan yang dikembalikan oleh server
        },
        responseType: 'arraybuffer', // penting agar response berupa buffer
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    return {
      data: Buffer.from(response.data),
      contentType: response.headers['content-type']
    };
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = sendImageBuffer;