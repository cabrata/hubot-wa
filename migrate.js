'use strict'

/**
 * ============================================================
 *  MIGRATOR — JSON Database → Prisma SQL
 *  Jalankan: node migrate.js
 *  Opsional: node migrate.js --dry-run   (cek tanpa nulis ke DB)
 *            node migrate.js --only=users
 *            node migrate.js --only=chats
 *            node migrate.js --batch=50
 * ============================================================
 */

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

// ── Konfigurasi ──────────────────────────────────────────────
const CONFIG = {
    // Path ke file JSON database lama (lowdb / JSONFile)
    JSON_PATH: process.env.DB_JSON_PATH || './database.json',
    BATCH_SIZE: parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '30'),
    DRY_RUN: process.argv.includes('--dry-run'),
    ONLY: process.argv.find(a => a.startsWith('--only='))?.split('=')[1] || 'all',
    LOG_FILE: './migration.log',
}

const prisma = new PrismaClient({ log: ['error'] })

// ── Warna terminal ───────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
}
const log = (msg) => console.log(`${C.cyan}[INFO]${C.reset} ${msg}`)
const ok = (msg) => console.log(`${C.green}[OK]${C.reset}  ${msg}`)
const warn = (msg) => console.log(`${C.yellow}[WARN]${C.reset} ${msg}`)
const err = (msg) => console.log(`${C.red}[ERR]${C.reset}  ${msg}`)
const title = (msg) => console.log(`\n${C.bold}${C.cyan}══ ${msg} ══${C.reset}`)

// ── Log file writer ──────────────────────────────────────────
const logLines = []
function writeLog(type, jid, detail) {
    logLines.push(`[${new Date().toISOString()}] [${type}] ${jid} | ${detail}`)
}
function flushLog() {
    fs.writeFileSync(CONFIG.LOG_FILE, logLines.join('\n') + '\n', 'utf-8')
}

// ============================================================
//  HELPER: category detector untuk inventory items
// ============================================================
const ITEM_CATEGORY_MAP = {
    resource: ['kayu', 'batu', 'wood', 'rock', 'coal', 'korekapi', 'arlok', 'botol', 'kardus', 'kaleng', 'aqua'],
    food: ['apel', 'ayamb', 'ayamg', 'sapir', 'ssapi', 'esteh', 'leleg', 'leleb', 'soda', 'vodka', 'ganja', 'bandage', 'sushi', 'roti', 'makanan'],
    cooked: ['ayambakar', 'gulai', 'rendang', 'ayamgoreng', 'oporayam', 'steak', 'babipanggang', 'ikanbakar', 'nilabakar', 'lelebakar', 'bawalbakar', 'udangbakar', 'pausbakar', 'kepitingbakar'],
    fish: ['paus', 'kepiting', 'gurita', 'cumi', 'buntal', 'dory', 'lumba', 'lobster', 'hiu', 'udang', 'ikan', 'nila', 'bawal', 'lele', 'orca'],
    animal: ['banteng', 'harimau', 'gajah', 'kambing', 'panda', 'buaya', 'kerbau', 'sapi', 'monyet', 'babihutan', 'babi', 'ayam'],
    fruit: ['anggur', 'jeruk', 'semangka', 'mangga', 'stroberi', 'pisang'],
    seed: ['bibitanggur', 'bibitpisang', 'bibitapel', 'bibitmangga', 'bibitjeruk'],
    rarity: ['common', 'as', 'uncommon', 'mythic', 'legendary', 'glory', 'enchant', 'pet', 'psepick', 'psenjata'],
}
const ITEM_TO_CATEGORY = {}
for (const [cat, items] of Object.entries(ITEM_CATEGORY_MAP)) {
    for (const item of items) ITEM_TO_CATEGORY[item] = cat
}
// fruit & food overlap apel
ITEM_TO_CATEGORY['apel'] = 'fruit'

