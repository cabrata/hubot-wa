const axios = require("axios")
const FormData = require("form-data")

/**
 * Upload file buffer ke uguu.se
 * @param {Buffer} buffer - buffer dari file
 * @param {String} ext - ekstensi file, default jpg
 * @returns {Promise<String>} - URL hasil upload
 */
async function uploadFile(buffer, ext = "jpg") {
  try {
    let form = new FormData()
    form.append("files[]", buffer, `file.${ext}`)

    let res = await axios.post("https://uguu.se/upload.php", form, {
      headers: form.getHeaders(),
    })

    if (res.data && res.data.files && res.data.files[0] && res.data.files[0].url) {
      return res.data.files[0].url
    } else {
      throw new Error("Gagal upload file!")
    }
  } catch (e) {
    console.error("Upload gagal:", e)
    throw e
  }
}

module.exports = uploadFile