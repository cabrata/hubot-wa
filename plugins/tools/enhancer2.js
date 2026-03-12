const Replicate = require("replicate");
const axios = require('axios');
const uploadFile = require('../../lib/uploadFile.js');
const uploadFile2 = require('../../lib/uploadUguu.js');
const uploadFile3 = require('../../lib/uploadFileIO.js');
const moment = require('moment-timezone');
global.authReplicate = process.env.REPLICATE_API_KEY ? process.env.REPLICATE_API_KEY.replace(/^r8_/, '') : 'your-replicate-api-key-here';
conn.enhanceSession = conn.enhanceSession || {};

// --- Helper Uploader Baru ---
const withTimeout = (promise, ms, errorMsg = 'Upload timeout') => {
    const timer = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timer]);
};

async function uploadMediaWithFallback(buffer, mimetype) {
  const UPLOAD_TIMEOUT = 5000;
  let url;
  
  let ext = 'bin';
  if (mimetype) {
    const parts = mimetype.split('/');
    if (parts.length === 2) {
      ext = parts[1];
      if (ext === 'jpeg') ext = 'jpg'; 
      if (ext === 'ogg; codecs=opus') ext = 'ogg';
    }
  }

  const uploaders = [
    { fn: () => uploadFile(buffer), name: 'uploadFile' },
    { fn: () => uploadFile2(buffer), name: 'uploadFile2' },
    { fn: () => uploadFile3(buffer, ext), name: 'uploadFile3' }
  ];

  let lastError = null;

  for (const uploader of uploaders) {
    try {
      console.log(`Mencoba uploader: ${uploader.name} (ext: ${ext})...`);
      url = await withTimeout(
        uploader.fn(),
        UPLOAD_TIMEOUT,
        `Timeout ${uploader.name}`
      );
      if (url) {
        console.log(`Berhasil dengan ${uploader.name}: ${url}`);
        lastError = null; 
        break; 
      }
    } catch (e) {
      console.warn(`Uploader ${uploader.name} gagal:`, e.message);
      lastError = e;
    }
  }

  if (!url || lastError) {
    throw lastError || new Error('Semua uploader gagal mendapatkan URL.');
  }

  return url;
}

