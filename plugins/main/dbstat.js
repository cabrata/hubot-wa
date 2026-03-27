const { db } = require('../../lib/database.js')

// Fungsi buat ngerapihin angka biar ada titiknya (contoh: 1000000 jadi 1.000.000)
function formatNum(num) {
    if (num === null || num === undefined) return 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

let handler = async (m, { conn }) => {
    let msg = await m.reply('_🔍 Menggali data terdalam dari database..._')

    try {
        let now = BigInt(Date.now())
        let nowTime = Date.now()

        // --- MENGHITUNG USER ONLINE (Aktif 1 Menit Terakhir) ---
        let onlineCount = 0;
        let activityCache = global.lastCTime || global.lastCmdTime || {};
        for (let userJid in activityCache) {
            if (nowTime - activityCache[userJid] <= 10000) { 
                onlineCount++;
            }
        }

        // --- MENGHITUNG GRUP AKTIF (Aktif 1 Menit Terakhir) ---
        let activeGroupCount = 0;
        if (global.lastGCTime) {
            for (let gcJid in global.lastGCTime) {
                if (nowTime - global.lastGCTime[gcJid] <= 10000) { 
                    activeGroupCount++;
                }
            }
        }

        // Tarik semua data secara paralel biar nggak lelet
        const [
            // --- USER STATS ---
            totalUsers, registered, unregistered,
            male, female, married, jailed,
            premium, vip, bannedUsers,
            mods, support,

            // --- CHAT / GROUP STATS ---
            totalChats, rpgChats, welcomeChats, 
            antiLinkChats, bannedChats, mutedChats,

            // --- GUILD STATS ---
            totalGuilds,

            // --- GLOBAL ECONOMY & COMMANDS ---
            globalEco, globalCmds
        ] = await Promise.all([
            // User query
            db.user.count(),
            db.user.count({ where: { registered: true } }),
            db.user.count({ where: { registered: false } }),
            db.user.count({ where: { gender: 'lk' } }),
            db.user.count({ where: { gender: 'pr' } }),
            db.user.count({ where: { statusNikah: true } }),
            db.user.count({ where: { OR: [{ jail: true }, { penjara: true }] } }),
            db.user.count({ where: { premium: { gt: now } } }),
            db.user.count({ where: { vip: { not: 'tidak' } } }),
            db.user.count({ where: { banned: true } }),
            db.user.count({ where: { moderator: true } }),
            db.user.count({ where: { timSupport: true } }),

            // Chat/Group query
            db.chat.count(),
            db.chat.count({ where: { rpg: true } }),
            db.chat.count({ where: { welcome: true } }),
            db.chat.count({ where: { antiLink: true } }),
            db.chat.count({ where: { isBanned: true } }),
            db.chat.count({ where: { mute: true } }),

            // Guild query
            db.guild.count(),

            // Aggregates (Ekonomi & Command)
            db.userEconomy.aggregate({
                _sum: { money: true, bank: true, diamond: true }
            }),
            db.commandStats.aggregate({
                _sum: { total: true }
            })
        ])

        let totalStaff = mods + support
        let totalMoney = (globalEco._sum.money || 0) + (globalEco._sum.bank || 0)
        let totalDiamond = globalEco._sum.diamond || 0n
        let totalCmdExecuted = globalCmds._sum.total || 0n

        let txt = `
╭─「 *📊 USER STATS* 」
│ 👥 Total User: *${formatNum(totalUsers)}*
│ 🟢 Sedang Online: *${formatNum(onlineCount)}* user
│ 📋 Terdaftar: *${formatNum(registered)}*
│ 👻 Belum Daftar: *${formatNum(unregistered)}*
│ 👨 Laki-laki: *${formatNum(male)}*
│ 👩 Perempuan: *${formatNum(female)}*
│ ⛓️ Di Penjara: *${formatNum(jailed)}*
│ ⛔ Di-Banned: *${formatNum(bannedUsers)}*
╰────

╭─「 *💬 CHAT & GROUP STATS* 」
│ 🏘️ Total Grup: *${formatNum(totalChats)}*
│ 🟢 Grup Aktif: *${formatNum(activeGroupCount)}* grup
│ ⚔️ RPG Aktif: *${formatNum(rpgChats)}* grup
│ 🛡️ Anti-Link Aktif: *${formatNum(antiLinkChats)}* grup
│ 👋 Welcome Aktif: *${formatNum(welcomeChats)}* grup
│ 🔇 Grup Mute: *${formatNum(mutedChats)}*
│ 🚫 Grup Banned: *${formatNum(bannedChats)}*
╰────

╭─「 *👑 STATUS & STAFF* 」
│ 💎 Premium: *${formatNum(premium)}* user
│ 🌟 VIP: *${formatNum(vip)}* user
│ 👮 Moderator: *${formatNum(mods)}*
│ 🎧 Tim Support: *${formatNum(support)}*
│ 🏅 Total Staff: *${formatNum(totalStaff)}*
╰────

╭─「 *🌍 DATA GLOBAL* 」
│ 🏰 Total Guild: *${formatNum(totalGuilds)}* guild
│ 💵 Uang Beredar: *${formatNum(totalMoney)}*
│ 💎 Diamond Beredar: *${formatNum(totalDiamond)}*
│ 🚀 Command Dipakai: *${formatNum(totalCmdExecuted)}* kali
╰────
`.trim()

        await conn.edit(msg.key.remoteJid, txt, msg)
    } catch (e) {
        console.error(e)
        await conn.edit(msg.key.remoteJid, '❌ _Terjadi kesalahan saat mengambil data dari database._', msg)
    }
}

handler.help = ['userstat', 'dbstat', 'infodb']
handler.tags = ['info']
handler.command = /^(userstat|dbstat|infodb|infouser)$/i

module.exports = handler
