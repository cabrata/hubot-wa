#!/usr/bin/env node
'use strict'

/**
 * ============================================================
 *  MIGRATE database.json → Prisma / MySQL
 * ============================================================
 *  Jalankan:  node migrate-json-to-sql.js
 *
 *  Pastikan:
 *   1. `npx prisma migrate deploy` atau `npx prisma db push`
 *      sudah dijalankan sehingga tabel-tabel sudah ada.
 *   2. File database.json ada di root project.
 *   3. .env sudah benar (DATABASE_URL).
 * ============================================================
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ── Field sets (sama seperti di database.js) ──────────────

const ECONOMY_FIELDS = new Set([
    'saldo', 'pengeluaran', 'money', 'bank', 'balance',
    'chip', 'tiketcoin', 'poin', 'litecoin', 'gems', 'cupon',
    'dana', 'gopay', 'ovo',
    'diamond', 'emerald', 'berlian', 'iron', 'emas', 'arlok',
    'bisnis', 'berbisnis', 'rumahsakit', 'fortress', 'shield',
    'pertanian', 'pertambangan', 'camptroops', 'tambang',
    'penduduk', 'archer',
    'subscribers', 'viewers', 'like', 'playButton', 'taxi',
    'common', 'as', 'uncommon', 'mythic', 'legendary',
    'glory', 'enchant', 'pet', 'psepick', 'psenjata',
])

const RPG_FIELDS = new Set([
    'healt', 'health', 'energi', 'power', 'stamina', 'haus', 'laper',
    'title', 'titlein',
    'ultah', 'pasangan', 'sahabat', 'location', 'husbu', 'waifu',
    'follow', 'lastfollow', 'followers',
    'pc', 'korbanngocok', 'ngewe', 'jualan', 'ngocokk', 'antarpaket',
    'ojekk', 'polisi', 'ojek', 'pedagang', 'dokter', 'petani', 'montir', 'kuli',
    'trofi', 'rtrofi', 'troopcamp',
    'attack', 'strenght', 'speed', 'defense', 'regeneration',
    'skill', 'korps', 'korpsgrade', 'breaths', 'magic', 'demon',
    'darahiblis', 'demonblood', 'demonkill', 'hashirakill',
    'alldemonkill', 'allhashirakill',
    'ramuan', 'string', 'eleksirb', 'shadow', 'antispam', 'antispamlastclaim',
    'healthmonster',
    'pancing', 'pancingan', 'totalPancingan', 'anakpancingan',
    'umpan', 'sampah', 'potion',
])

const COOLDOWN_FIELDS = new Set([
    'lastseen', 'lastSetStatus', 'lastIstigfar', 'lastclaim', 'judilast',
    'lastnambang', 'lastnebang', 'lastkerja', 'lastmaling', 'lastbunuhi',
    'lastbisnis', 'lastberbisnis', 'lastmancing',
    'lastramuanclaim', 'lastgemclaim', 'lastpotionclaim', 'laststringclaim',
    'lastswordclaim', 'lastweaponclaim', 'lastironclaim', 'lastmancingclaim',
    'lastadventure', 'lastberburu', 'lastkill', 'lastfishing', 'lastdungeon', 'lastwar',
    'lastsda', 'lastberbru', 'lastduel', 'lastjb', 'lastmining', 'lasthunt', 'lasthun',
    'lastngocok', 'lastgift', 'lastrob', 'lastngojek', 'lastngewe', 'lastjualan',
    'lastngocokk', 'lastgrab', 'lastberkebon', 'lastcodereg', 'lastdagang',
    'lasthourly', 'lastweekly', 'lastyearly', 'lastmonthly',
    'lastturu', 'lastbansos', 'lastrampok', 'lastngaji', 'lastlonte', 'lastkoboy',
    'lastdate', 'lasttambang', 'lastngepet', 'lasttaxi', 'lastyoutuber', 'lastbossbattle',
    'lastberbisnis2',
])

const JOB_FIELDS = new Set([
    'kerjasatu', 'kerjadua', 'kerjatiga', 'kerjaempat', 'kerjalima', 'kerjaenam',
    'kerjatujuh', 'kerjadelapan', 'kerjasembilan', 'kerjasepuluh', 'kerjasebelas',
    'kerjaduabelas', 'kerjatigabelas', 'kerjaempatbelas', 'kerjalimabelas',
    'pekerjaansatu', 'pekerjaandua', 'pekerjaantiga', 'pekerjaanempat', 'pekerjaanlima',
    'pekerjaanenam', 'pekerjaantujuh', 'pekerjaandelapan', 'pekerjaansembilan',
    'pekerjaansepuluh', 'pekerjaansebelas', 'pekerjaanduabelas', 'pekerjaantigabelas',
    'pekerjaanempatbelas', 'pekerjaanlimabelas',
])

// ── Item, Tool, Pet sets ───────────────────────────────────

const DEFAULT_ITEMS = {
    resource: [
        'kayu', 'batu', 'wood', 'rock', 'coal', 'korekapi',
        'arlok', 'botol', 'kardus', 'kaleng', 'aqua',
    ],
    food: [
        'apel', 'ayamb', 'ayamg', 'sapir', 'ssapi', 'esteh',
        'leleg', 'leleb', 'soda', 'vodka', 'ganja', 'bandage',
        'sushi', 'roti', 'makanan',
    ],
    cooked: [
        'ayambakar', 'gulai', 'rendang', 'ayamgoreng', 'oporayam',
        'steak', 'babipanggang', 'ikanbakar', 'nilabakar', 'lelebakar',
        'bawalbakar', 'udangbakar', 'pausbakar', 'kepitingbakar',
    ],
    fish: [
        'paus', 'kepiting', 'gurita', 'cumi', 'buntal', 'dory',
        'lumba', 'lobster', 'hiu', 'udang', 'ikan', 'nila',
        'bawal', 'lele', 'orca',
    ],
    animal: [
        'banteng', 'harimau', 'gajah', 'kambing', 'panda',
        'buaya', 'kerbau', 'sapi', 'monyet', 'babihutan', 'babi', 'ayam',
    ],
    fruit: ['apel', 'anggur', 'jeruk', 'semangka', 'mangga', 'stroberi', 'pisang'],
    seed: ['bibitanggur', 'bibitpisang', 'bibitapel', 'bibitmangga', 'bibitjeruk'],
    rarity: [
        'common', 'as', 'uncommon', 'mythic', 'legendary',
        'glory', 'enchant', 'pet', 'psepick', 'psenjata',
    ],
}

// Buat map dari item name → category
const ITEM_CATEGORY_MAP = {}
for (const [cat, items] of Object.entries(DEFAULT_ITEMS)) {
    for (const item of items) {
        if (!ITEM_CATEGORY_MAP[item]) ITEM_CATEGORY_MAP[item] = cat
    }
}
const ALL_ITEM_NAMES = new Set(Object.keys(ITEM_CATEGORY_MAP))

const DEFAULT_TOOLS = [
    'armor', 'weapon', 'sword', 'pickaxe', 'fishingrod',
    'katana', 'bow', 'kapak', 'axe', 'pisau',
]
const ALL_TOOL_NAMES = new Set(DEFAULT_TOOLS)

const DEFAULT_PETS = [
    'kucing', 'kuda', 'rubah', 'anjing', 'serigala',
    'naga', 'phonix', 'griffin', 'kyubi', 'centaur',
]
const ALL_PET_NAMES = new Set(DEFAULT_PETS)

// ── User core fields (langsung ke tabel `users`) ──────────

const USER_CORE_FIELDS = new Set([
    'name', 'pushName', 'gender', 'registered', 'age', 'regTime', 'regSince',
    'setName', 'setAge', 'sn',
    'banned', 'bannedTime', 'Banneduser', 'bannedReason', 'banLevel', 'lastBanTime',
    'warn', 'moderator', 'timSupport', 'bannedUntil',
    'afk', 'afkReason',
    'premium', 'premiumTime', 'exifPack', 'exifAuthor',
    'exp', 'level', 'coin', 'atm', 'limit', 'glimit', 'tprem', 'tigame',
    'lbars', 'role', 'autolevelup', 'job', 'jobexp', 'vip', 'vipPoin', 'ajd', 'skata',
    'jail', 'penjara', 'dirawat', 'kingdom',
    'statusNikah', 'tanggalNikah', 'hamil', 'hamilStart',
    'lastKencan', 'lastCekAyang', 'lastRawatAnak',
    'slotNetWinLoss', 'spinLock', '_spinLock',
    'slotFreeSpins', 'slotFSBet', 'freespin', 'fsBet',
    'slotSpinning', 'isAutoSpinning', 'cancelAutoSpin', 'lastslot',
    'ds', 'chatgpt', 'guild', 'guildId', 'gift', 'portofolio', 'invest',
    'anak', 'properti', 'pasanganChar', 'lastCharSearch',
    'perkerjaandua',
])

// ── BigInt column sets per table ──────────────────────────

// Kolom-kolom yang bertipe BigInt di Prisma schema
const USER_BIGINT = new Set([
    'age', 'regTime', 'regSince', 'setName', 'setAge',
    'bannedTime', 'banLevel', 'lastBanTime', 'warn', 'bannedUntil',
    'afk', 'premium', 'premiumTime',
    'exp', 'level', 'coin', 'atm', 'limit', 'glimit', 'tprem', 'tigame',
    'jobexp', 'vipPoin', 'ajd', 'skata',
    'tanggalNikah', 'hamilStart', 'lastKencan', 'lastCekAyang', 'lastRawatAnak',
    'slotFreeSpins', 'freespin', 'lastslot',
    'perkerjaandua',
])

const ECO_BIGINT = new Set([
    'chip', 'tiketcoin', 'poin', 'litecoin', 'gems', 'cupon',
    'dana', 'gopay', 'ovo',
    'diamond', 'emerald', 'berlian', 'iron', 'emas', 'arlok',
    'bisnis', 'berbisnis', 'rumahsakit', 'fortress',
    'pertanian', 'pertambangan', 'camptroops', 'tambang',
    'penduduk', 'archer',
    'subscribers', 'viewers', 'like', 'playButton', 'taxi',
    'common', 'as', 'uncommon', 'mythic', 'legendary',
    'glory', 'enchant', 'pet', 'psepick', 'psenjata',
])

const ECO_FLOAT = new Set(['saldo', 'pengeluaran', 'money', 'bank', 'balance'])

const RPG_BIGINT = new Set([
    'healt', 'health', 'energi', 'power', 'stamina', 'haus', 'laper', 'title',
    'follow', 'lastfollow', 'followers',
    'pc', 'korbanngocok', 'ngewe', 'jualan', 'ngocokk', 'antarpaket',
    'ojekk', 'polisi', 'ojek', 'pedagang', 'dokter', 'petani', 'montir', 'kuli',
    'trofi', 'troopcamp',
    'attack', 'strenght', 'speed', 'defense', 'regeneration',
    'darahiblis', 'demonblood', 'demonkill', 'hashirakill',
    'alldemonkill', 'allhashirakill',
    'ramuan', 'string', 'eleksirb', 'shadow', 'antispam', 'antispamlastclaim',
    'healthmonster',
    'pancing', 'pancingan', 'totalPancingan', 'anakpancingan',
    'umpan', 'sampah', 'potion',
])

// ── Helper functions ──────────────────────────────────────

function safeBigInt(v, fallback = 0n) {
    if (v === null || v === undefined) return BigInt(fallback)
    try {
        return BigInt(Math.floor(Number(v)))
    } catch {
        return BigInt(fallback)
    }
}

function safeFloat(v, fallback = 0) {
    const n = Number(v)
    return isNaN(n) ? fallback : n
}

function safeBool(v, fallback = false) {
    if (typeof v === 'boolean') return v
    return fallback
}

function safeStr(v, fallback = '') {
    if (v === null || v === undefined) return fallback
    return String(v)
}

function safeJson(v) {
    if (v === null || v === undefined) return undefined
    if (typeof v === 'string') return v
    return JSON.stringify(v)
}

/**
 * Convert JSON flat user values to proper Prisma values
 * berdasarkan tipe kolom di schema
 */
