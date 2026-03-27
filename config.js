const fs = require('fs')
const chalk = require('chalk')

// ============== BOT SETTINGS ==============
global.botName = 'HuTao Bot'
global.botVersion = '1.0.0'
global.author = '@caliphdev'

// Owner numbers (without @s.whatsapp.net)
global.owner = ['6281533331660', '6281268880344', '6282153017890', '628112727588']   // ganti dengan nomor owner
global.nabil = ['6282153017890', '6287787293078', '6281910091919']

// Prefix
global.prefix = /^[./#!]/

// API Keys (jika ada)
global.APIs = {}
global.APIKeys = {
    telegram: '8253546846:AAHY_zYQ45-Hd3CKQqmnxyQZ0SRhaxC5hJc' // Token bot telegram untuk API
}

// Group khusus
global.grupbotutama = ''

// Feature toggles
global.autoRead = false
global.autoTyping = true
global.selfMode = false
global.errorsend = true

// Server
global.serverPort = process.env.SERVER_PORT || process.env.PORT || 3000

// Messages
global.welcomeMsg = 'Hai, @user!\nSelamat datang di grup @subject\n\n@desc'
global.byeMsg = 'Selamat tinggal @user!'
global.promoteMsg = '@user sekarang admin!'
global.demoteMsg = '@user bukan admin lagi!'

// Busy mode
global.botBusyUntil = 0
global.hasSentBusyMessage = {}

// Anti-spam Traffic AI Config
global.TRAFFIC_CONFIG = {
    BASE_LIMIT: 5,
    EMA_ALPHA: 0.2,
    PANIC_MULTIPLIER: 3,
    MAX_TOLERANCE: 15
}

global.trafficAI = global.trafficAI || {
    currentRPS: 0,
    averageRPS: global.TRAFFIC_CONFIG.BASE_LIMIT,
    isPanic: false,
    panicUntil: 0,
    hasSentWarning: false
}

// Traffic monitor interval
if (!global.trafficInterval) {
    global.trafficInterval = setInterval(() => {
        const ai = global.trafficAI
        ai.averageRPS = (ai.currentRPS * global.TRAFFIC_CONFIG.EMA_ALPHA) + (ai.averageRPS * (1 - global.TRAFFIC_CONFIG.EMA_ALPHA))
        const recoveryThreshold = Math.max(global.TRAFFIC_CONFIG.BASE_LIMIT, ai.averageRPS * 1.5)
        if (ai.isPanic && Date.now() > ai.panicUntil && ai.currentRPS < recoveryThreshold) {
            console.log(chalk.green(`[TRAFFIC AI] ✅ Traffic normal. Safe mode active. (Avg: ${ai.averageRPS.toFixed(1)})`))
            ai.isPanic = false
        }
        ai.currentRPS = 0
    }, 1000)
}
//other
global.wm = 'HuTao BOT'
global.ch = '120363373141583166@newsletter'
// Call tracker
global.callTracker = global.callTracker || {}

//season
global.rpgSeason = 2

console.log(chalk.cyan(`[CONFIG] ${global.botName} v${global.botVersion} loaded`))

// ============== AUTO RELOAD ==============
const configFile = require.resolve(__filename)
fs.watchFile(configFile, () => {
    fs.unwatchFile(configFile)
    console.log(chalk.yellowBright(`[CONFIG] 🔄 config.js updated, reloading...`))
    delete require.cache[configFile]
    require(configFile)
})
