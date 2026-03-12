const { getUser, updateEconomy } = require('../../lib/database')

const STATES = {
  IDLE: 0,
  SEARCHING: 1,
  FIGHTING: 2,
};

const ACTIONS = ["kejar", "tembak", "lempar", "tangkap"];

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const sender = m.sender;
  const user = await getUser(sender);
  if (!user) return;

  if (user.job !== 'polisi') {
      return m.reply("❌ Kamu bukan polisi! Hanya polisi yang bisa menjalankan tugas ini.");
  }

  conn.polisiSesi = conn.polisiSesi || {};
  const player = conn.polisiSesi[sender] || { Balance: 0, Pencuri_Tertangkap: 0, Waktu_Mulai: 0, Lv: 1, State: STATES.IDLE };

  if (command === "polisi") {
    if (args.length === 0) {
      return conn.reply(m.chat, "*👮‍♂️ Cara Bermain Game Polisi dan Pencuri 👮‍♂️*\n\n" +
        "🔍 Gunakan perintah *.polisi cari* untuk mendeteksi pencuri.\n" +
        "🚓 Anda akan menemukan jejak buronan dan menerima instruksi tindakan.\n" +
        "🚨 Pilih tindakan dari: *kejar, tembak, lempar, tangkap*.\n" +
        "🔍 Contoh: *.polisi tembak* untuk melumpuhkan target.\n" +
        "💰 Anda akan mendapat honor.\n" +
        "🛑 Gunakan perintah *.polisi stop* untuk mencairkan honor ke money Anda.", m);
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === "cari") {
      if (player.State !== STATES.IDLE) {
        return conn.reply(m.chat, "*🔍 Selesaikan dulu pengejaran buronanmu yang sekarang!*", m);
      }

      if (Date.now() - player.Waktu_Mulai < 10000) {
        return conn.reply(m.chat, "*⏱️ Anda sedang beristirahat sebentar, tunggu beberapa detik lagi.*", m);
      }

      player.State = STATES.FIGHTING;
      player.Waktu_Mulai = Date.now();
      player.Lv = Math.floor(Math.random() * 3) + 1; // Buronan Level 1-3

      const reqAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      player.ReqAction = reqAction;

      conn.reply(m.chat, `*🚨 Deteksi Buronan Pencuri Level ${player.Lv}!* \n\nInstruksi atasan: Lakukan tindakan *${reqAction.toUpperCase()}*.\nKetik *.polisi ${reqAction}* sekarang juga!`, m);

    } else if (subCommand === "stop") {
      if (player.Balance === 0) return m.reply("Honor tangkapanmu masih Rp0. Tangkap pencuri dulu!");
      
      // Pencairan Gaji
      await updateEconomy(sender, { money: (user.money || 0) + player.Balance });
      
      let skorMsg = `*🏆 Shift Polisi Selesai 🏆*\n\n🚓 Buronan Tertangkap: ${player.Pencuri_Tertangkap}\n💰 Total Honor Dicairkan: Rp${player.Balance.toLocaleString()}`;
      conn.reply(m.chat, skorMsg, m);
      
      player.Balance = 0;
      player.Pencuri_Tertangkap = 0;
      player.State = STATES.IDLE;
      player.ReqAction = undefined;

    } else if (ACTIONS.includes(subCommand)) {
      if (player.State !== STATES.FIGHTING) {
        return conn.reply(m.chat, "*🔍 Anda belum menemukan buronan. Ketik '.polisi cari' dulu.*", m);
      }

      if (subCommand === player.ReqAction) {
        let reward = player.Lv * 4000;
        player.Pencuri_Tertangkap++;
        player.Balance += reward;

        conn.reply(m.chat, `*✅ Sukses! Pencuri tertangkap.* \n\nAnda mendapat honor Rp${reward.toLocaleString()}.\nHonor Tertunda Anda: Rp${player.Balance.toLocaleString()}.\n\n*(Ketik .polisi stop untuk mencairkan honor)*`, m);
      } else {
        conn.reply(m.chat, `*❌ GAGAL!* \nAnda malah melakukan *${subCommand.toUpperCase()}*, pencurinya berhasil kabur!`, m);
      }

      player.State = STATES.IDLE;
      player.ReqAction = undefined;
    } else {
       conn.reply(m.chat, "*⚠️ Tindakan tidak valid! Pilih: kejar, tembak, lempar, tangkap.*", m);
    }

    conn.polisiSesi[sender] = player;
  }
};

handler.help = ["polisi"];
handler.tags = ["rpg"];
handler.command = ["polisi"];
handler.registered = true

module.exports = handler;
