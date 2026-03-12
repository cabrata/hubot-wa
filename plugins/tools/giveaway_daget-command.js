const giveaway = require('./giveaway_daget.js'); // Pastikan nama file dan foldernya sama dengan yang di atas

let handler = async (m, { conn, args, command, isROwner }) => {
  // Jalankan fungsi auto bersih-bersih di latar belakang setiap kali command ini dipanggil
  giveaway.autoCleanupClosedExpired();

  const subcommand = args[0]?.toLowerCase();
  const remainingArgs = args.slice(1);

  if (command === 'giveaway') {
    if (!subcommand) return m.reply('📌 *Panduan Giveaway:*\n\n.giveaway start <item> <jumlah> <peserta>\n.giveaway join <kode>\n.giveaway end <kode>\n.giveaway check <kode>\n.giveaway delete <kode>');

    switch (subcommand) {
      case 'start':
        return giveaway.giveawayStart(m, { conn, args: remainingArgs });
      case 'join':
        return giveaway.giveawayJoin(m, { conn, args: remainingArgs });
      case 'end':
        return giveaway.giveawayEnd(m, { conn, args: remainingArgs });
      case 'check':
        return giveaway.giveawayCheck(m, { args: remainingArgs });
      case 'delete':
        return giveaway.giveawayDelete(m, { args: remainingArgs });
      default:
        return m.reply('🔁 Subcommand tidak dikenal.\nGunakan: start, join, end, check, atau delete.');
    }
  }

  if (command === 'daget') {
    if (!subcommand) return m.reply('📌 *Panduan Dana Kaget:*\n\n.daget start <item> <total_jumlah> <peserta>\n.daget claim <kode>\n.daget check <kode>');

    switch (subcommand) {
      case 'start':
        return giveaway.dagetStart(m, { conn, isROwner, args: remainingArgs });
      case 'claim':
        return giveaway.dagetClaim(m, { conn, args: remainingArgs });
      case 'check':
        return giveaway.dagetCheck(m, { args: remainingArgs });
      default:
        return m.reply('🔁 Subcommand tidak dikenal.\nGunakan: start, claim, atau check.');
    }
  }
};

handler.help = ['giveaway', 'daget'];
handler.tags = ['rpg'];
handler.command = /^(giveaway|daget)$/i;
handler.group = false;

module.exports = handler;
