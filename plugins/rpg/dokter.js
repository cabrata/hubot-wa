//rpg-dokter
const { getUser, updateEconomy } = require('../../lib/database')

const STATES = {
  IDLE: 0,
  SEARCHING: 1,
  TREATING: 2,
};

// Pilihan tindakan medis
const ACTIONS = ["beriobat", "rawat", "suntik", "operasi"];

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const sender = m.sender;
  const user = await getUser(sender);
  if (!user) return;

  conn.dokterSesi = conn.dokterSesi || {};
  // Session disimpan di memory sementara biar gak menuhin database
  const player = conn.dokterSesi[sender] || { Balance: 0, Pasien_Sembuh: 0, Waktu_Sembuh: 0, Lv: 1, State: STATES.IDLE };

  if (command === "dokter") {
    if (args.length === 0) {
      return conn.reply(m.chat, "*👨‍⚕ Cara Bermain Game Dokter Dan Pasien 👨‍⚕*\n\n" +
        "🔍 Gunakan perintah *.dokter cari* untuk mencari pasien.\n" +
        "🚑 Anda akan menemukan pasien dengan penyakit tertentu.\n" +
        "💉 Pilih tindakan dari: *beriobat, rawat, suntik, operasi*.\n" +
        "🔍 Contoh: *.dokter suntik* untuk menyembuhkan.\n" +
        "💰 Anda akan mendapatkan honor (balance) yang ditampung sementara.\n" +
        "🛑 Gunakan perintah *.dokter stop* untuk mencairkan balance ke uang/money Anda.\n" +
        "🏆 Cek peringkat Anda dengan perintah *.dokter leaderboard*.\n" +
        "ℹ️ Gunakan *.dokter status* untuk melihat status saat ini.", m);
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === "cari") {
      if (player.State !== STATES.IDLE) {
        return conn.reply(m.chat, "*🔍 Selesaikan dulu urusan dengan pasienmu yang sekarang!*", m);
      }

      if (Date.now() - player.Waktu_Sembuh < 10000) {
        return conn.reply(m.chat, "*⏱️ Anda sedang beristirahat sebentar, tunggu beberapa detik lagi.*", m);
      }

      player.State = STATES.TREATING;
      player.Waktu_Sembuh = Date.now();
      player.Lv = Math.floor(Math.random() * 3) + 1; // Level kritis 1-3

      // Menentukan tindakan yang TEPAT secara acak
      const reqAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      player.ReqAction = reqAction;

      conn.reply(m.chat, `*🔍 Anda menemukan pasien kritis Level ${player.Lv}!* \n\nCatatan Medis menunjukkan pasien butuh tindakan: *${reqAction.toUpperCase()}*.\nKetik *.dokter ${reqAction}* untuk mengobatinya!`, m);

    } else if (subCommand === "status") {
      conn.reply(m.chat, `*👨‍⚕ Status Dokter 👨‍⚕*\n\n🔍 Sedang Merawat Pasien: ${player.State === STATES.TREATING ? "Ya" : "Tidak"}\n🚑 Pasien Sembuh Sesi Ini: ${player.Pasien_Sembuh}\n💰 Honor Tertunda: Rp${player.Balance.toLocaleString()}\n🏆 Level Penanganan Terakhir: ${player.Lv}`, m);
    
    } else if (subCommand === "leaderboard") {
      const leaderboard = Object.entries(conn.dokterSesi)
        .map(([playerId, playerData]) => ({ id: playerId, Pasien_Sembuh: playerData.Pasien_Sembuh }))
        .sort((a, b) => b.Pasien_Sembuh - a.Pasien_Sembuh)
        .slice(0, 5); 

      let leaderboardMsg = "*🏆 Leaderboard Praktik 🏆*\n\n";
      for (let i = 0; i < leaderboard.length; i++) {
        leaderboardMsg += `${i + 1}. @${leaderboard[i].id.split("@")[0]} - ${leaderboard[i].Pasien_Sembuh} Pasien Sembuh\n`;
      }
      conn.reply(m.chat, leaderboardMsg, m, { contextInfo: { mentionedJid: leaderboard.map(l => l.id) } });
    
    } else if (subCommand === "stop") {
      if (player.Balance === 0) return m.reply("Balance honor kamu masih Rp0. Cari dan sembuhkan pasien dulu!");
      
      // Cairkan honor ke money utama
      await updateEconomy(sender, { money: (user.money || 0) + player.Balance });
      
      let skorMsg = `*🏆 Sesi Praktik Selesai 🏆*\n\n🚑 Pasien Disembuhkan: ${player.Pasien_Sembuh}\n💰 Total Honor Dicairkan: Rp${player.Balance.toLocaleString()}`;
      conn.reply(m.chat, skorMsg, m);
      
      // Reset player sesi
      player.Balance = 0;
      player.Pasien_Sembuh = 0;
      player.State = STATES.IDLE;
      player.ReqAction = undefined;

    } else if (ACTIONS.includes(subCommand)) {
      if (player.State !== STATES.TREATING) {
        return conn.reply(m.chat, "*🔍 Anda belum menemukan pasien. Ketik '.dokter cari' dulu.*", m);
      }

      if (subCommand === player.ReqAction) {
        let reward = player.Lv * 3500;
        player.Pasien_Sembuh++;
        player.Balance += reward;

        conn.reply(m.chat, `*✅ Sukses! Pasien sembuh.* \n\nAnda mendapat honor Rp${reward.toLocaleString()}.\nHonor Tertunda Anda: Rp${player.Balance.toLocaleString()}.\n\n*(Ketik .dokter stop untuk mencairkan honor)*`, m);
      } else {
        conn.reply(m.chat, `*❌ MALPRAKTIK!* \nAnda malah melakukan *${subCommand.toUpperCase()}*, pasiennya tambah parah dan dibawa ke RS lain!`, m);
      }

      player.State = STATES.IDLE;
      player.ReqAction = undefined;
    } else {
       conn.reply(m.chat, "*⚠️ Tindakan tidak valid! Pilih: beriobat, rawat, suntik, operasi.*", m);
    }

    conn.dokterSesi[sender] = player;
  }
};

handler.help = ["dokter"];
handler.tags = ["rpg"];
handler.group = true;
handler.command = ["dokter"];

module.exports = handler;