function prepareUserCore(jid, flat) {
    const data = { jid }

    // Map aliased fields
    const nameVal = flat.name ?? flat.pushName ?? ''
    data.name = safeStr(nameVal)
    data.pushName = safeStr(flat.pushName ?? nameVal)

    data.gender = safeStr(flat.gender, 'lk')
    data.registered = safeBool(flat.registered)
    data.age = safeBigInt(flat.age, -1n)
    data.regTime = safeBigInt(flat.regTime, -1n)
    data.regSince = safeBigInt(flat.regSince, 0n)
    data.setName = safeBigInt(flat.setName, 0n)
    data.setAge = safeBigInt(flat.setAge, 0n)
    data.sn = safeStr(flat.sn)

    // Ban
    data.banned = safeBool(flat.banned)
    data.bannedTime = safeBigInt(flat.bannedTime, 0n)
    data.Banneduser = safeBool(flat.Banneduser)
    data.bannedReason = safeStr(flat.BannedReason ?? flat.bannedReason)
    data.banLevel = safeBigInt(flat.banLevel, 0n)
    data.lastBanTime = safeBigInt(flat.lastBanTime, 0n)
    data.warn = safeBigInt(flat.warn, 0n)
    data.moderator = safeBool(flat.moderator)
    data.timSupport = safeBool(flat.timSupport)
    data.bannedUntil = safeBigInt(flat.bannedUntil, 0n)

    // AFK
    data.afk = safeBigInt(flat.afk, -1n)
    data.afkReason = safeStr(flat.afkReason)

    // Premium
    data.premium = safeBigInt(flat.premium, 0n)
    data.premiumTime = safeBigInt(flat.premiumTime, 0n)
    data.exifPack = safeStr(flat.exifPack)
    data.exifAuthor = safeStr(flat.exifAuthor)

    // Level / Limit
    data.exp = safeBigInt(flat.exp, 0n)
    data.level = safeBigInt(flat.level, 0n)
    data.coin = safeBigInt(flat.coin, 0n)
    data.atm = safeBigInt(flat.atm, 0n)
    data.limit = safeBigInt(flat.limit, 500n)
    data.glimit = safeBigInt(flat.glimit, 10n)
    data.tprem = safeBigInt(flat.tprem, 0n)
    data.tigame = safeBigInt(flat.tigame, 5n)

    // Profile
    data.lbars = safeStr(flat.lbars, '[▒▒▒▒▒▒▒▒▒]')
    data.role = safeStr(flat.role, 'Newbie ㋡')
    data.autolevelup = safeBool(flat.autolevelup)
    data.job = safeStr(flat.job, 'Pengangguran')
    data.jobexp = safeBigInt(flat.jobexp, 0n)
    data.vip = safeStr(flat.vip, 'tidak')
    data.vipPoin = safeBigInt(flat.vipPoin, 0n)
    data.ajd = safeBigInt(flat.ajd, 0n)
    data.skata = safeBigInt(flat.skata, 0n)

    // Status flags
    data.jail = safeBool(flat.jail)
    data.penjara = safeBool(flat.penjara)
    data.dirawat = safeBool(flat.dirawat)
    data.kingdom = safeBool(flat.kingdom)

    // Marriage
    data.statusNikah = safeBool(flat.statusNikah)
    data.tanggalNikah = safeBigInt(flat.tanggalNikah, 0n)
    data.hamil = safeBool(flat.hamil)
    data.hamilStart = safeBigInt(flat.hamilStart, 0n)
    data.lastKencan = safeBigInt(flat.lastKencan, 0n)
    data.lastCekAyang = safeBigInt(flat.lastCekAyang, 0n)
    data.lastRawatAnak = safeBigInt(flat.lastRawatAnak, 0n)

    // Slot
    data.slotNetWinLoss = safeFloat(flat.slotNetWinLoss)
    data.spinLock = safeBool(flat._spinLock ?? flat.spinLock)
    data.slotFreeSpins = safeBigInt(flat.slotFreeSpins, 0n)
    data.slotFSBet = safeFloat(flat.slotFSBet)
    data.freespin = safeBigInt(flat.freespin, 0n)
    data.fsBet = safeFloat(flat.fsBet)
    data.slotSpinning = safeBool(flat.slotSpinning)
    data.isAutoSpinning = safeBool(flat.isAutoSpinning)
    data.cancelAutoSpin = safeBool(flat.cancelAutoSpin)
    data.lastslot = safeBigInt(flat.lastslot, 0n)

    // JSON fields
    if (flat.ds !== undefined) data.ds = safeJson(flat.ds) ?? '{"limit":20,"last":0}'
    if (flat.chatgpt !== undefined) data.chatgpt = safeJson(flat.chatgpt) ?? '{"lastReset":0,"usage":{}}'
    data.guildId = flat.guild ?? flat.guildId ?? null
    if (flat.gift !== undefined) data.gift = safeJson(flat.gift) ?? '{}'
    if (flat.portofolio !== undefined) data.portofolio = safeJson(flat.portofolio) ?? '{}'
    if (flat.invest !== undefined) data.invest = safeJson(flat.invest) ?? '{}'
    if (flat.anak !== undefined) data.anak = safeJson(flat.anak) ?? '[]'
    if (flat.properti !== undefined) data.properti = safeJson(flat.properti)
    if (flat.pasanganChar !== undefined) data.pasanganChar = safeJson(flat.pasanganChar)
    if (flat.lastCharSearch !== undefined) data.lastCharSearch = safeJson(flat.lastCharSearch)

    data.perkerjaandua = safeBigInt(flat.perkerjaandua, 0n)

    return data
}

