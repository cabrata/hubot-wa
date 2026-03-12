const axios = require("axios")
const FormData = require("form-data")

/**
 * Upload file buffer ke file.io
 * @param {Buffer} buffer - buffer dari file
 * @param {String} ext - ekstensi file, default jpg
 * @returns {Promise<String>} - URL hasil upload
 */
async function uploadFile(buffer, ext = "jpg") {
  try {
    let form = new FormData()
    form.append("file", buffer, `file.${ext}`)

    let res = await axios.post("https://file.io", form, {
      headers: form.getHeaders(),
    })

    if (res.data && res.data.link) {
      return res.data.link
    } else {
      throw new Error("Gagal upload file!")
    }
  } catch (e) {
    console.error("Upload gagal:", e.response?.data || e.message)
    throw e
  }
}

module.exports = uploadFile