const ALL_TOOL_NAMES = new Set([
    'armor', 'weapon', 'sword', 'pickaxe', 'fishingrod', 'katana', 'bow', 'kapak', 'axe', 'pisau',
])
const ALL_PET_NAMES = new Set([
    'kucing', 'kuda', 'rubah', 'anjing', 'serigala', 'naga', 'phonix', 'griffin', 'kyubi', 'centaur',
])
const ALL_ITEM_NAMES = new Set(Object.values(ITEM_CATEGORY_MAP).flat())

// ── Safe number helpers ──────────────────────────────────────
const isNum = x => typeof x === 'number' && isFinite(x) && !isNaN(x)
const toInt = (x, def = 0) => {
    const n = Number(x)
    return isFinite(n) ? Math.floor(n) : def
}
const toFloat = (x, def = 0) => {
    const n = Number(x)
    return isFinite(n) ? n : def
}
const toBigInt = (x) => {
    try { return BigInt(Math.floor(Number(x) || 0)) }
    catch { return 0n }
}
const toBool = (x, def = false) => {
    if (typeof x === 'boolean') return x
    if (x === 1 || x === '1' || x === 'true') return true
    if (x === 0 || x === '0' || x === 'false') return false
    return def
}
const toStr = (x, def = '') => (x != null && x !== undefined) ? String(x) : def

// ── Progress bar ─────────────────────────────────────────────
function progressBar(current, total, label = '') {
    const pct = Math.floor((current / total) * 100)
    const filled = Math.floor(pct / 5)
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)
    process.stdout.write(`\r  ${C.cyan}[${bar}]${C.reset} ${pct}% (${current}/${total}) ${label}    `)
}

// ── Chunk array ──────────────────────────────────────────────
function chunk(arr, size) {
    const result = []
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
    return result
}