function prepareEconomy(jid, flat) {
    const data = { jid }
    for (const f of ECONOMY_FIELDS) {
        if (flat[f] === undefined) continue
        if (ECO_FLOAT.has(f)) {
            data[f] = safeFloat(flat[f])
        } else if (ECO_BIGINT.has(f)) {
            data[f] = safeBigInt(flat[f])
        } else if (f === 'shield') {
            data[f] = safeBool(flat[f])
        } else {
            data[f] = safeBigInt(flat[f])
        }
    }
    return data
}

function prepareRpg(jid, flat) {
    const data = { jid }
    const RPG_STRING = new Set(['titlein', 'ultah', 'pasangan', 'sahabat', 'location', 'husbu', 'waifu',
        'rtrofi', 'skill', 'korps', 'korpsgrade', 'breaths', 'magic', 'demon'])

    for (const f of RPG_FIELDS) {
        if (flat[f] === undefined) continue
        if (RPG_STRING.has(f)) {
            data[f] = safeStr(flat[f])
        } else if (RPG_BIGINT.has(f)) {
            data[f] = safeBigInt(flat[f])
        } else {
            data[f] = safeBigInt(flat[f])
        }
    }
    return data
}

function prepareCooldown(jid, flat) {
    const data = { jid }
    for (const f of COOLDOWN_FIELDS) {
        if (flat[f] === undefined) continue
        data[f] = safeBigInt(flat[f])
    }
    return data
}

