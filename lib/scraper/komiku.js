// lib/komikuCore.js
const axios = require('axios');
const sharp = require('sharp');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const API_BASE = 'http://weebs.caliph.dev/api/komiku/';
const http = axios.create({ timeout: 30000 });

// ===== HTTP =====
async function getJSON(url){ const { data } = await http.get(url); return data; }
async function getBuffer(url, retries=3){
  for (let i=0;i<retries;i++){
    try { const { data } = await http.get(url, { responseType:'arraybuffer' }); return Buffer.from(data); }
    catch(e){ if(i===retries-1) throw e; await new Promise(r=>setTimeout(r, 800*(i+1))); }
  }
}

// ===== Image fit & PDF =====
function fitA4(w,h){
  const A4={w:595.28,h:841.89};
  const s=Math.min(A4.w/w, A4.h/h);
  const nw=w*s, nh=h*s;
  return {A4,x:(A4.w-nw)/2,y:(A4.h-nh)/2,w:nw,h:nh};
}

// Konversi apapun (WEBP/PNG/JPG) -> JPEG terkompres utk PDF (hemat ukuran)
async function toJpegForPdf(buffer, { maxWidth=1440, quality=80 } = {}){
  let img = sharp(buffer, { limitInputPixels:false }).rotate(); // auto-orient
  const meta = await img.metadata();
  const width  = meta.width  || 1200;
  const height = meta.height || 1800;
  const scaleW = width > maxWidth ? maxWidth : width;
  img = img.resize({ width: scaleW, withoutEnlargement:true });
  const jpegBuffer = await img.jpeg({ quality, chromaSubsampling: '4:2:0', mozjpeg:true }).toBuffer();
  const { width: w2, height: h2 } = await sharp(jpegBuffer).metadata();
  return { jpegBuffer, width: w2 || scaleW, height: h2 || Math.round(height * (scaleW/width)) };
}

async function buildChapterPDF(imageUrls, meta={}){
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let i=0;
  for (const u of imageUrls) {
    i++;
    const raw = await getBuffer(u);
    const { jpegBuffer, width, height } = await toJpegForPdf(raw);
    const img = await pdf.embedJpg(jpegBuffer);
    const { A4,x,y,w,h } = fitA4(width, height);
    const page = pdf.addPage([A4.w, A4.h]);
    page.drawImage(img, { x,y,width:w,height:h });
    page.drawText(`${meta.title||'Komiku'} • Ch ${meta.chapter||'?'} • ${i}/${imageUrls.length}`, {
      x:24, y:18, size:9, font, opacity:.7
    });
  }
  return Buffer.from(await pdf.save());
}

function slugify(s){
  return String(s).normalize('NFKD').replace(/[^\w\s.-]/g,'').trim().replace(/\s+/g,' ').replace(/\s/g,'_').slice(0,120);
}

// ===== API =====
async function searchKomiku(q,page=1){ return await getJSON(`${API_BASE}?s=${encodeURIComponent(q)}${page>1?`&page=${page}`:''}`); }
async function getMangaDetail(param){ return await getJSON(`${API_BASE}/${param}`); }
async function getChapterImages(param){ return await getJSON(`${API_BASE}/chapter/${param}`); }

// ===== UI RENDER =====
function renderSearchList(query, res){
  const arr = res.data || [];
  if(!arr.length) return `Tidak ada hasil untuk "*${query}*". Coba kata kunci lain.`;
  let out = `Hasil untuk: *${query}*\nBalas *angka* untuk memilih.\n`;
  out += arr.map((v,i)=>`${i+1}. ${v.title}\n   ${v.latest_chapter||''} • ${v.description||''}`).join('\n');
  out += `\n\nBalas *next* / *prev* untuk navigasi halaman. (Harus *reply* pesan ini)`;
  return out;
}

// TANPA nomor urut — user akan balas *nomor chapter asli* saja
function renderChapterListAll_NoIndex(detail){
  const list = detail.data?.chapters || [];
  if(!list.length) return `Chapter tidak ditemukan.`;
  let out = `*${detail.data?.title}*\n` +
            `Balas dengan *nomor chapter asli* (cth: 61 / 60.5)\n` +
            `Total chapter: ${list.length}\n\n`;
  out += list.map(c=>`• Chapter ${c.chapter} • ${c.release}`).join('\n');
  return out;
}

// Kirim teks panjang dipotong per ~3500 char
async function sendLongText(conn, chatId, text, quoted){
  const limit = 3500;
  if (text.length <= limit) {
    const sent = await conn.sendMessage(chatId, { text }, { quoted });
    return [sent];
  }
  const parts = [];
  for (let i=0;i<text.length;i+=limit) parts.push(text.slice(i, i+limit));
  const messages = [];
  for (let idx=0; idx<parts.length; idx++){
    const sent = await conn.sendMessage(chatId, { text: parts[idx] }, { quoted });
    messages.push(sent);
    quoted = null;
  }
  return messages;
}

// Kirim PDF dengan fallback handling ukuran
async function sendPdfDoc(conn, m, buf, filename, caption){
  // hint length (beberapa versi Baileys lebih stabil jika ada fileLength)
  const msg = {
    document: buf,
    fileName: filename,
    mimeType: 'application/pdf',
    fileLength: buf.length,
    caption
  };
  try {
    return await conn.sendMessage(m.chat, msg, { quoted: m });
  } catch (e) {
    // Fallback: coba kirim tanpa caption
    try {
      delete msg.caption;
      return await conn.sendMessage(m.chat, msg, { quoted: m });
    } catch (e2) {
      throw e2;
    }
  }
}

async function downloadAndSend(conn, m, state, chapterItem){
  await m.reply(global.wait || 'Mengunduh gambar chapter & menyusun PDF…');
  const imgs = await getChapterImages(chapterItem.detail_url.split("/").pop());
  const urls = imgs?.data?.images || [];
  if (!Array.isArray(urls) || urls.length===0) {
    const err = imgs?.error?.error || 'Gambar chapter tidak tersedia.';
    throw new Error(err);
  }
  const title = state.detail?.data?.title || state.picked?.title || 'Komiku';
  const pdfBuf = await buildChapterPDF(urls, { title, chapter: chapterItem.chapter });
  const caption =
    `*Title*: ${title}\n` +
    `*Chapter*: ${chapterItem.chapter}\n` +
    `*Pages*: ${urls.length}\n` +
    `Source: ${state.picked?.detail_url || ''}`;

  await sendPdfDoc(conn, m, pdfBuf, `${slugify(title)} - Ch ${chapterItem.chapter}.pdf`, caption);
  state.step = 'pick_chapter';
  return true;
}

module.exports = {
  searchKomiku, getMangaDetail, getChapterImages,
  renderSearchList, renderChapterListAll_NoIndex,
  downloadAndSend, slugify, sendLongText
};