// ============================================================
//  PARSE USER JSON → Prisma-ready objects
// ============================================================
function parseUser(jid, u) {
    // ── Core User ──
    const core = {
        jid,
        name: toStr(u.name),
        pushName: toStr(u.name),
        gender: toStr(u.gender, 'lk'),
        registered: toBool(u.registered),
        age: toInt(u.age, -1),
        regTime: toBigInt(u.regTime),
        regSince: toBigInt(u.regSince),
        setName: toBigInt(u.setName),
        setAge: toBigInt(u.setAge),
        sn: toStr(u.sn),

        banned: toBool(u.banned),
        bannedTime: toBigInt(u.bannedTime),
        Banneduser: toBool(u.Banneduser),
        BannedReason: toStr(u.BannedReason),
        banLevel: toInt(u.banLevel),
        lastBanTime: toBigInt(u.lastBanTime),
        warn: toInt(u.warn),
        moderator: toBool(u.moderator),
        timSupport: toBool(u.timSupport),

        afk: toBigInt(u.afk ?? -1),
        afkReason: toStr(u.afkReason),

        premium: toBigInt(u.premium),
        premiumTime: toBigInt(u.premiumTime),

        exp: toBigInt(u.exp),
        level: toInt(u.level),
        coin: toBigInt(u.coin),
        atm: toBigInt(u.atm),
        limit: toInt(u.limit, 500),
        glimit: toInt(u.glimit, 10),
        tprem: toInt(u.tprem),
        tigame: toInt(u.tigame, 5),

        lbars: toStr(u.lbars, '[▒▒▒▒▒▒▒▒▒]'),
        role: toStr(u.role, 'Newbie ㋡'),
        autolevelup: toBool(u.autolevelup),
        job: toStr(u.job, 'Pengangguran'),
        jobexp: toInt(u.jobexp),
        vip: toStr(u.vip, 'tidak'),
        vipPoin: toInt(u.vipPoin),
        ajd: toInt(u.ajd),
        skata: toInt(u.skata),

        jail: toBool(u.jail),
        penjara: toBool(u.penjara),
        dirawat: toBool(u.dirawat),
        kingdom: toBool(u.kingdom),

        statusNikah: toBool(u.statusNikah),
        tanggalNikah: toBigInt(u.tanggalNikah),
        hamil: toBool(u.hamil),
        hamilStart: toBigInt(u.hamilStart),
        lastKencan: toBigInt(u.lastKencan),
        lastCekAyang: toBigInt(u.lastCekAyang),
        lastRawatAnak: toBigInt(u.lastRawatAnak),

        slotNetWinLoss: toFloat(u.slotNetWinLoss),
        spinLock: toBool(u['_spinLock']),
        slotFreeSpins: toInt(u.slotFreeSpins),
        slotFSBet: toFloat(u.slotFSBet),
        freespin: toInt(u.freespin),
        fsBet: toFloat(u.fsBet),
        slotSpinning: toBool(u.slotSpinning),
        isAutoSpinning: toBool(u.isAutoSpinning),
        cancelAutoSpin: toBool(u.cancelAutoSpin),
        lastslot: toBigInt(u.lastslot),

        swm: u.swm || { author: '', packname: 'Bot' },
        ds: u.ds || { limit: 20, last: 0 },
        chatgpt: u.chatgpt || { lastReset: 0, usage: {} },
        guild: u.guild ?? null,
        gift: u.gift || {},
        portofolio: u.portofolio || {},
        invest: u.invest || {},
        anak: Array.isArray(u.anak) ? u.anak : [],
        properti: u.properti ?? null,
        pasanganChar: u.pasanganChar ?? null,
        lastCharSearch: u.lastCharSearch ?? null,

        perkerjaandua: toBigInt(u.perkerjaandua),
    }

    // ── Economy ──
    const economy = {
        saldo: toFloat(u.saldo),
        pengeluaran: toFloat(u.pengeluaran),
        money: toFloat(u.money),
        bank: toFloat(u.bank),
        balance: toFloat(u.balance),
        chip: toBigInt(u.chip),
        tiketcoin: toBigInt(u.tiketcoin),
        poin: toBigInt(u.poin),
        litecoin: toBigInt(u.litecoin),
        gems: toBigInt(u.gems),
        cupon: toBigInt(u.cupon),
        dana: toBigInt(u.dana),
        gopay: toBigInt(u.gopay),
        ovo: toBigInt(u.ovo),
        diamond: toBigInt(u.diamond),
        emerald: toBigInt(u.emerald),
        berlian: toBigInt(u.berlian),
        iron: toBigInt(u.iron),
        emas: toBigInt(u.emas),
        arlok: toBigInt(u.arlok),
        bisnis: toBigInt(u.bisnis),
        berbisnis: toBigInt(u.berbisnis),
        rumahsakit: toBigInt(u.rumahsakit),
        fortress: toBigInt(u.fortress),
        shield: toBool(u.shield),
        pertanian: toBigInt(u.pertanian),
        pertambangan: toBigInt(u.pertambangan),
        camptroops: toBigInt(u.camptroops),
        tambang: toBigInt(u.tambang),
        penduduk: toBigInt(u.penduduk),
        archer: toBigInt(u.archer),
        subscribers: toBigInt(u.subscribers),
        viewers: toBigInt(u.viewers),
        like: toBigInt(u.like),
        playButton: toBigInt(u.playButton),
        taxi: toBigInt(u.taxi),
        common: toBigInt(u.common),
        as: toBigInt(u.as),
        uncommon: toBigInt(u.uncommon),
        mythic: toBigInt(u.mythic),
        legendary: toBigInt(u.legendary),
        glory: toBigInt(u.glory),
        enchant: toBigInt(u.enchant),
        pet: toBigInt(u.pet),
        psepick: toBigInt(u.psepick),
        psenjata: toBigInt(u.psenjata),
    }

    // ── RPG ──
    const rpg = {
        healt: toInt(u.healt, 100),
        health: toInt(u.health, 100),
        energi: toInt(u.energi, 100),
        power: toInt(u.power, 100),
        stamina: toInt(u.stamina, 100),
        haus: toInt(u.haus, 100),
        laper: toInt(u.laper, 100),
        title: toInt(u.title),
        titlein: toStr(u.titlein, 'Belum Ada'),
        ultah: toStr(u.ultah),
        pasangan: toStr(u.pasangan),
        sahabat: toStr(u.sahabat),
        location: toStr(u.location, 'Gubuk'),
        husbu: toStr(u.husbu, 'Belum Di Set'),
        waifu: toStr(u.waifu, 'Belum Di Set'),
        follow: toBigInt(u.follow),
        lastfollow: toBigInt(u.lastfollow),
        followers: toBigInt(u.followers),
        pc: toBigInt(u.pc),
        korbanngocok: toBigInt(u.korbanngocok),
        ngewe: toBigInt(u.ngewe),
        jualan: toBigInt(u.jualan),
        ngocokk: toBigInt(u.ngocokk),
        antarpaket: toBigInt(u.antarpaket),
        ojekk: toBigInt(u.ojekk),
        polisi: toBigInt(u.polisi),
        ojek: toBigInt(u.ojek),
        pedagang: toBigInt(u.pedagang),
        dokter: toBigInt(u.dokter),
        petani: toBigInt(u.petani),
        montir: toBigInt(u.montir),
        kuli: toBigInt(u.kuli),
        trofi: toBigInt(u.trofi),
        rtrofi: toStr(u.rtrofi, 'Perunggu'),
        troopcamp: toBigInt(u.troopcamp),
        attack: toInt(u.attack),
        strenght: toInt(u.strenght),
        speed: toInt(u.speed),
        defense: toInt(u.defense),
        regeneration: toInt(u.regeneration),
        skill: toStr(u.skill),
        korps: toStr(u.korps),
        korpsgrade: toStr(u.korpsgrade),
        breaths: toStr(u.breaths),
        magic: toStr(u.magic),
        demon: toStr(u.demon),
        darahiblis: toBigInt(u.darahiblis),
        demonblood: toBigInt(u.demonblood),
        demonkill: toBigInt(u.demonkill),
        hashirakill: toBigInt(u.hashirakill),
        alldemonkill: toBigInt(u.alldemonkill),
        allhashirakill: toBigInt(u.allhashirakill),
        ramuan: toBigInt(u.ramuan),
        string: toBigInt(u.string),
        eleksirb: toBigInt(u.eleksirb),
        shadow: toBigInt(u.shadow),
        antispam: toBigInt(u.antispam),
        antispamlastclaim: toBigInt(u.antispamlastclaim),
        healthmonster: toBigInt(u.healthmonster),
        pancing: toBigInt(u.pancing),
        pancingan: toBigInt(u.pancingan),
        totalPancingan: toBigInt(u.totalPancingan),
        anakpancingan: toBigInt(u.anakpancingan),
        umpan: toBigInt(u.umpan),
        sampah: toBigInt(u.sampah),
        potion: toBigInt(u.potion),
    }

    // ── Cooldown ──
    const cooldown = {
        lastseen: toBigInt(u.lastseen),
        lastSetStatus: toBigInt(u.lastSetStatus),
        lastIstigfar: toBigInt(u.lastIstigfar),
        lastclaim: toBigInt(u.lastclaim),
        judilast: toBigInt(u.judilast),
        lastnambang: toBigInt(u.lastnambang),
        lastnebang: toBigInt(u.lastnebang),
        lastkerja: toBigInt(u.lastkerja),
        lastmaling: toBigInt(u.lastmaling),
        lastbunuhi: toBigInt(u.lastbunuhi),
        lastbisnis: toBigInt(u.lastbisnis),
        lastberbisnis: toBigInt(u.lastberbisnis),
        lastmancing: toBigInt(u.lastmancing),
        lastramuanclaim: toBigInt(u.lastramuanclaim),
        lastgemclaim: toBigInt(u.lastgemclaim),
        lastpotionclaim: toBigInt(u.lastpotionclaim),
        laststringclaim: toBigInt(u.laststringclaim),
        lastswordclaim: toBigInt(u.lastswordclaim),
        lastweaponclaim: toBigInt(u.lastweaponclaim),
        lastironclaim: toBigInt(u.lastironclaim),
        lastmancingclaim: toBigInt(u.lastmancingclaim),
        lastadventure: toBigInt(u.lastadventure),
        lastberburu: toBigInt(u.lastberburu),
        lastkill: toBigInt(u.lastkill),
        lastfishing: toBigInt(u.lastfishing),
        lastdungeon: toBigInt(u.lastdungeon),
        lastwar: toBigInt(u.lastwar),
        lastsda: toBigInt(u.lastsda),
        lastberbru: toBigInt(u.lastberbru),
        lastduel: toBigInt(u.lastduel),
        lastjb: toBigInt(u.lastjb),
        lastmining: toBigInt(u.lastmining),
        lasthunt: toBigInt(u.lasthunt),
        lasthun: toBigInt(u.lasthun),
        lastngocok: toBigInt(u.lastngocok),
        lastgift: toBigInt(u.lastgift),
        lastrob: toBigInt(u.lastrob),
        lastngojek: toBigInt(u.lastngojek),
        lastngewe: toBigInt(u.lastngewe),
        lastjualan: toBigInt(u.lastjualan),
        lastngocokk: toBigInt(u.lastngocokk),
        lastgrab: toBigInt(u.lastgrab),
        lastberkebon: toBigInt(u.lastberkebon),
        lastcodereg: toBigInt(u.lastcodereg),
        lastdagang: toBigInt(u.lastdagang),
        lasthourly: toBigInt(u.lasthourly),
        lastweekly: toBigInt(u.lastweekly),
        lastyearly: toBigInt(u.lastyearly),
        lastmonthly: toBigInt(u.lastmonthly),
        lastturu: toBigInt(u.lastturu),
        lastbansos: toBigInt(u.lastbansos),
        lastrampok: toBigInt(u.lastrampok),
        lastngaji: toBigInt(u.lastngaji),
        lastlonte: toBigInt(u.lastlonte),
        lastkoboy: toBigInt(u.lastkoboy),
        lastdate: toBigInt(u.lastdate),
        lasttambang: toBigInt(u.lasttambang),
        lastngepet: toBigInt(u.lastngepet),
        lasttaxi: toBigInt(u.lasttaxi),
        lastyoutuber: toBigInt(u.lastyoutuber),
        lastbossbattle: toBigInt(u.lastbossbattle),
    }

    // ── Job counters ──
    const jobStats = {
        kerjasatu: toInt(u.kerjasatu),
        kerjadua: toInt(u.kerjadua),
        kerjatiga: toInt(u.kerjatiga),
        kerjaempat: toInt(u.kerjaempat),
        kerjalima: toInt(u.kerjalima),
        kerjaenam: toInt(u.kerjaenam),
        kerjatujuh: toInt(u.kerjatujuh),
        kerjadelapan: toInt(u.kerjadelapan),
        kerjasembilan: toInt(u.kerjasembilan),
        kerjasepuluh: toInt(u.kerjasepuluh),
        kerjasebelas: toInt(u.kerjasebelas),
        kerjaduabelas: toInt(u.kerjaduabelas),
        kerjatigabelas: toInt(u.kerjatigabelas),
        kerjaempatbelas: toInt(u.kerjaempatbelas),
        kerjalimabelas: toInt(u.kerjalimabelas),
        pekerjaansatu: toInt(u.pekerjaansatu),
        pekerjaandua: toInt(u.pekerjaandua),
        pekerjaantiga: toInt(u.pekerjaantiga),
        pekerjaanempat: toInt(u.pekerjaanempat),
        pekerjaanlima: toInt(u.pekerjaanlima),
        pekerjaanenam: toInt(u.pekerjaanenam),
        pekerjaantujuh: toInt(u.pekerjaantujuh),
        pekerjaandelapan: toInt(u.pekerjaandelapan),
        pekerjaansembilan: toInt(u.pekerjaansembilan),
        pekerjaansepuluh: toInt(u.pekerjaansepuluh),
        pekerjaansebelas: toInt(u.pekerjaansebelas),
        pekerjaanduabelas: toInt(u.pekerjaanduabelas),
        pekerjaantigabelas: toInt(u.pekerjaantigabelas),
        pekerjaanempatbelas: toInt(u.pekerjaanempatbelas),
        pekerjaanlimabelas: toInt(u.pekerjaanlimabelas),
    }

    // ── Inventory items ──
    const inventory = []
    for (const itemName of ALL_ITEM_NAMES) {
        const qty = toInt(u[itemName], 0)
        if (qty !== 0) {
            inventory.push({
                itemName,
                itemCategory: ITEM_TO_CATEGORY[itemName] || 'resource',
                quantity: toBigInt(qty),
            })
        }
    }

    // ── Tools ──
    const tools = []
    for (const toolName of ALL_TOOL_NAMES) {
        const owned = toInt(u[toolName], 0)
        const durability = toInt(u[`${toolName}durability`], 0)
        if (owned !== 0 || durability !== 0) {
            tools.push({ toolName, owned, durability })
        }
    }

    // ── Pets ──
    const pets = []
    for (const petName of ALL_PET_NAMES) {
        const count = toInt(u[petName], 0)
        const baby = toInt(u[`anak${petName}`], 0)
        const exp = toBigInt(u[`${petName}exp`] ?? 0)
        const food = toBigInt(u[`makanan${petName}`] ?? u.makananPet ?? 0)
        const lastClaim = toBigInt(u[`${petName}lastclaim`] ?? 0)
        if (count || baby || exp || food || lastClaim) {
            pets.push({ petName, count, baby, exp, food, lastClaim })
        }
    }

    return { core, economy, rpg, cooldown, jobStats, inventory, tools, pets }
}