function prepareJob(jid, flat) {
    const data = { jid }
    for (const f of JOB_FIELDS) {
        if (flat[f] === undefined) continue
        data[f] = safeBigInt(flat[f])
    }
    return data
}

/**
 * Extract inventory, tools, pets dari flat user object
 */
function extractInventory(flat) {
    const items = []
    for (const [key, val] of Object.entries(flat)) {
        if (ALL_ITEM_NAMES.has(key) && !ECONOMY_FIELDS.has(key)) {
            const qty = Number(val) || 0
            if (qty > 0) {
                items.push({
                    itemName: key,
                    itemCategory: ITEM_CATEGORY_MAP[key] || 'resource',
                    quantity: BigInt(Math.floor(qty)),
                })
            }
        }
    }
    return items
}

function extractTools(flat) {
    const toolMap = {}
    for (const [key, val] of Object.entries(flat)) {
        if (key.endsWith('durability')) {
            const toolName = key.replace('durability', '')
            if (ALL_TOOL_NAMES.has(toolName)) {
                toolMap[toolName] = toolMap[toolName] || { owned: 0n, durability: 0n }
                toolMap[toolName].durability = safeBigInt(val)
            }
        } else if (ALL_TOOL_NAMES.has(key)) {
            toolMap[key] = toolMap[key] || { owned: 0n, durability: 0n }
            toolMap[key].owned = safeBigInt(val)
        }
    }
    // Hanya return tool yang owned > 0 atau durability > 0
    return Object.entries(toolMap)
        .filter(([, v]) => v.owned > 0n || v.durability > 0n)
        .map(([name, v]) => ({ toolName: name, owned: v.owned, durability: v.durability }))
}

