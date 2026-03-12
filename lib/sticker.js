const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fetch = require("node-fetch");
const { spawn } = require("child_process");
const { fromBuffer } = require("file-type");
const uploadImage = require("./uploadImage");
//const uploadFile = require('./uploadFile')
const tmp = path.join(__dirname, "../tmp");
/**
 * Image to Sticker
 * @param {Buffer} img Image Buffer
 * @param {String} url Image URL
 */
function sticker2(img, url) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url) {
        let res = await fetch(url);
        if (res.status !== 200) throw await res.text();
        img = await res.buffer();
      }
      let inp = path.join(tmp, +new Date() + ".jpeg");
      await fs.promises.writeFile(inp, img);
      let ff = spawn("ffmpeg", [
        "-y",
        "-i",
        inp,
        "-vf",
        "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
        "-f",
        "png",
        "-",
      ]);
      ff.on("error", reject);
      ff.on("close", async () => {
        await fs.promises.unlink(inp);
      });
      let bufs = [];
      const [_spawnprocess, ..._spawnargs] = [
        ...(module.exports.support.gm
          ? ["gm"]
          : module.exports.magick
          ? ["magick"]
          : []),
        "convert",
        "png:-",
        "webp:-",
      ];
      let im = spawn(_spawnprocess, _spawnargs);
      im.on("error", (e) => conn.reply(m.chat, util.format(e), m));
      im.stdout.on("data", (chunk) => bufs.push(chunk));
      ff.stdout.pipe(im.stdin);
      im.on("exit", () => {
        resolve(Buffer.concat(bufs));
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function canvas(code, type = "png", quality = 0.92) {
  let res = await fetch(
    "https://canvas.caliphapi.com/api/canvas?" +
      queryURL({
        type,
        quality,
      }),
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": code.length,
      },
      body: code,
    },
  );
  let image = await res.buffer();
  return image;
}

function queryURL(queries) {
  return new URLSearchParams(Object.entries(queries));
}

/**
 * Image to Sticker
 * @param {Buffer} img Image Buffer
 * @param {String} url Image URL
 */
async function sticker1(img, url) {
  url = url ? url : await uploadImage(img);
  let { mime } = url ? { mime: "image/jpeg" } : await fromBuffer(img);
  let sc = `let im = await loadImg('data:${mime};base64,'+(await window.loadToDataURI('${url}')))
c.width = c.height = 512
let max = Math.max(im.width, im.height)
let w = 512 * im.width / max
let h = 512 * im.height / max
ctx.drawImage(im, 256 - w / 2, 256 - h / 2, w, h)
`;
  return await canvas(sc, "webp");
}

/**
 * Image/Video to Sticker
 * @param {Buffer} img Image/Video Buffer
 * @param {String} url Image/Video URL
 * @param {String} packname EXIF Packname
 * @param {String} author EXIF Author
 */
async function sticker3(img, url, packname, author) {
  url = url ? url : await uploadImage(img);
  let res = await fetch(
    "https://api.xteam.xyz/sticker/wm?" +
      new URLSearchParams(
        Object.entries({
          url,
          packname,
          author,
        }),
      ),
  );
  return await res.buffer();
}

/**
 * Image to Sticker
 * @param {Buffer} img Image/Video Buffer
 * @param {String} url Image/Video URL
 */
function sticker4(img, url) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url) {
        let res = await fetch(url);
        if (res.status !== 200) throw await res.text();
        img = await res.buffer();
      }
      let inp = path.join(tmp, +new Date() + ".jpeg");
      let out = inp + ".webp";
      await fs.promises.writeFile(inp, img);
      spawn("ffmpeg", [
        "-y",
        "-i",
        inp,
        "-vf",
        "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
        out,
      ])
        .on("error", reject)
        .on("close", async () => {
          await fs.promises.unlink(inp);
          resolve(await fs.promises.readFile(out));
          await fs.promises.unlink(out);
        });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Add WhatsApp JSON Exif Metadata
 * Taken from https://github.com/pedroslopez/whatsapp-web.js/pull/527/files
 * @param {Buffer} webpSticker
 * @param {String} packname
 * @param {String} author
 * @param {String} categories
 * @param {Object} extra
 * @returns
 */
async function addExif(
  webpSticker,
  packname,
  author,
  categories = [""],
  extra = {},
) {
  const webp = require("node-webpmux"); // Optional Feature
  const img = new webp.Image();
  const stickerPackId = crypto.randomBytes(32).toString("hex");
  const json = {
    "sticker-pack-id": `RIKKA-BOT-` + stickerPackId,
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author,
    emojis: categories,
    ...extra,
  };
  let exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  let jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
  let exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  await img.loadBuffer(webpSticker);
  img.exif = exif;
  return await img.saveBuffer();
}

/*
 * Modifikasi:
 * 1. Mengubah parameter 'options' untuk menerima 'conn' dan 'msgToEdit' (yang dikirim oleh sticker-sticker.js)
 * 2. Menghapus variabel 'statusMessage' internal.
 * 3. Mengganti logika di dalam loop untuk HANYA meng-edit 'msgToEdit' yang sudah ada.
 * 4. Tidak lagi memerlukan 'm' sebagai parameter.
 */