// ============================================================
//  PARSE CHAT JSON → Prisma-ready object
// ============================================================
function parseChat(chatId, c) {
    return {
        chatId,
        onlyAdmin: toBool(c.onlyAdmin),
        isBanned: toBool(c.isBanned),
        welcome: toBool(c.welcome, true),
        welcometype: toInt(c.welcometype, 1),
        detect: toBool(c.detect),
        isBannedTime: toBool(c.isBannedTime),
        mute: toBool(c.mute),
        listStr: JSON.stringify(c.listStr || {}),
        sWelcome: toStr(c.sWelcome, 'Hai, @user!\nSelamat datang di grup @subject\n\n@desc'),
        sBye: toStr(c.sBye, 'Selamat tinggal @user!'),
        sPromote: toStr(c.sPromote),
        sDemote: toStr(c.sDemote),
        delete: toBool(c.delete, true),
        antiLink: toBool(c.antiLink, true),
        antiLinknokick: toBool(c.antiLinknokick),
        antiSticker: toBool(c.antiSticker),
        antiStickernokick: toBool(c.antiStickernokick),
        viewonce: toBool(c.viewonce),
        antiToxic: toBool(c.antiToxic),
        antiDelete: toBool(c.antiDelete),
        antibot: toBool(c.antibot),
        expired: toBigInt(c.expired),
        memgc: JSON.stringify(c.memgc || {}),
        blacklistUsers: JSON.stringify(c.blacklistUsers || {}),
        rpg: toBool(c.rpg),
        antilinkig: toBool(c.antilinkig),
        antilinkignokick: toBool(c.antilinkignokick),
        antilinkfb: toBool(c.antilinkfb),
        antilinkfbnokick: toBool(c.antilinkfbnokick),
        antilinktwit: toBool(c.antilinktwit),
        antilinktwitnokick: toBool(c.antilinktwitnokick),
        antilinkyt: toBool(c.antilinkyt),
        antilinkytnokick: toBool(c.antilinkytnokick),
        antilinktele: toBool(c.antilinktele),
        antilinktelenokick: toBool(c.antilinktelenokick),
        antilinkwame: toBool(c.antilinkwame),
        antilinkwamenokick: toBool(c.antilinkwamenokick),
        antilinkall: toBool(c.antilinkall),
        antilinkallnokick: toBool(c.antilinkallnokick),
        antilinktt: toBool(c.antilinktt),
        antilinkttnokick: toBool(c.antilinkttnokick),
    }
}