function extractPets(flat) {
    const petMap = {}
    for (const [key, val] of Object.entries(flat)) {
        // anakkucing, anakanjing, etc
        if (key.startsWith('anak') && ALL_PET_NAMES.has(key.replace('anak', ''))) {
            const name = key.replace('anak', '')
            petMap[name] = petMap[name] || {}
            petMap[name].baby = safeBigInt(val)
            continue
        }
        // makanankucing, etc
        if (key.startsWith('makanan') && ALL_PET_NAMES.has(key.replace('makanan', ''))) {
            const name = key.replace('makanan', '')
            petMap[name] = petMap[name] || {}
            petMap[name].food = safeBigInt(val)
            continue
        }
        // kucinglastclaim, etc
        if (key.endsWith('lastclaim') && ALL_PET_NAMES.has(key.replace('lastclaim', ''))) {
            const name = key.replace('lastclaim', '')
            petMap[name] = petMap[name] || {}
            petMap[name].lastClaim = safeBigInt(val)
            continue
        }
        // kucingexp, etc
        if (key.endsWith('exp') && ALL_PET_NAMES.has(key.replace('exp', ''))) {
            const name = key.replace('exp', '')
            petMap[name] = petMap[name] || {}
            petMap[name].exp = safeBigInt(val)
            continue
        }
        // kucing (count)
        if (ALL_PET_NAMES.has(key)) {
            petMap[key] = petMap[key] || {}
            petMap[key].count = safeBigInt(val)
        }
    }

    return Object.entries(petMap)
        .filter(([, v]) => (v.count ?? 0n) > 0n || (v.baby ?? 0n) > 0n || (v.exp ?? 0n) > 0n)
        .map(([name, v]) => ({
            petName: name,
            count: v.count ?? 0n,
            baby: v.baby ?? 0n,
            exp: v.exp ?? 0n,
            food: v.food ?? 0n,
            lastClaim: v.lastClaim ?? 0n,
        }))
}