function sticker_compress(img, options = {}) {
  return new Promise(async (resolve, reject) => {
    // --- PERUBAHAN 1: Ambil 'conn' dan 'msgToEdit' ---
    const { maxSize, conn, msgToEdit } = options;
    if (!maxSize) return reject('maxSize is required for sticker_compress');

    // Cek buffer
    // const { fromBuffer } = require("file-type");
    const { ext } = await fromBuffer(img) || {};
    if (!ext) return reject('Could not determine file type');

    let inp = path.join(tmp, `${Date.now()}.${ext}`);
    let out = path.join(tmp, `${Date.now()}.webp`);

    try {
      await fs.promises.writeFile(inp, img);

      // --- JIKA INI GAMBAR (bukan video) ---
      if (!['mp4', 'gif', 'mov', 'avi'].includes(ext)) {
        const ffmpegArgs = [
          "-y", "-i", inp,
          "-vf", "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
          "-q:v", "50", // Kualitas 50 (Skala 0=terburuk, 100=terbaik)
          out
        ];

        await new Promise((res, rej) => {
          spawn("ffmpeg", ffmpegArgs)
            .on("error", rej)
            .on("close", (code) => code === 0 ? res() : rej(`FFmpeg exited with code ${code}`));
        });

        const buffer = await fs.promises.readFile(out);
        return resolve(buffer);
      }

      // --- JIKA INI VIDEO (Loop Kompresi Adaptif) ---

      // Definisikan tingkatan kompresi (dari Kualitas TERBAIK ke TERBURUK)
      // q kecil = kualitas buruk (0=buruk, 100=baik)
      const settings = [
        { q: 50, fps: 20, log: 'Mencoba kompresi (50q, 20fps)...' },
        { q: 45, fps: 15, log: 'Masih terlalu besar. Mencoba (45q, 15fps)...' },
        { q: 40, fps: 12, log: 'Masih terlalu besar. Mencoba (40q, 12fps)...' },
        { q: 35, fps: 10, log: 'Masih terlalu besar. Mencoba (35q, 10fps)...' },
        { q: 30, fps: 8, log: 'Masih terlalu besar. Mencoba (30q, 8fps)...' },
        { q: 25, fps: 8, log: 'Masih terlalu besar. Mencoba (25q, 8fps)...' },
        { q: 15, fps: 8, log: 'Masih terlalu besar. Mencoba (15q, 8fps)...' },
        { q: 10, fps: 8, log: 'Masih terlalu besar. Mencoba (10q, 8fps)...' },
        { q: 8, fps: 8, log: 'Hampir Gagal. Usaha terakhir (8q, 8fps)...' }
      ];

      // --- PERUBAHAN 2: Hapus 'statusMessage' internal ---
      // (Variabel 'statusMessage' dihapus)

      for (let i = 0; i < settings.length; i++) {
        const { q, fps, log } = settings[i];

        // --- PERUBAHAN 3: Logika edit pesan ---
        // Cek jika 'conn' dan 'msgToEdit' (pesan yg akan di-edit) disediakan
        if (conn && msgToEdit) {
            try {
                // Langsung edit pesan yang dikirim dari sticker-sticker.js
                await conn.edit(msgToEdit.key.remoteJid, log, msgToEdit);
            } catch (e) {
                // Abaikan jika error (misal pesan terlalu lama), tapi log
                console.error("Gagal edit pesan status kompresi:", e);
            }
        }
        // --- Akhir Perubahan 3 ---

        if (fs.existsSync(out)) await fs.promises.unlink(out);

        const ffmpegArgs = [
          "-y", "-i", inp,
          "-vf", "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
          '-r', fps.toString(),      // Set FPS
          '-q:v', q.toString(),    // Set Kualitas Video (0=terburuk, 100=terbaik)
          out
        ];

        await new Promise((res, rej) => {
          spawn("ffmpeg", ffmpegArgs)
            .on("error", rej)
            .on("close", (code) => code === 0 ? res() : rej(`FFmpeg exited with code ${code}`));
        });

        if (!fs.existsSync(out)) {
          continue;
        }

        const stats = await fs.promises.stat(out);
        if (stats.size <= maxSize) {
          const buffer = await fs.promises.readFile(out);
          return resolve(buffer);
        }
      }

      // Pesan error jika semua gagal
      return reject(`Gagal mengompres video di bawah ${(maxSize / (1024 * 1024)).toFixed(2)} MB, bahkan pada kualitas terendah (8q).`);

    } catch (e) {
      return reject(e);
    } finally {
      if (fs.existsSync(inp)) await fs.promises.unlink(inp);
      if (fs.existsSync(out)) await fs.promises.unlink(out);
    }
  });
}

module.exports = {
  /**
   * Image/Video to Sticker
   * @param {Buffer} img Image/Video Buffer
   * @param {String} url Image/Video URL
   * @param {...String}
   */
  async sticker(img, url, ...args) {
    let lastError;
    for (let func of [
      this.support.ffmpeg && this.support.ffmpegWebp && sticker4,
      this.support.ffmpeg &&
        (this.support.convert || this.support.magick || this.support.gm) &&
        sticker2,
      sticker4,
    ].filter((f) => f)) {
      try {
        let stiker = await func(img, url, ...args);
        if (stiker.includes("RIFF")) {
          try {
            return await addExif(stiker, ...args);
          } catch (e) {
            return stiker;
          }
        }
        throw stiker.toString();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  },
  sticker1,
  sticker2,
  sticker3,
  sticker4,
  sticker_compress,
  addExif,
  support: {
    ffmpeg: true,
    ffprobe: true,
    ffmpegWebp: true,
    convert: true,
    magick: false,
    gm: false,
  },
};