// ============================================================
//  MIGRATE USERS
// ============================================================
async function migrateUsers(users) {
    title('MIGRASI USERS')

    const entries = Object.entries(users)
    const total = entries.length
    let success = 0, skipped = 0, failed = 0

    log(`Total users ditemukan: ${C.bold}${total}${C.reset}`)
    if (CONFIG.DRY_RUN) warn('DRY RUN aktif — tidak ada data yang ditulis ke database')
    console.log()

    const batches = chunk(entries, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
        const ops = []

        for (const [jid, u] of batch) {
            if (!jid || typeof u !== 'object') { skipped++; continue }

            try {
                const parsed = parseUser(jid, u)

                if (CONFIG.DRY_RUN) {
                    success++
                    writeLog('DRY_RUN', jid, `user parsed OK`)
                    continue
                }

                // Upsert user + semua relasi
                ops.push(
                    prisma.user.upsert({
                        where: { jid },
                        update: parsed.core,
                        create: {
                            ...parsed.core,
                            economy: { create: parsed.economy },
                            rpg: { create: parsed.rpg },
                            cooldown: { create: parsed.cooldown },
                            jobStats: { create: parsed.jobStats },
                        },
                    }).then(async () => {
                        // Economy — upsert terpisah (mungkin sudah ada dari create)
                        await prisma.userEconomy.upsert({
                            where: { jid },
                            update: parsed.economy,
                            create: { jid, ...parsed.economy },
                        })
                        // RPG
                        await prisma.userRpg.upsert({
                            where: { jid },
                            update: parsed.rpg,
                            create: { jid, ...parsed.rpg },
                        })
                        // Cooldown
                        await prisma.userCooldown.upsert({
                            where: { jid },
                            update: parsed.cooldown,
                            create: { jid, ...parsed.cooldown },
                        })
                        // Job
                        await prisma.userJob.upsert({
                            where: { jid },
                            update: parsed.jobStats,
                            create: { jid, ...parsed.jobStats },
                        })
                        // Inventory
                        for (const item of parsed.inventory) {
                            await prisma.userInventory.upsert({
                                where: { jid_itemName: { jid, itemName: item.itemName } },
                                update: { quantity: item.quantity },
                                create: { jid, ...item },
                            })
                        }
                        // Tools
                        for (const tool of parsed.tools) {
                            await prisma.userTool.upsert({
                                where: { jid_toolName: { jid, toolName: tool.toolName } },
                                update: { owned: tool.owned, durability: tool.durability },
                                create: { jid, ...tool },
                            })
                        }
                        // Pets
                        for (const pet of parsed.pets) {
                            await prisma.userPet.upsert({
                                where: { jid_petName: { jid, petName: pet.petName } },
                                update: { count: pet.count, baby: pet.baby, exp: pet.exp, food: pet.food, lastClaim: pet.lastClaim },
                                create: { jid, ...pet },
                            })
                        }
                        success++
                        writeLog('OK', jid, `inventory:${parsed.inventory.length} tools:${parsed.tools.length} pets:${parsed.pets.length}`)
                    }).catch(e => {
                        failed++
                        writeLog('FAIL', jid, e.message)
                        err(`  GAGAL ${jid}: ${e.message}`)
                    })
                )
            } catch (e) {
                failed++
                writeLog('PARSE_ERR', jid, e.message)
            }
        }

        if (!CONFIG.DRY_RUN) await Promise.all(ops)
        progressBar(success + failed + skipped, total, `✓${success} ✗${failed} -${skipped}`)
    }

    console.log('\n')
    ok(`Users selesai — Berhasil: ${C.green}${success}${C.reset} | Gagal: ${C.red}${failed}${C.reset} | Skip: ${C.dim}${skipped}${C.reset}`)
    return { success, failed, skipped }
}