// --- Helper Fungsi Inti Replicate ---
async function runReplicateTask(conn, m, { model, input, buffer, mime, captionDetails, fileSizeCheckMB = 20, fileNameSuffix = 'enhance' }) {
    const sender = m.sender;
    const startTime = Date.now();
    
    try {
        let wait = 'Please wait...';
        await m.reply(wait);
        conn.enhanceSession[sender] = true;

        // 1. Upload media menggunakan fungsi baru
        const mediaUrl = await uploadMediaWithFallback(buffer, mime);
        
        // 2. Tambahkan URL gambar ke input
        input.image = mediaUrl;

        // 3. Jalankan Replicate
        const replicate = new Replicate({ auth: `r8_${authReplicate}` });
        const output = await replicate.run(model, { input });
        
        // --- PERBAIKAN FINAL: Paksa konversi ke String Murni ---
        let rawOutput = Array.isArray(output) ? output[0] : output;
        let finalOutputUrl = '';
        
        if (typeof rawOutput === 'string') {
            finalOutputUrl = rawOutput;
        } else if (rawOutput && typeof rawOutput.url === 'function') {
            finalOutputUrl = String(rawOutput.url()); // Pastikan URL Object jadi String
        } else if (rawOutput && rawOutput.url) {
            finalOutputUrl = String(rawOutput.url); // Pastikan URL Object jadi String
        } else {
            finalOutputUrl = String(rawOutput); // Fallback mutlak ke String
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        // 4. Buat Caption
        let caption = `Success!
${captionDetails.map(d => `- *${d}*`).join('\n')}
- *Generated in: \`${duration}\` seconds*
- *Link:*
${finalOutputUrl}`.trim();

        // 5. Cek Ukuran File dan Ekstensi
        const response = await axios.head(finalOutputUrl);
        
        const fileSizeInBytes = parseInt(response.headers["content-length"] || "0", 10);
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
        
        const mimeType = response.headers["content-type"] || "image/jpeg";
        let ext = mimeType.split('/')[1] || "jpg";
        if (ext === "jpeg") ext = "jpg";

        // Buat nama file unik (sekarang split pasti aman karena sudah murni String)
        let fileNam = finalOutputUrl.split('/').pop().substring(0, 5) || "reslt";

        if (fileSizeInMB > fileSizeCheckMB) {
            return conn.sendMessage(
                m.chat,
                {
                    document: { url: finalOutputUrl },
                    fileName: `RPLCT-${moment.tz('Asia/Jakarta').format('YMMD')}-${fileNameSuffix}-${fileNam}-HuTao_BOT.${ext}`,
                    mimetype: mimeType,
                    caption: caption
                },
                { quoted: m }
            );
        } else {
            return conn.sendMessage(
                m.chat,
                { image: { url: finalOutputUrl }, caption: caption },
                { quoted: m }
            );
        }
    } catch (e) {
        if (e.message && e.message.includes('limit reached')) {
            throw 'Kode authentikasi tersebut sudah mencapai limit output, silahkan laporkan ke staff/admin.';
        } else {
            console.log(e);
            throw `Error!\n${e.message || e}`;
        }
    } finally {
        if (conn.enhanceSession && conn.enhanceSession[sender]) {
            delete conn.enhanceSession[sender];
        }
    }
}

// --- Handler Utama ---
let handler = async (m, { conn, text, usedPrefix, command, isROwner, isPrems }) => {
     let isMods = m.user[m.sender]?.moderator;
     let isPrem = isMods ? isMods : isPrems;
     if (!isPrem) throw 'Fitur ini khusus pengguna premium dan moderator!';
     
     const sender = m.sender;
     const allBots = [global.conn, ...(global.conns || [])];
     const activeEnhanceBot = allBots.find(c => c.enhanceSession?.[sender] && c !== conn);

     if (activeEnhanceBot) {
        const botJid = activeEnhanceBot.user?.jid;
        const botNumber = botJid?.split('@')[0];
        return conn.sendMessage(m.chat, {
            text: `⚠️ Kamu sedang menggunakan fitur Enhancer di bot lain (@${botNumber}). Tunggu hingga prosesnya selesai`,
            mentions: [botJid]
        }, { quoted: m });
     }
     
     let q = m.quoted ? m.quoted : m;
     if (!q) throw `Reply gambar atau kirim gambar menggunakan caption ${usedPrefix + command}`;
     let mime = (q.msg || q).mimetype || "";
     if (!/image/.test(mime)) throw 'Media harus berupa gambar!';
     let buffer = await q.download(); 

     const google = 'google-research/maxim:494ca4d578293b4b93945115601b6a38190519da18467556ca223d219c3af9f9';
     const modelEnhance = `nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa`;
     const modelRecolor = `piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695`;
     const modelDeblur = `codeslake/ifan-defocus-deblur:ea3b2e163e2ad629fb23e81a1cc9e485c32aa4a53eba4fe08b7dbdd39e6e381e`;
       
     const safeLower = v => (typeof v === 'string' ? v.toLowerCase() : '');

     try {
        if (/^(hd(r)?|enh(ance|ancer)?)2$/i.test(command)) {
            if (!text) throw `Cara penggunaan:\n\`${usedPrefix+command} scale face\`\nContoh:\n\`${usedPrefix+command} 2 false\``;
            let [scale, face]= text.split` `;
            face = safeLower(face);
            if (!scale || isNaN(scale)) throw "Masukkan jumlah scale (1-10)";
            scale = parseInt(scale); 
            if (!face || (face !== "true" && face !== "false")) throw "Masukkan face enhance (*\`true\`* atau *\`false\`*)";
            if (scale > 10) throw "Scale melebihi batas maksimal (10)";
            face = face == 'true' ? true : false;
            
            await runReplicateTask(conn, m, {
                model: modelEnhance,
                input: { scale: scale, face_enhance: face },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Scale: \`${scale}\``, `Face enhance: \`${face}\``],
                fileSizeCheckMB: 30,
                fileNameSuffix: `enhance${scale}${face}`
            });

        } else if (/^(colorize(r)?|recolor)2$/i.test(command)) {
            if (!text) throw `Cara penggunaan:\n\`${usedPrefix+command} size\`\nContoh:\n\`${usedPrefix+command} large\``;
            let size = safeLower(text);
            if (!size || (size !== "large" && size !== "tiny")) throw "Masukkan size (*\`tiny\`* atau *\`large\`*)";
            
            await runReplicateTask(conn, m, {
                model: modelRecolor,
                input: { model_size: size },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Size: \`${size}\``],
                fileSizeCheckMB: 20,
                fileNameSuffix: `recolor${size}`
            });

        } else if (/^de(blur|focus)$/i.test(command)) {
            await runReplicateTask(conn, m, {
                model: modelDeblur,
                input: {}, 
                buffer: buffer,
                mime: mime,
                captionDetails: [],
                fileNameSuffix: 'deblur'
            });

        } else if (/^un|de(blur|focus)2$/i.test(command)) {
            if (!text) throw `Cara penggunaan:\n\`${usedPrefix+command} model\`\nContoh:\n\`${usedPrefix+command} GoPro\``;
            let model = safeLower(text);
            const modelMap = {
                'gopro': 'Image Deblurring (GoPro)',
                'reds': 'Image Deblurring (REDS)',
                'real1': 'Image Deblurring (RealBlur_R)',
                'real2': 'Image Deblurring (RealBlur_J)'
            };
            if (!modelMap[model]) throw `Masukkan model!\n- *\`GoPro\`\n- *\`REDS\`\n- *\`Real1\`\n- *\`Real2\`*`;
            
            await runReplicateTask(conn, m, {
                model: google,
                input: { model: modelMap[model] },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Model: ${modelMap[model]}\``],
                fileNameSuffix: `deblur2-${model}`
            });

        } else if (/^remini2|(enh(ance|ancer)?3)$/i.test(command)) {
            if (!text) throw `Cara penggunaan:\n\`${usedPrefix+command} model\`\nContoh:\n\`${usedPrefix+command} night\``;
            let model = safeLower(text);
            const modelMap = {
                'night': 'Image Enhancement (Low-light)',
                'retouch': 'Image Enhancement (Retouching)'
            };
            if (!modelMap[model]) throw "Masukkan model! (*\`night\`* atau *\`retouch\`*)";

            await runReplicateTask(conn, m, {
                model: google,
                input: { model: modelMap[model] },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Model: \`${modelMap[model]}\``],
                fileNameSuffix: `remini-${model}`
            });

        } else if (/^denois(e|ing)$/i.test(command)) {
            await runReplicateTask(conn, m, {
                model: google,
                input: { model: 'Image Denoising' },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Model: \`Image Denoising\``],
                fileNameSuffix: 'denoise'
            });

        } else if (/^derain(ing)?$/i.test(command)) {
            if (!text) throw `Cara penggunaan:\n\`${usedPrefix+command} model\`\nContoh:\n\`${usedPrefix+command} drop\``;
            let model = safeLower(text);
            const modelMap = {
                'streak': 'Image Deraining (Rain streak)',
                'drop': 'Image Deraining (Rain drop)'
            };
            if (!modelMap[model]) throw "Masukkan model! (*\`streak\`* atau *\`drop\`*)";

            await runReplicateTask(conn, m, {
                model: google,
                input: { model: modelMap[model] },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Model: \`${modelMap[model]}\``],
                fileNameSuffix: `derain-${model}`
            });

        } else if (/^dehaz(e|ing)$/i.test(command)) {
            if (!text) throw `Cara penggunaan:\n\`${usedPrefix+command} model\`\nContoh:\n\`${usedPrefix+command} Indoor\``;
            let model = safeLower(text);
            const modelMap = {
                'indoor': 'Image Dehazing (Indoor)',
                'outdoor': 'Image Dehazing (Outdoor)'
            };
            if (!modelMap[model]) throw "Masukkan model! (*`\`indoor`\`* atau *\`outdoor\`*)";

            await runReplicateTask(conn, m, {
                model: google,
                input: { model: modelMap[model] },
                buffer: buffer,
                mime: mime,
                captionDetails: [`Model: \`${modelMap[model]}\``],
                fileNameSuffix: `dehaze-${model}`
            });
        }
    } catch (e) {
        m.reply(e.toString());
    }
};

handler.help = ["hd2", "remini2", "colorize2", "deblur", "deblur2", "denoise", "dehaze", "deraining"];
handler.tags = ["prem"];
handler.command = /^(remini2|(hd(r)?|enh(ance|ancer)?)(2|3)|colorize(r)?2|recolor2|(un|de)(blur|focus)2|de(blur|focus)|denois(e|ing)|dehaz(e|ing)|derain(ing)?)$/i;
handler.register = true;

module.exports = handler;