// ── MAIN MIGRATION ────────────────────────────────────────

async function main() {
    const dbPath = path.join(__dirname, 'database.json')
    if (!fs.existsSync(dbPath)) {
        console.error('❌ database.json tidak ditemukan!')
        process.exit(1)
    }

    console.log('📦 Membaca database.json ...')
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'))

    // ════════════════════════════════════════
    //  1. MIGRATE USERS
    // ════════════════════════════════════════
    const users = raw.users || {}
    const userJids = Object.keys(users)
    console.log(`👤 Total users: ${userJids.length}`)

    const BATCH = 100
    let migrated = 0
    let errors = 0

    for (let i = 0; i < userJids.length; i += BATCH) {
        const batch = userJids.slice(i, i + BATCH)

        await Promise.all(batch.map(async (jid) => {
            try {
                const flat = users[jid]
                if (!flat || typeof flat !== 'object') return

                // 1a. Core user
                const coreData = prepareUserCore(jid, flat)
                const { jid: _, ...createRest } = coreData
                await prisma.user.upsert({
                    where: { jid },
                    update: createRest,
                    create: coreData,
                })

                // 1b. Economy
                const ecoData = prepareEconomy(jid, flat)
                if (Object.keys(ecoData).length > 1) {
                    const { jid: __, ...ecoRest } = ecoData
                    await prisma.userEconomy.upsert({
                        where: { jid },
                        update: ecoRest,
                        create: ecoData,
                    })
                }

                // 1c. RPG
                const rpgData = prepareRpg(jid, flat)
                if (Object.keys(rpgData).length > 1) {
                    const { jid: __, ...rpgRest } = rpgData
                    await prisma.userRpg.upsert({
                        where: { jid },
                        update: rpgRest,
                        create: rpgData,
                    })
                }

                // 1d. Cooldown
                const cdData = prepareCooldown(jid, flat)
                if (Object.keys(cdData).length > 1) {
                    const { jid: __, ...cdRest } = cdData
                    await prisma.userCooldown.upsert({
                        where: { jid },
                        update: cdRest,
                        create: cdData,
                    })
                }

                // 1e. Job
                const jobData = prepareJob(jid, flat)
                if (Object.keys(jobData).length > 1) {
                    const { jid: __, ...jobRest } = jobData
                    await prisma.userJob.upsert({
                        where: { jid },
                        update: jobRest,
                        create: jobData,
                    })
                }

                // 1f. Inventory
                const invItems = extractInventory(flat)
                for (const item of invItems) {
                    await prisma.userInventory.upsert({
                        where: { jid_itemName: { jid, itemName: item.itemName } },
                        update: { quantity: item.quantity, itemCategory: item.itemCategory },
                        create: { jid, ...item },
                    })
                }

                // 1g. Tools
                const tools = extractTools(flat)
                for (const tool of tools) {
                    await prisma.userTool.upsert({
                        where: { jid_toolName: { jid, toolName: tool.toolName } },
                        update: { owned: tool.owned, durability: tool.durability },
                        create: { jid, ...tool },
                    })
                }

                // 1h. Pets
                const pets = extractPets(flat)
                for (const pet of pets) {
                    await prisma.userPet.upsert({
                        where: { jid_petName: { jid, petName: pet.petName } },
                        update: { count: pet.count, baby: pet.baby, exp: pet.exp, food: pet.food, lastClaim: pet.lastClaim },
                        create: { jid, ...pet },
                    })
                }

                migrated++
            } catch (err) {
                errors++
                if (errors <= 10) {
                    console.error(`  ⚠️  Error user ${jid}:`, err.message)
                }
            }
        }))

        const pct = Math.round(((i + batch.length) / userJids.length) * 100)
        process.stdout.write(`\r  👤 Users: ${migrated} migrated, ${errors} errors (${pct}%)`)
    }
    console.log(`\n  ✅ Users done: ${migrated} migrated, ${errors} errors`)

    // ════════════════════════════════════════
    //  2. MIGRATE CHATS
    // ════════════════════════════════════════
    const chats = raw.chats || {}
    const chatIds = Object.keys(chats)
    console.log(`💬 Total chats: ${chatIds.length}`)

    let chatMigrated = 0
    let chatErrors = 0

    for (let i = 0; i < chatIds.length; i += BATCH) {
        const batch = chatIds.slice(i, i + BATCH)

        await Promise.all(batch.map(async (chatId) => {
            try {
                const c = chats[chatId]
                if (!c || typeof c !== 'object') return

                const data = {
                    chatId,
                    onlyAdmin: safeBool(c.onlyAdmin),
                    isBanned: safeBool(c.isBanned),
                    welcome: safeBool(c.welcome, true),
                    welcometype: safeBigInt(c.welcometype, 1n),
                    detect: safeBool(c.detect),
                    isBannedTime: safeBool(c.isBannedTime),
                    mute: safeBool(c.mute),
                    listStr: safeJson(c.listStr) ?? '{}',
                    sWelcome: safeStr(c.sWelcome, 'Hai, @user!\nSelamat datang di grup @subject\n\n@desc'),
                    sBye: safeStr(c.sBye, 'Selamat tinggal @user!'),
                    sPromote: safeStr(c.sPromote),
                    sDemote: safeStr(c.sDemote),
                    delete: safeBool(c.delete, true),
                    antiLink: safeBool(c.antiLink, true),
                    antiLinknokick: safeBool(c.antiLinknokick),
                    antiSticker: safeBool(c.antiSticker),
                    antiStickernokick: safeBool(c.antiStickernokick),
                    viewonce: safeBool(c.viewonce),
                    antiToxic: safeBool(c.antiToxic),
                    antiDelete: safeBool(c.antiDelete),
                    antibot: safeBool(c.antibot),
                    expired: safeBigInt(c.expired, 0n),
                    memgc: safeJson(c.memgc) ?? '{}',
                    blacklistUsers: safeJson(c.blacklistUsers) ?? '{}',
                    rpg: safeBool(c.rpg),

                    antilinkig: safeBool(c.antilinkig),
                    antilinkignokick: safeBool(c.antilinkignokick),
                    antilinkfb: safeBool(c.antilinkfb),
                    antilinkfbnokick: safeBool(c.antilinkfbnokick),
                    antilinktwit: safeBool(c.antilinktwit),
                    antilinktwitnokick: safeBool(c.antilinktwitnokick),
                    antilinkyt: safeBool(c.antilinkyt),
                    antilinkytnokick: safeBool(c.antilinkytnokick),
                    antilinktele: safeBool(c.antilinktele),
                    antilinktelenokick: safeBool(c.antilinktelenokick),
                    antilinkwame: safeBool(c.antilinkwame),
                    antilinkwamenokick: safeBool(c.antilinkwamenokick),
                    antilinkall: safeBool(c.antilinkall),
                    antilinkallnokick: safeBool(c.antilinkallnokick),
                    antilinktt: safeBool(c.antilinktt),
                    antilinkttnokick: safeBool(c.antilinkttnokick),
                }

                const { chatId: _, ...updateData } = data
                await prisma.chat.upsert({
                    where: { chatId },
                    update: updateData,
                    create: data,
                })

                chatMigrated++
            } catch (err) {
                chatErrors++
                if (chatErrors <= 10) {
                    console.error(`  ⚠️  Error chat ${chatId}:`, err.message)
                }
            }
        }))

        const pct = Math.round(((i + batch.length) / chatIds.length) * 100)
        process.stdout.write(`\r  💬 Chats: ${chatMigrated} migrated, ${chatErrors} errors (${pct}%)`)
    }
    console.log(`\n  ✅ Chats done: ${chatMigrated} migrated, ${chatErrors} errors`)

    // ════════════════════════════════════════
    //  3. MIGRATE GUILDS
    // ════════════════════════════════════════
    const guilds = raw.guilds || {}
    const guildIds = Object.keys(guilds)
    if (guildIds.length) {
        console.log(`🏰 Total guilds: ${guildIds.length}`)
        let guildMigrated = 0
        let guildErrors = 0

        for (const guildId of guildIds) {
            try {
                const g = guilds[guildId]
                if (!g || typeof g !== 'object') continue

                const data = {
                    id: guildId,
                    name: safeStr(g.name, 'Unknown Guild'),
                    isPrivate: safeBool(g.isPrivate),
                    owner: safeStr(g.owner),
                    level: Number(g.level) || 1,
                    exp: Number(g.exp) || 0,
                    eliksir: Number(g.eliksir) || 0,
                    harta: safeBigInt(g.harta),
                    guardian: g.guardian ?? null,
                    attack: Number(g.attack) || 0,
                    staff: safeJson(g.staff) ?? '[]',
                    waitingRoom: safeJson(g.waitingRoom) ?? '[]',
                    members: safeJson(g.members) ?? '[]',
                }

                if (!data.owner) {
                    guildErrors++
                    continue
                }

                const { id: _, ...updateData } = data
                await prisma.guild.upsert({
                    where: { id: guildId },
                    update: updateData,
                    create: data,
                }).catch(err => {
                    guildErrors++
                    if (guildErrors <= 5) console.error(`  ⚠️ Guild ${guildId}:`, err.message)
                })

                guildMigrated++
            } catch (err) {
                guildErrors++
                if (guildErrors <= 5) console.error(`  ⚠️ Guild error ${guildId}:`, err.message)
            }
        }
        console.log(`  ✅ Guilds done: ${guildMigrated} migrated, ${guildErrors} errors`)
    }

    // ════════════════════════════════════════
    //  4. MIGRATE COMMAND STATS
    // ════════════════════════════════════════
    const stats = raw.stats || {}
    const statKeys = Object.keys(stats)
    if (statKeys.length) {
        console.log(`📊 Total command stats: ${statKeys.length}`)
        let statMigrated = 0

        for (const pluginName of statKeys) {
            try {
                const s = stats[pluginName]
                if (!s || typeof s !== 'object') continue

                await prisma.commandStats.upsert({
                    where: { pluginName },
                    update: {
                        total: safeBigInt(s.total),
                        success: safeBigInt(s.success),
                        last: safeBigInt(s.last),
                        lastSuccess: safeBigInt(s.lastSuccess),
                    },
                    create: {
                        pluginName,
                        total: safeBigInt(s.total),
                        success: safeBigInt(s.success),
                        last: safeBigInt(s.last),
                        lastSuccess: safeBigInt(s.lastSuccess),
                    },
                })
                statMigrated++
            } catch { }
        }
        console.log(`  ✅ Stats done: ${statMigrated}`)
    }

    // ════════════════════════════════════════
    //  SUMMARY
    // ════════════════════════════════════════
    console.log('\n' + '═'.repeat(50))
    console.log('🎉 Migrasi selesai!')
    console.log(`  👤 Users : ${migrated} (${errors} error)`)
    console.log(`  💬 Chats : ${chatMigrated} (${chatErrors} error)`)
    console.log('═'.repeat(50))

    await prisma.$disconnect()
}

main().catch(err => {
    console.error('❌ Fatal error:', err)
    prisma.$disconnect()
    process.exit(1)
})