// ============================================================
//  MIGRATE CHATS
// ============================================================
async function migrateChats(chats) {
    title('MIGRASI CHATS')

    const entries = Object.entries(chats)
    const total = entries.length
    let success = 0, failed = 0

    log(`Total chats ditemukan: ${C.bold}${total}${C.reset}`)
    console.log()

    const batches = chunk(entries, CONFIG.BATCH_SIZE)

    for (const batch of batches) {
        if (CONFIG.DRY_RUN) {
            success += batch.length
            progressBar(success, total)
            continue
        }

        await Promise.all(
            batch.map(async ([chatId, c]) => {
                if (!chatId || typeof c !== 'object') return
                try {
                    const data = parseChat(chatId, c)
                    await prisma.chat.upsert({
                        where: { chatId },
                        update: data,
                        create: data,
                    })
                    success++
                    writeLog('OK', chatId, 'chat migrated')
                } catch (e) {
                    failed++
                    writeLog('FAIL', chatId, e.message)
                    err(`  GAGAL ${chatId}: ${e.message}`)
                }
            })
        )
        progressBar(success + failed, total)
    }

    console.log('\n')
    ok(`Chats selesai — Berhasil: ${C.green}${success}${C.reset} | Gagal: ${C.red}${failed}${C.reset}`)
    return { success, failed }
}

