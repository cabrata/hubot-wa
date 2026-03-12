const { exec } = require("child_process");
const fs = require("fs");

async function handler(m, { conn, text: args }) {
  if (!args || args.split(" ").length < 2) {
    throw `Usage: ipscan <network_range> <port>\nExample: ipscan 192.168.1.0/24 80`;
  }

  const [network, port] = args.split(" ");

  // Validasi IP Range (regex)
  const ipRangeRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})$/;
  if (!ipRangeRegex.test(network)) {
    throw "Invalid network range! Use CIDR format, e.g., 192.168.1.0/24.";
  }

  // Validasi Port
  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw "Invalid port! Port must be a number between 1 and 65535.";
  }

  const scriptPath = "./ipscan.py"; // Path ke skrip Python

  // Validasi apakah file Python ada
  if (!fs.existsSync(scriptPath)) {
    throw "Skrip Python untuk ipscan tidak ditemukan!";
  }

  await m.reply("Please wait... scanning in progress");

  // Eksekusi skrip Python dengan validasi parameter
  exec(`python3 ${scriptPath} ${network} ${portNumber}`, (err, stdout, stderr) => {
    if (err || stderr) {
      return m.reply(`Error:\n${stderr || err.message}`);
    }

    if (!stdout.trim()) {
      return m.reply("Scan selesai, tetapi tidak ada port terbuka.");
    }

    // Kirim hasil scan
    conn.sendMessage(
      m.chat,
      { text: `Scan Result:\n${stdout}` },
      { quoted: m }
    );
  });
}

handler.help = ["ipscan"];
handler.tags = ["tools"];
handler.command = /^(ipscan)$/i;

module.exports = handler;