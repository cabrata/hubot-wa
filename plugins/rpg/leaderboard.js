//rpg-leadeeboard
const { db, getUser } = require('../../lib/database')

let handler = async (m, { conn, args, text }) => {
  if (!text) return conn.reply(m.chat, `🚩 Gunakan: .leaderboard <type> [jumlah]\nContoh: .leaderboard money 15`, m);
  
  const validTypes = ['exp', 'limit', 'level', 'money', 'diamond', 'bank'];
  const type = (args[0] || 'exp').toLowerCase();
  
  if (!validTypes.includes(type)) {
    return conn.reply(m.chat, `🚩 Gunakan: .leaderboard <${validTypes.join('|')}> [jumlah]\nContoh: .leaderboard money 15`, m);
  }

  const limit = Math.min(100, Math.max(5, parseInt(args[1]) || 10));

  // Tentukan kolom mana yang mau diurutkan berdasarkan tabelnya
  let orderByQuery = {}
  if (['exp', 'level'].includes(type)) {
      orderByQuery[type] = 'desc' // Tabel utama User
  } else {
      orderByQuery['economy'] = { [type]: 'desc' } // Tabel relasi Economy
  }

  try {
      // Ambil data langsung dari SQL yang sudah diurutkan
      let topUsers = await db.user.findMany({
          where: { registered: true },
          orderBy: orderByQuery,
          take: limit,
          include: { economy: true }
      });

      // Cari peringkat kamu (Ini butuh count, karena nggak semua data ditarik)
      let yourTotal = await db.user.count({ where: { registered: true } });
      
      let ranked = topUsers.map((u, i) => {
          let value = ['exp', 'level'].includes(type) ? u[type] : u.economy?.[type] || 0;
          let name = u.name || u.jid.split('@')[0];
          return `${i + 1}. *\`${name}\`* - ${formatValue(type, value)}`;
      }).join('\n');

      let result = `• *Leaderboard ${type.toUpperCase()} Top ${limit}* •\nTotal Player: *${yourTotal}*\n\n${ranked}`;

      conn.reply(m.chat, result, m, { contextInfo: { mentionedJid: [] } });
  } catch (error) {
      console.error(error)
      conn.reply(m.chat, 'Gagal memuat leaderboard.', m)
  }
};

handler.help = ['leaderboard <exp|limit|level|money|diamond|bank> [jumlah]'];
handler.tags = ['info'];
handler.command = /^(leaderboard|lb)$/i;
module.exports = handler;

function formatValue(type, value) {
  if (type === 'money' || type === 'bank') return `Rp.${value.toLocaleString()}`;
  if (type === 'exp') return `${value} XP`;
  if (type === 'level') return `Level ${value}`;
  if (type === 'limit') return `${value} Limit`;
  if (type === 'diamond') return `${value} 💎`;
  return value;
}