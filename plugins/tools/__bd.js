const moment = require('moment-timezone')
const schedule = require('node-schedule')
const fs = require('fs')

// import ucapan & penutup
const wishesLib = require('../../lib/birthdayWish.js')
const closingLib = require('../../lib/birthdayEnd.js')
const { db, updateUser } = require('../../lib/database') // Import database SQL

let handler = m => m

schedule.scheduleJob(
  { rule: '0 0 * * *', tz: 'Asia/Jakarta' },
  async () => {
    // Cek apakah bot sedang aktif/terkoneksi
    if (!global.conn) return;

    let today = moment().tz('Asia/Jakarta')
    let dd = today.format('DD')
    let mm = today.format('MM')
    let currentYear = today.format('YYYY')

    try {
      // Tarik data seluruh user BESERTA data RPG dan Economy-nya
      let allUsers = await db.user.findMany({
        include: { rpg: true, economy: true }
      });

      for (let user of allUsers) {
        let jid = user.jid; // Di schema Prisma kamu, primary key-nya 'jid'

        // Ambil data ultah dari tabel UserRpg
        let ultah = user.rpg?.ultah;

        // Skip kalau ultah kosong atau belum diset
        if (!ultah || ultah === "" || ultah === "Belum Di Set") continue;

        let [bDay, bMonth, bYear] = ultah.split('/');

        // Jika tanggal dan bulan cocok
        if (bDay === dd && bMonth === mm) {

          // Cek apakah tahun ini sudah dikasih kado
          if (user.lastBirthday !== currentYear) {
            let newAge = (Number(user.age) || 0) + 1;

            let money = 100000000000000;
            let exp = 10000000;
            let level = 100;
            let bank = 100000000000000;
            let legen = 10000;
            let limit = 1000000;

            // Eksekusi update data ulang tahun & hadiah pakai updateUser
            await updateUser(jid, {
              age: newAge,
              lastBirthday: currentYear,
              money: (Number(user.economy?.money) || 0) + money,
              exp: (Number(user.exp) || 0) + exp,
              level: (Number(user.level) || 0) + level,
              bank: (Number(user.economy?.bank) || 0) + bank,
              legendary: (Number(user.economy?.legendary) || 0) + legen,
              limit: (Number(user.limit) || 0) + limit
            });

            let name = user.name || user.pushName || jid.split('@')[0]

            // ambil daftar ucapan
            let wishes = wishesLib.default
            if (newAge === 17) wishes = wishesLib.sweet17

            // pilih random
            let wish = wishes[Math.floor(Math.random() * wishes.length)]
              .replace(/{{name}}/g, name)
              .replace(/{{age}}/g, newAge)

            let end = closingLib[Math.floor(Math.random() * closingLib.length)]

            let hadiah = `\nIni hadiah untukmu 🎁, dari aku dan staff HuTao BOT, semoga senang ya!!\n💰 Money: ${money.toLocaleString('id-ID')}\n⭐ Exp: ${exp.toLocaleString('id-ID')}\n⬆️ Level: ${level}\n🏦 ATM: ${bank.toLocaleString('id-ID')}\n📦 Legendary Box: ${legen.toLocaleString('id-ID')}\n🔋 Limit: ${limit.toLocaleString('id-ID')}\n`

            let message = `${wish}\n${hadiah}\n${end}`;

            try {
              let randomBd = Math.floor(Math.random() * 3) + 1

              await new Promise(resolve => setTimeout(resolve, 60000)) // jeda 1 menit

              await global.conn.sendMessage(jid, { text: message })

              await new Promise(resolve => setTimeout(resolve, 10000)) // jeda 10 detik

              await global.conn.sendMessage(jid, {
                video: fs.readFileSync(`./assets/video/hbd${randomBd}.mp4`), // ambil file lokal
                caption: ""
              })

              await new Promise(resolve => setTimeout(resolve, 240000)) // jeda 4 menit untuk menghindari spam block WA
            } catch (e) {
              await global.conn.sendMessage(
                '6282153017890@s.whatsapp.net',
                { text: `Mengirim Habede gagal untuk ${jid}: ${e.message}` }
              )
              console.error(`Gagal kirim ucapan ulang tahun ke ${jid}`, e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Gagal menarik data dari database Prisma untuk cron ulang tahun:", error);
    }
  }
)

module.exports = handler