// ============================================================
//  MAIN
// ============================================================
async function main() {
    console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════╗`)
    console.log(`║   JSON → Prisma SQL  MIGRATOR  v1.0   ║`)
    console.log(`╚═══════════════════════════════════════╝${C.reset}\n`)

    if (CONFIG.DRY_RUN) warn('Mode DRY RUN aktif — database tidak akan diubah\n')

    // 1. Baca JSON
    log(`Membaca file JSON dari: ${C.bold}${CONFIG.JSON_PATH}${C.reset}`)
    if (!fs.existsSync(CONFIG.JSON_PATH)) {
        err(`File tidak ditemukan: ${CONFIG.JSON_PATH}`)
        err(`Sesuaikan path di CONFIG.JSON_PATH atau pakai env DB_JSON_PATH=./path/ke/database.json`)
        process.exit(1)
    }

    let raw
    try {
        raw = JSON.parse(fs.readFileSync(CONFIG.JSON_PATH, 'utf-8'))
    } catch (e) {
        err(`Gagal parse JSON: ${e.message}`)
        process.exit(1)
    }

    // Support berbagai struktur: { users: {}, chats: {} } atau { data: { users: {}, chats: {} } }
    const data = raw.data || raw
    const users = data.users || {}
    const chats = data.chats || {}

    log(`Users: ${C.bold}${Object.keys(users).length}${C.reset} | Chats: ${C.bold}${Object.keys(chats).length}${C.reset}`)
    log(`Batch size: ${CONFIG.BATCH_SIZE}`)

    if (!CONFIG.DRY_RUN) {
        // 2. Test koneksi DB
        log('Mengecek koneksi database...')
        try {
            await prisma.$connect()
            ok('Koneksi berhasil')
        } catch (e) {
            err(`Koneksi gagal: ${e.message}`)
            err('Pastikan DATABASE_URL sudah benar di .env dan sudah menjalankan `npx prisma migrate deploy`')
            process.exit(1)
        }
    }

    const startTime = Date.now()
    const results = {}

    // 3. Migrasi sesuai flag --only
    if (CONFIG.ONLY === 'all' || CONFIG.ONLY === 'users') {
        results.users = await migrateUsers(users)
    }
    if (CONFIG.ONLY === 'all' || CONFIG.ONLY === 'chats') {
        results.chats = await migrateChats(chats)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    // 4. Ringkasan akhir
    title('RINGKASAN')
    if (results.users) {
        console.log(`  Users  — ✓ ${results.users.success} | ✗ ${results.users.failed} | skip ${results.users.skipped}`)
    }
    if (results.chats) {
        console.log(`  Chats  — ✓ ${results.chats.success} | ✗ ${results.chats.failed}`)
    }
    console.log(`\n  Waktu  : ${elapsed}s`)
    console.log(`  Log    : ${CONFIG.LOG_FILE}`)

    flushLog()

    if (!CONFIG.DRY_RUN) await prisma.$disconnect()

    console.log(`\n${C.green}${C.bold}✔ Migrasi selesai!${C.reset}\n`)
}

main().catch(e => {
    err(`Fatal error: ${e.message}`)
    console.error(e)
    flushLog()
    process.exit(1)
})