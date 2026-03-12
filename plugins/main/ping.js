const os = require('os')
const fs = require('fs')
const path = require('path')
const { performance } = require('perf_hooks')
const { sizeFormatter } = require('human-readable')

const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)

let format = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})

let formatDuration = (seconds) => {
    let h = Math.floor(seconds / 3600)
    let m = Math.floor((seconds % 3600) / 60)
    let s = Math.floor(seconds % 60)
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

function formatNum(num, digits = 1) {
    // Pastikan input adalah angka
    if (isNaN(num)) {
        return 0;
    }

    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" }, // Ribu
        { value: 1e6, symbol: "M" }, // Juta
        { value: 1e9, symbol: "B" }, // Miliar (Billion)
        { value: 1e12, symbol: "T" }, // Triliun
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" }
    ];

    // Cari sufiks yang sesuai dari lookup table secara descending
    const item = lookup.slice().reverse().find(function (item) {
        return num >= item.value;
    });

    // Jika ada sufiks yang cocok, format angkanya. Jika tidak, kembalikan angka asli.
    if (item) {
        const numFormatted = (num / item.value).toFixed(digits);
        // Hapus .0 jika tidak ada angka desimal lain
        return parseFloat(numFormatted) + item.symbol;
    }

    return num.toString();
}

let handler = async (m, { conn }) => {
    let groups = {}
    try {
        groups = await conn.groupFetchAllParticipating()
    } catch (e) { }
    const joinedGroups = Object.keys(groups).length

    let totalUsers = 0
    try {
        const { db } = require('../../lib/database.js')
        totalUsers = await db.user.count()
    } catch (e) { }

    const used = process.memoryUsage()
    const cpus = os.cpus().map(cpu => {
        cpu.total = Object.keys(cpu.times).reduce((last, type) => last + cpu.times[type], 0)
        return cpu
    })
    const cpuCoreCount = cpus.length
    const cpu = cpus.reduce((last, cpu, _, { length }) => {
        last.total += cpu.total
        last.speed += cpu.speed / length
        last.times.user += cpu.times.user
        last.times.nice += cpu.times.nice
        last.times.sys += cpu.times.sys
        last.times.idle += cpu.times.idle
        last.times.irq += cpu.times.irq
        return last
    }, {
        speed: 0,
        total: 0,
        times: {
            user: 0,
            nice: 0,
            sys: 0,
            idle: 0,
            irq: 0
        }
    })

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memUsagePercent = (usedMem / totalMem) * 100

    // Baca temperatur CPU dari thermal_zone
    let cpuTemps = []
    try {
        const thermalZones = fs.readdirSync('/sys/class/thermal')
            .filter(name => name.startsWith('thermal_zone'))

        for (const zone of thermalZones) {
            const tempPath = path.join('/sys/class/thermal', zone, 'temp')
            const typePath = path.join('/sys/class/thermal', zone, 'type')
            try {
                const tempRaw = fs.readFileSync(tempPath, 'utf8')
                const type = fs.readFileSync(typePath, 'utf8').trim()
                const tempC = parseInt(tempRaw) / 1000
                cpuTemps.push(`${type} : ${tempC.toFixed(1)}°C`)
            } catch (e) { }
        }
    } catch (e) { }

    let old = performance.now()
    let xuy = await m.reply('_Testing speed..._')
    let neww = performance.now()
    let speed = neww - old

    let txt = `
╭─「 *Speed Test* 」
│ ⏱️ Response: *${speed.toFixed(2)} ms*
╰────
${readmore}
╭─「 *Chat Info* 」
│ 👥 Groups Joined: *${joinedGroups}*
│ 👤 Database Users: *${totalUsers}*
╰────
${readmore}
╭─「 *Server Info* 」
│ 🖥️ Uptime OS: *${formatDuration(os.uptime())}*
│ 🟢 Uptime Node.js: *${formatDuration(process.uptime())}*
│ 🟡 Uptime Bot: *${formatDuration(process.uptime())}*
│ 🧠 RAM: *${format(usedMem)} / ${format(totalMem)}* (${memUsagePercent.toFixed(2)}%)
│
│ 📦 NodeJS Memory:
${Object.keys(used).map(key => `│ - ${key}: ${format(used[key])}`).join('\n')}
${cpuTemps.length > 0 ? `
│
│ 🌡️ CPU Temp:
${cpuTemps.map(t => `│ - ${t}`).join('\n')}` : ''}
╰────

╭─「 *CPU Info* 」
│ 🔧 Model: *${cpus[0].model.trim()}*
│ 🧩 Cores: *${cpuCoreCount}*
│ ⚙️ Speed: *${cpu.speed.toFixed(2)} MHz*
│
${Object.keys(cpu.times).map(type => `│ - ${type.padEnd(6)}: ${(100 * cpu.times[type] / cpu.total).toFixed(2)}%`).join('\n')}
╰────
`.trim()

    conn.edit(xuy.key.remoteJid, txt, xuy)
}

handler.help = ['ping', 'speed']
handler.tags = ['info', 'tools']
handler.command = /^(ping|speed|info|p)$/i
module.exports = handler
