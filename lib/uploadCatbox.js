const axios = require("axios");
const FormData = require("form-data");

/**
 * Upload file ke Catbox.moe
 * @param {Buffer} buffer - Buffer file
 * @returns {Promise<String>} - URL file
 */
async function uploadCatbox(buffer) {
  try {
    let form = new FormData();
    form.append("reqtype", "fileupload");
    // 'file' adalah nama field standar, Catbox akan mendeteksi tipe filenya
    form.append("fileToUpload", buffer, "file");

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    // Catbox mengembalikan URL langsung (string) jika sukses
    if (res.status === 200 && res.data.startsWith('http')) {
      return res.data;
    } else {
      // Jika gagal, Catbox mengembalikan pesan error (string)
      throw new Error(res.data || "Gagal upload ke Catbox");
    }
  } catch (e) {
    const errorMsg = e.response?.data || e.message;
    console.error("Upload Catbox gagal:", errorMsg);
    return `[UPLOAD CATBOX GAGAL] ${errorMsg}`;
  }
}

module.exports = uploadCatbox;