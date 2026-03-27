let handler = async (m, { args, text, usedPrefix }) => {
  if (m.isGroup) return;

  // Menggunakan memory lokal (RAM) yang sama dengan addprofile
  global.carpasProfileState = global.carpasProfileState || {};
  const st = global.carpasProfileState[m.sender];

  if (!st || st.step !== 'awaiting_gender') {
    return m.reply(`Kamu belum mulai. Ketik ${usedPrefix}addprofile dulu ya.`);
  }

  const raw = (args[0] || text || '').trim().toLowerCase();
  if (!['lk', 'pr', 'l', 'p'].includes(raw)) {
    return m.reply(`Format salah. Ketik: ${usedPrefix}gender lk atau ${usedPrefix}gender pr`);
  }

  const g = raw.startsWith('l') ? 'lk' : 'pr';
  
  st.profile = st.profile || {};
  st.profile.gender = g;
  st.step = 'catatan'; // Lanjut ke step pengisian catatan
  
  // Update state di memori
  global.carpasProfileState[m.sender] = st;

  return m.reply(`💬 Gender berhasil diatur: ${g === 'lk' ? 'Laki-laki' : 'Perempuan'}\n\nSekarang kirim catatan singkat (5–150 karakter) untuk profil kamu.`);
}

handler.command = /^gender$/i;
handler.private = true;

module.exports = handler;
