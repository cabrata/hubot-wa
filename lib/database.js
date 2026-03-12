'use strict'

const { PrismaClient } = require('@prisma/client')

let prisma = null

/**
 * Prisma Client Singleton — mencegah multiple instance
 */
function getClient() {
    if (!prisma) {
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
        })
    }
    return prisma
}

const db = getClient()

// =============================================
//  DEFAULT ITEMS UNTUK INVENTORY
// =============================================
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

const DEFAULT_TOOLS = [
    'armor', 'weapon', 'sword', 'pickaxe', 'fishingrod',
    'katana', 'bow', 'kapak', 'axe', 'pisau',
]

const DEFAULT_PETS = [
    'kucing', 'kuda', 'rubah', 'anjing', 'serigala',
    'naga', 'phonix', 'griffin', 'kyubi', 'centaur',
]

// =============================================
//  FLATTEN USER — Menggabungkan semua relasi
//  menjadi flat object seperti struktur JSON lama
// =============================================
function flattenUser(user) {
    if (!user) return null

    const eco = user.economy || {}
    const rpg = user.rpg || {}
    const cd = user.cooldown || {}
    const job = user.jobStats || {}

    // Inventory → object { itemName: quantity }
    const inv = {}
    for (const item of (user.inventory || [])) {
        inv[item.itemName] = Number(item.quantity)
    }

    // Tools → { toolName: owned, toolNamedurability: durability }
    const tools = {}
    for (const t of (user.tools || [])) {
        tools[t.toolName] = t.owned
        tools[`${t.toolName}durability`] = t.durability
    }

    // Pets → { petName: count, petNamelastclaim: lastClaim, petNameexp: exp, ... }
    const pets = {}
    for (const p of (user.pets || [])) {
        pets[p.petName] = p.count
        pets[`${p.petName}lastclaim`] = Number(p.lastClaim)
        pets[`anak${p.petName}`] = p.baby
        pets[`${p.petName}exp`] = Number(p.exp)
        pets[`makanan${p.petName}`] = Number(p.food)
    }

    return {
        // ── Core ──
        id: user.jid,
        name: user.name,
        gender: user.gender,
        registered: user.registered,
        age: user.age,
        regTime: Number(user.regTime),
        regSince: Number(user.regSince),
        setName: Number(user.setName),
        setAge: Number(user.setAge),
        sn: user.sn,

        // ── Ban / Mod ──
        banned: user.banned,
        bannedTime: Number(user.bannedTime),
        Banneduser: user.Banneduser,
        BannedReason: user.BannedReason,
        banLevel: user.banLevel,
        lastBanTime: Number(user.lastBanTime),
        warn: user.warn,
        moderator: user.moderator,
        timSupport: user.timSupport,

        // ── AFK ──
        afk: Number(user.afk),
        afkReason: user.afkReason,

        // ── Premium ──
        premium: Number(user.premium),
        premiumTime: Number(user.premiumTime),
        exifPack: user.exifPack,
        exifAuthor: user.exifAuthor,

        // ── Level / Limit ──
        exp: Number(user.exp),
        level: user.level,
        coin: Number(user.coin),
        atm: Number(user.atm),
        limit: user.limit,
        glimit: user.glimit,
        tprem: user.tprem,
        tigame: user.tigame,

        // ── Profile ──
        lbars: user.lbars,
        role: user.role,
        autolevelup: user.autolevelup,
        job: user.job,
        jobexp: user.jobexp,
        vip: user.vip,
        vipPoin: user.vipPoin,
        ajd: user.ajd,
        skata: user.skata,

        // ── Status flags ──
        jail: user.jail,
        penjara: user.penjara,
        dirawat: user.dirawat,
        kingdom: user.kingdom,

        // ── Marriage / Social ──
        statusNikah: user.statusNikah,
        tanggalNikah: Number(user.tanggalNikah),
        hamil: user.hamil,
        hamilStart: Number(user.hamilStart),
        lastKencan: Number(user.lastKencan),
        lastCekAyang: Number(user.lastCekAyang),
        lastRawatAnak: Number(user.lastRawatAnak),

        // ── Slot ──
        slotNetWinLoss: user.slotNetWinLoss,
        _spinLock: user.spinLock,
        slotFreeSpins: user.slotFreeSpins,
        slotFSBet: user.slotFSBet,
        freespin: user.freespin,
        fsBet: user.fsBet,
        slotSpinning: user.slotSpinning,
        isAutoSpinning: user.isAutoSpinning,
        cancelAutoSpin: user.cancelAutoSpin,
        lastslot: Number(user.lastslot),

        // ── JSON fields ──
        swm: user.swm,
        ds: user.ds,
        chatgpt: user.chatgpt,
        guild: user.guildId,
        gift: user.gift,
        portofolio: user.portofolio,
        invest: user.invest,
        anak: user.anak,
        properti: user.properti,
        pasanganChar: user.pasanganChar,
        lastCharSearch: user.lastCharSearch,

        perkerjaandua: Number(user.perkerjaandua),

        // ── Economy ──
        saldo: eco.saldo ?? 0,
        pengeluaran: eco.pengeluaran ?? 0,
        money: eco.money ?? 0,
        bank: eco.bank ?? 0,
        balance: eco.balance ?? 0,
        chip: Number(eco.chip ?? 0),
        tiketcoin: Number(eco.tiketcoin ?? 0),
        poin: Number(eco.poin ?? 0),
        litecoin: Number(eco.litecoin ?? 0),
        gems: Number(eco.gems ?? 0),
        cupon: Number(eco.cupon ?? 0),
        dana: Number(eco.dana ?? 0),
        gopay: Number(eco.gopay ?? 0),
        ovo: Number(eco.ovo ?? 0),
        diamond: Number(eco.diamond ?? 0),
        emerald: Number(eco.emerald ?? 0),
        berlian: Number(eco.berlian ?? 0),
        iron: Number(eco.iron ?? 0),
        emas: Number(eco.emas ?? 0),
        arlok: Number(eco.arlok ?? 0),
        bisnis: Number(eco.bisnis ?? 0),
        berbisnis: Number(eco.berbisnis ?? 0),
        rumahsakit: Number(eco.rumahsakit ?? 0),
        fortress: Number(eco.fortress ?? 0),
        shield: eco.shield ?? false,
        pertanian: Number(eco.pertanian ?? 0),
        pertambangan: Number(eco.pertambangan ?? 0),
        camptroops: Number(eco.camptroops ?? 0),
        tambang: Number(eco.tambang ?? 0),
        penduduk: Number(eco.penduduk ?? 0),
        archer: Number(eco.archer ?? 0),
        subscribers: Number(eco.subscribers ?? 0),
        viewers: Number(eco.viewers ?? 0),
        like: Number(eco.like ?? 0),
        playButton: Number(eco.playButton ?? 0),
        taxi: Number(eco.taxi ?? 0),
        common: Number(eco.common ?? 0),
        as: Number(eco.as ?? 0),
        uncommon: Number(eco.uncommon ?? 0),
        mythic: Number(eco.mythic ?? 0),
        legendary: Number(eco.legendary ?? 0),
        glory: Number(eco.glory ?? 0),
        enchant: Number(eco.enchant ?? 0),
        pet: Number(eco.pet ?? 0),
        psepick: Number(eco.psepick ?? 0),
        psenjata: Number(eco.psenjata ?? 0),

        // ── RPG ──
        healt: rpg.healt ?? 100,
        health: rpg.health ?? 100,
        energi: rpg.energi ?? 100,
        power: rpg.power ?? 100,
        stamina: rpg.stamina ?? 100,
        haus: rpg.haus ?? 100,
        laper: rpg.laper ?? 100,
        title: rpg.title ?? 0,
        titlein: rpg.titlein ?? 'Belum Ada',
        ultah: rpg.ultah ?? '',
        pasangan: rpg.pasangan ?? '',
        sahabat: rpg.sahabat ?? '',
        location: rpg.location ?? 'Gubuk',
        husbu: rpg.husbu ?? 'Belum Di Set',
        waifu: rpg.waifu ?? 'Belum Di Set',
        follow: Number(rpg.follow ?? 0),
        lastfollow: Number(rpg.lastfollow ?? 0),
        followers: Number(rpg.followers ?? 0),
        pc: Number(rpg.pc ?? 0),
        korbanngocok: Number(rpg.korbanngocok ?? 0),
        ngewe: Number(rpg.ngewe ?? 0),
        jualan: Number(rpg.jualan ?? 0),
        ngocokk: Number(rpg.ngocokk ?? 0),
        antarpaket: Number(rpg.antarpaket ?? 0),
        ojekk: Number(rpg.ojekk ?? 0),
        polisi: Number(rpg.polisi ?? 0),
        ojek: Number(rpg.ojek ?? 0),
        pedagang: Number(rpg.pedagang ?? 0),
        dokter: Number(rpg.dokter ?? 0),
        petani: Number(rpg.petani ?? 0),
        montir: Number(rpg.montir ?? 0),
        kuli: Number(rpg.kuli ?? 0),
        trofi: Number(rpg.trofi ?? 0),
        rtrofi: rpg.rtrofi ?? 'Perunggu',
        troopcamp: Number(rpg.troopcamp ?? 0),
        attack: rpg.attack ?? 0,
        strenght: rpg.strenght ?? 0,
        speed: rpg.speed ?? 0,
        defense: rpg.defense ?? 0,
        regeneration: rpg.regeneration ?? 0,
        skill: rpg.skill ?? '',
        korps: rpg.korps ?? '',
        korpsgrade: rpg.korpsgrade ?? '',
        breaths: rpg.breaths ?? '',
        magic: rpg.magic ?? '',
        demon: rpg.demon ?? '',
        darahiblis: Number(rpg.darahiblis ?? 0),
        demonblood: Number(rpg.demonblood ?? 0),
        demonkill: Number(rpg.demonkill ?? 0),
        hashirakill: Number(rpg.hashirakill ?? 0),
        alldemonkill: Number(rpg.alldemonkill ?? 0),
        allhashirakill: Number(rpg.allhashirakill ?? 0),
        ramuan: Number(rpg.ramuan ?? 0),
        string: Number(rpg.string ?? 0),
        eleksirb: Number(rpg.eleksirb ?? 0),
        shadow: Number(rpg.shadow ?? 0),
        antispam: Number(rpg.antispam ?? 0),
        antispamlastclaim: Number(rpg.antispamlastclaim ?? 0),
        healthmonster: Number(rpg.healthmonster ?? 0),
        pancing: Number(rpg.pancing ?? 0),
        pancingan: Number(rpg.pancingan ?? 0),
        totalPancingan: Number(rpg.totalPancingan ?? 0),
        anakpancingan: Number(rpg.anakpancingan ?? 0),
        umpan: Number(rpg.umpan ?? 0),
        sampah: Number(rpg.sampah ?? 0),
        potion: Number(rpg.potion ?? 0),

        // ── Cooldown ──
        lastseen: Number(cd.lastseen ?? 0),
        lastSetStatus: Number(cd.lastSetStatus ?? 0),
        lastIstigfar: Number(cd.lastIstigfar ?? 0),
        lastclaim: Number(cd.lastclaim ?? 0),
        judilast: Number(cd.judilast ?? 0),
        lastnambang: Number(cd.lastnambang ?? 0),
        lastnebang: Number(cd.lastnebang ?? 0),
        lastkerja: Number(cd.lastkerja ?? 0),
        lastmaling: Number(cd.lastmaling ?? 0),
        lastbunuhi: Number(cd.lastbunuhi ?? 0),
        lastbisnis: Number(cd.lastbisnis ?? 0),
        lastberbisnis: Number(cd.lastberbisnis ?? 0),
        lastmancing: Number(cd.lastmancing ?? 0),
        lastramuanclaim: Number(cd.lastramuanclaim ?? 0),
        lastgemclaim: Number(cd.lastgemclaim ?? 0),
        lastpotionclaim: Number(cd.lastpotionclaim ?? 0),
        laststringclaim: Number(cd.laststringclaim ?? 0),
        lastswordclaim: Number(cd.lastswordclaim ?? 0),
        lastweaponclaim: Number(cd.lastweaponclaim ?? 0),
        lastironclaim: Number(cd.lastironclaim ?? 0),
        lastmancingclaim: Number(cd.lastmancingclaim ?? 0),
        lastadventure: Number(cd.lastadventure ?? 0),
        lastberburu: Number(cd.lastberburu ?? 0),
        lastkill: Number(cd.lastkill ?? 0),
        lastfishing: Number(cd.lastfishing ?? 0),
        lastdungeon: Number(cd.lastdungeon ?? 0),
        lastwar: Number(cd.lastwar ?? 0),
        lastsda: Number(cd.lastsda ?? 0),
        lastberbru: Number(cd.lastberbru ?? 0),
        lastduel: Number(cd.lastduel ?? 0),
        lastjb: Number(cd.lastjb ?? 0),
        lastmining: Number(cd.lastmining ?? 0),
        lasthunt: Number(cd.lasthunt ?? 0),
        lasthun: Number(cd.lasthun ?? 0),
        lastngocok: Number(cd.lastngocok ?? 0),
        lastgift: Number(cd.lastgift ?? 0),
        lastrob: Number(cd.lastrob ?? 0),
        lastngojek: Number(cd.lastngojek ?? 0),
        lastngewe: Number(cd.lastngewe ?? 0),
        lastjualan: Number(cd.lastjualan ?? 0),
        lastngocokk: Number(cd.lastngocokk ?? 0),
        lastgrab: Number(cd.lastgrab ?? 0),
        lastberkebon: Number(cd.lastberkebon ?? 0),
        lastcodereg: Number(cd.lastcodereg ?? 0),
        lastdagang: Number(cd.lastdagang ?? 0),
        lasthourly: Number(cd.lasthourly ?? 0),
        lastweekly: Number(cd.lastweekly ?? 0),
        lastyearly: Number(cd.lastyearly ?? 0),
        lastmonthly: Number(cd.lastmonthly ?? 0),
        lastturu: Number(cd.lastturu ?? 0),
        lastbansos: Number(cd.lastbansos ?? 0),
        lastrampok: Number(cd.lastrampok ?? 0),
        lastngaji: Number(cd.lastngaji ?? 0),
        lastlonte: Number(cd.lastlonte ?? 0),
        lastkoboy: Number(cd.lastkoboy ?? 0),
        lastdate: Number(cd.lastdate ?? 0),
        lasttambang: Number(cd.lasttambang ?? 0),
        lastngepet: Number(cd.lastngepet ?? 0),
        lasttaxi: Number(cd.lasttaxi ?? 0),
        lastyoutuber: Number(cd.lastyoutuber ?? 0),
        lastbossbattle: Number(cd.lastbossbattle ?? 0),

        // ── Job counters ──
        kerjasatu: job.kerjasatu ?? 0,
        kerjadua: job.kerjadua ?? 0,
        kerjatiga: job.kerjatiga ?? 0,
        kerjaempat: job.kerjaempat ?? 0,
        kerjalima: job.kerjalima ?? 0,
        kerjaenam: job.kerjaenam ?? 0,
        kerjatujuh: job.kerjatujuh ?? 0,
        kerjadelapan: job.kerjadelapan ?? 0,
        kerjasembilan: job.kerjasembilan ?? 0,
        kerjasepuluh: job.kerjasepuluh ?? 0,
        kerjasebelas: job.kerjasebelas ?? 0,
        kerjaduabelas: job.kerjaduabelas ?? 0,
        kerjatigabelas: job.kerjatigabelas ?? 0,
        kerjaempatbelas: job.kerjaempatbelas ?? 0,
        kerjalimabelas: job.kerjalimabelas ?? 0,
        pekerjaansatu: job.pekerjaansatu ?? 0,
        pekerjaandua: job.pekerjaandua ?? 0,
        pekerjaantiga: job.pekerjaantiga ?? 0,
        pekerjaanempat: job.pekerjaanempat ?? 0,
        pekerjaanlima: job.pekerjaanlima ?? 0,
        pekerjaanenam: job.pekerjaanenam ?? 0,
        pekerjaantujuh: job.pekerjaantujuh ?? 0,
        pekerjaandelapan: job.pekerjaandelapan ?? 0,
        pekerjaansembilan: job.pekerjaansembilan ?? 0,
        pekerjaansepuluh: job.pekerjaansepuluh ?? 0,
        pekerjaansebelas: job.pekerjaansebelas ?? 0,
        pekerjaanduabelas: job.pekerjaanduabelas ?? 0,
        pekerjaantigabelas: job.pekerjaantigabelas ?? 0,
        pekerjaanempatbelas: job.pekerjaanempatbelas ?? 0,
        pekerjaanlimabelas: job.pekerjaanlimabelas ?? 0,

        // ── Inventory (merged flat) ──
        ...inv,

        // ── Tools (merged flat) ──
        ...tools,

        // ── Pets (merged flat) ──
        ...pets,
    }
}

// =============================================
//  USER HELPERS
// =============================================

/**
 * Get atau create user, return flat-compatible object
 */
async function getUser(jid, pushName) {
    if (!jid || typeof jid !== 'string') return null

    const user = await db.user.upsert({
        where: { jid },
        update: pushName ? { pushName } : {},
        create: {
            jid,
            name: pushName || '',
            pushName: pushName || '',
            economy: { create: {} },
            rpg: { create: {} },
            cooldown: { create: {} },
            jobStats: { create: {} },
        },
        include: {
            economy: true,
            rpg: true,
            cooldown: true,
            jobStats: true,
            inventory: true,
            tools: true,
            pets: true,
        },
    })

    return flattenUser(user)
}

/**
 * Ambil raw Prisma user (dengan relasi), tanpa flatten
 */
async function getRawUser(jid) {
    return db.user.findUnique({
        where: { jid },
        include: {
            economy: true,
            rpg: true,
            cooldown: true,
            jobStats: true,
            inventory: true,
            tools: true,
            pets: true,
        },
    })
}

/**
 * Update nama user jika berubah
 */
async function updateUserName(jid, name) {
    if (!jid) return
    await db.user.update({ where: { jid }, data: { name, pushName: name } }).catch(() => { })
}

/**
 * Update field-field core User
 */
async function updateUser(jid, data) {
    if (!jid) return null
    return saveUser(jid, data, true) // Pass true to indicate direct call
}

/**
 * Update economy fields
 */
async function updateEconomy(jid, data) {
    if (!jid) return null
    return saveUser(jid, data, true)
}

/**
 * Update RPG fields
 */
async function updateRpg(jid, data) {
    if (!jid) return null
    return saveUser(jid, data, true)
}

/**
 * Update cooldown fields
 */
async function updateCooldown(jid, data) {
    if (!jid) return null
    return saveUser(jid, data, true)
}

/**
 * Update job counter fields
 */
async function updateJob(jid, data) {
    if (!jid) return null
    return saveUser(jid, data, true)
}

// =============================================
//  INVENTORY HELPERS
// =============================================

async function getInventory(jid, itemName) {
    try {
        const item = await db.userInventory.findUnique({
            where: { jid_itemName: { jid, itemName } },
        })
        return Number(item?.quantity ?? 0)
    } catch {
        return 0
    }
}

async function setInventory(jid, itemName, quantity, category = 'resource') {
    return db.userInventory.upsert({
        where: { jid_itemName: { jid, itemName } },
        update: { quantity: BigInt(Math.floor(quantity)) },
        create: { jid, itemName, itemCategory: category, quantity: BigInt(Math.floor(quantity)) },
    })
}

async function addInventory(jid, itemName, amount, category = 'resource') {
    const current = await getInventory(jid, itemName)
    return setInventory(jid, itemName, current + amount, category)
}

async function removeInventory(jid, itemName, amount) {
    const current = await getInventory(jid, itemName)
    const newQty = Math.max(0, current - amount)
    return setInventory(jid, itemName, newQty)
}

/**
 * Ambil semua inventory user sebagai object flat
 */
async function getAllInventory(jid) {
    const items = await db.userInventory.findMany({ where: { jid } })
    const result = {}
    for (const item of items) result[item.itemName] = Number(item.quantity)
    return result
}

// =============================================
//  TOOL HELPERS
// =============================================

async function getTool(jid, toolName) {
    try {
        const tool = await db.userTool.findUnique({
            where: { jid_toolName: { jid, toolName } },
        })
        return tool ? { owned: tool.owned, durability: tool.durability } : { owned: 0, durability: 0 }
    } catch {
        return { owned: 0, durability: 0 }
    }
}

async function setTool(jid, toolName, owned, durability) {
    return db.userTool.upsert({
        where: { jid_toolName: { jid, toolName } },
        update: { owned, durability },
        create: { jid, toolName, owned, durability },
    })
}

// =============================================
//  PET HELPERS
// =============================================

async function getPet(jid, petName) {
    try {
        const pet = await db.userPet.findUnique({
            where: { jid_petName: { jid, petName } },
        })
        return pet
            ? {
                count: pet.count,
                baby: pet.baby,
                exp: Number(pet.exp),
                food: Number(pet.food),
                lastClaim: Number(pet.lastClaim),
            }
            : { count: 0, baby: 0, exp: 0, food: 0, lastClaim: 0 }
    } catch {
        return { count: 0, baby: 0, exp: 0, food: 0, lastClaim: 0 }
    }
}

async function setPet(jid, petName, data) {
    const safeData = {
        count: data.count ?? 0,
        baby: data.baby ?? 0,
        exp: BigInt(data.exp ?? 0),
        food: BigInt(data.food ?? 0),
        lastClaim: BigInt(data.lastClaim ?? 0),
    }
    return db.userPet.upsert({
        where: { jid_petName: { jid, petName } },
        update: safeData,
        create: { jid, petName, ...safeData },
    })
}

// =============================================
//  CHAT HELPERS
// =============================================

async function getChat(chatId) {
    if (!chatId) return null
    let chat = await db.chat.findUnique({ where: { chatId } })
    if (!chat) {
        chat = await db.chat.create({ data: { chatId } })
    }
    return {
        ...chat,
        listStr: _parseJSON(chat.listStr, {}),
        blacklistUsers: _parseJSON(chat.blacklistUsers, {}),
        memgc: _parseJSON(chat.memgc, {}),
    }
}

async function updateChat(chatId, data) {
    if (data.listStr && typeof data.listStr === 'object') data.listStr = JSON.stringify(data.listStr)
    if (data.blacklistUsers && typeof data.blacklistUsers === 'object') data.blacklistUsers = JSON.stringify(data.blacklistUsers)
    if (data.memgc && typeof data.memgc === 'object') data.memgc = JSON.stringify(data.memgc)

    return db.chat.upsert({
        where: { chatId },
        update: data,
        create: { chatId, ...data },
    })
}

// =============================================
//  COMMAND STATS HELPER
// =============================================

async function updateCommandStats(pluginName, isError) {
    const now = BigInt(Date.now())
    const existing = await db.commandStats.findUnique({ where: { pluginName } })

    if (existing) {
        await db.commandStats.update({
            where: { pluginName },
            data: {
                total: { increment: 1 },
                success: isError ? undefined : { increment: 1 },
                last: now,
                lastSuccess: isError ? undefined : now,
            },
        })
    } else {
        await db.commandStats.create({
            data: {
                pluginName,
                total: 1,
                success: isError ? 0 : 1,
                last: now,
                lastSuccess: isError ? 0n : now,
            },
        })
    }
}

// =============================================
//  HELPERS INTERNAL
// =============================================

function _parseJSON(str, fallback) {
    try { return JSON.parse(str || 'null') ?? fallback }
    catch { return fallback }
}

/**
 * Konversi semua value number dalam object ke BigInt
 * (dipakai untuk tabel cooldown yang semua kolomnya BigInt)
 */
function _toBigInt(data) {
    const result = {}
    for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'number') {
            result[k] = BigInt(Math.floor(v))
        } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            result[k] = {}
            for (const [op, opVal] of Object.entries(v)) {
                result[k][op] = typeof opVal === 'number' ? BigInt(Math.floor(opVal)) : opVal
            }
        } else {
            result[k] = v
        }
    }
    return result
}

/**
 * Bersihkan data sebelum dikirim ke Prisma
 * (hindari update field yang tidak ada di model)
 */
function _cleanData(data) {
    const result = {}
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) result[k] = v
    }
    return result
}

/**
 * Resolve Prisma atomic operations into initial values for creation
 */
function _resolveCreateData(data) {
    const result = {}
    for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            if ('increment' in v) result[k] = v.increment
            else if ('decrement' in v) result[k] = typeof v.decrement === 'bigint' ? -v.decrement : -v.decrement
            else if ('set' in v) result[k] = v.set
            else if ('multiply' in v) result[k] = 0n // Fallback for multiply
            else if ('divide' in v) result[k] = 0n // Fallback for divide
            else result[k] = v
        } else {
            result[k] = v
        }
    }
    return result
}

// =============================================
//  BATCH UPDATE UTILITY
//  — update banyak tabel sekaligus dari flat object
// =============================================

const USER_CORE_FIELDS = new Set([
    'name', 'pushName', 'gender', 'registered', 'age', 'regTime', 'regSince', 'setName', 'setAge', 'sn',
    'banned', 'bannedTime', 'Banneduser', 'BannedReason', 'banLevel', 'lastBanTime', 'warn', 'moderator', 'timSupport',
    'afk', 'afkReason', 'premium', 'premiumTime', 'exifPack', 'exifAuthor', 'exp', 'level', 'coin', 'atm', 'limit', 'glimit', 'tprem', 'tigame',
    'lbars', 'role', 'autolevelup', 'job', 'jobexp', 'vip', 'vipPoin', 'ajd', 'skata',
    'jail', 'penjara', 'dirawat', 'kingdom',
    'statusNikah', 'tanggalNikah', 'hamil', 'hamilStart', 'lastKencan', 'lastCekAyang', 'lastRawatAnak',
    'slotNetWinLoss', '_spinLock', 'slotFreeSpins', 'slotFSBet', 'freespin', 'fsBet',
    'slotSpinning', 'isAutoSpinning', 'cancelAutoSpin', 'lastslot',
    'swm', 'ds', 'chatgpt', 'guild', 'gift', 'portofolio', 'invest', 'anak', 'properti', 'pasanganChar', 'lastCharSearch',
    'perkerjaandua',
])

const ECONOMY_FIELDS = new Set([
    'saldo', 'pengeluaran', 'money', 'bank', 'balance', 'chip', 'tiketcoin', 'poin', 'litecoin', 'gems', 'cupon',
    'dana', 'gopay', 'ovo', 'diamond', 'emerald', 'berlian', 'iron', 'emas', 'arlok',
    'bisnis', 'berbisnis', 'rumahsakit', 'fortress', 'shield', 'pertanian', 'pertambangan', 'camptroops', 'tambang',
    'penduduk', 'archer', 'subscribers', 'viewers', 'like', 'playButton', 'taxi',
    'common', 'as', 'uncommon', 'mythic', 'legendary', 'glory', 'enchant', 'pet', 'psepick', 'psenjata',
])

const RPG_FIELDS = new Set([
    'healt', 'health', 'energi', 'power', 'stamina', 'haus', 'laper', 'title', 'titlein',
    'ultah', 'pasangan', 'sahabat', 'location', 'husbu', 'waifu',
    'follow', 'lastfollow', 'followers', 'pc', 'korbanngocok', 'ngewe', 'jualan', 'ngocokk', 'antarpaket',
    'ojekk', 'polisi', 'ojek', 'pedagang', 'dokter', 'petani', 'montir', 'kuli',
    'trofi', 'rtrofi', 'troopcamp',
    'attack', 'strenght', 'speed', 'defense', 'regeneration',
    'skill', 'korps', 'korpsgrade', 'breaths', 'magic', 'demon',
    'darahiblis', 'demonblood', 'demonkill', 'hashirakill', 'alldemonkill', 'allhashirakill',
    'ramuan', 'string', 'eleksirb', 'shadow', 'antispam', 'antispamlastclaim', 'healthmonster',
    'pancing', 'pancingan', 'totalPancingan', 'anakpancingan', 'umpan', 'sampah', 'potion',
])

const COOLDOWN_FIELDS = new Set([
    'lastseen', 'lastSetStatus', 'lastIstigfar', 'lastclaim', 'judilast',
    'lastnambang', 'lastnebang', 'lastkerja', 'lastmaling', 'lastbunuhi',
    'lastbisnis', 'lastberbisnis', 'lastmancing', 'lastramuanclaim', 'lastgemclaim',
    'lastpotionclaim', 'laststringclaim', 'lastswordclaim', 'lastweaponclaim', 'lastironclaim', 'lastmancingclaim',
    'lastadventure', 'lastberburu', 'lastkill', 'lastfishing', 'lastdungeon', 'lastwar',
    'lastsda', 'lastberbru', 'lastduel', 'lastjb', 'lastmining', 'lasthunt', 'lasthun',
    'lastngocok', 'lastgift', 'lastrob', 'lastngojek', 'lastngewe', 'lastjualan', 'lastngocokk',
    'lastgrab', 'lastberkebon', 'lastcodereg', 'lastdagang',
    'lasthourly', 'lastweekly', 'lastyearly', 'lastmonthly', 'lastturu', 'lastbansos', 'lastrampok',
    'lastngaji', 'lastlonte', 'lastkoboy', 'lastdate', 'lasttambang', 'lastngepet', 'lasttaxi',
    'lastyoutuber', 'lastbossbattle',
])

const JOB_FIELDS = new Set([
    'kerjasatu', 'kerjadua', 'kerjatiga', 'kerjaempat', 'kerjalima', 'kerjaenam',
    'kerjatujuh', 'kerjadelapan', 'kerjasembilan', 'kerjasepuluh', 'kerjasebelas',
    'kerjaduabelas', 'kerjatigabelas', 'kerjaempatbelas', 'kerjalimabelas',
    'pekerjaansatu', 'pekerjaandua', 'pekerjaantiga', 'pekerjaanempat', 'pekerjaanlima',
    'pekerjaanenam', 'pekerjaantujuh', 'pekerjaandelapan', 'pekerjaansembilan', 'pekerjaansepuluh',
    'pekerjaansebelas', 'pekerjaanduabelas', 'pekerjaantigabelas', 'pekerjaanempatbelas', 'pekerjaanlimabelas',
])

const ALL_TOOL_NAMES = new Set(DEFAULT_TOOLS)
const ALL_PET_NAMES = new Set(DEFAULT_PETS)

// Semua nama item (dari semua kategori)
const ALL_ITEM_NAMES = new Set(Object.values(DEFAULT_ITEMS).flat())

/**
 * Batch save flat user object kembali ke Prisma
 * Gunakan ini setelah mengubah nilai di flat object
 */
async function saveUser(jid, flatData, fromAlias = false) {
    if (!jid || !flatData) return

    const core = {}
    const eco = {}
    const rpg = {}
    const cd = {}
    const job = {}
    const invItems = {}
    const toolMap = {}
    const petMap = {}

    for (const [key, val] of Object.entries(flatData)) {
        if (key === 'id') continue

        // Tools (nama + durability)
        if (key.endsWith('durability')) {
            const toolName = key.replace('durability', '')
            if (ALL_TOOL_NAMES.has(toolName)) {
                toolMap[toolName] = toolMap[toolName] || {}
                toolMap[toolName].durability = val
            }
            continue
        }
        if (ALL_TOOL_NAMES.has(key)) {
            toolMap[key] = toolMap[key] || {}
            toolMap[key].owned = val
            continue
        }

        // Pets
        if (key.startsWith('anak') && ALL_PET_NAMES.has(key.replace('anak', ''))) {
            const petName = key.replace('anak', '')
            petMap[petName] = petMap[petName] || {}
            petMap[petName].baby = val
            continue
        }
        if (key.startsWith('makanan') && ALL_PET_NAMES.has(key.replace('makanan', ''))) {
            const petName = key.replace('makanan', '')
            petMap[petName] = petMap[petName] || {}
            petMap[petName].food = val
            continue
        }
        if (key.endsWith('lastclaim') && ALL_PET_NAMES.has(key.replace('lastclaim', ''))) {
            const petName = key.replace('lastclaim', '')
            petMap[petName] = petMap[petName] || {}
            petMap[petName].lastClaim = val
            continue
        }
        if (key.endsWith('exp') && ALL_PET_NAMES.has(key.replace('exp', ''))) {
            const petName = key.replace('exp', '')
            petMap[petName] = petMap[petName] || {}
            petMap[petName].exp = val
            continue
        }
        if (ALL_PET_NAMES.has(key)) {
            petMap[key] = petMap[key] || {}
            petMap[key].count = val
            continue
        }

        // Inventory
        if (ALL_ITEM_NAMES.has(key)) {
            invItems[key] = val
            continue
        }

        // Tabel lain
        if (USER_CORE_FIELDS.has(key)) {
            let mapKey = key;
            if (key === '_spinLock') mapKey = 'spinLock';
            if (key === 'guild') mapKey = 'guildId';
            core[mapKey] = val;
            continue;
        }
        if (ECONOMY_FIELDS.has(key)) { eco[key] = val; continue }
        if (RPG_FIELDS.has(key)) { rpg[key] = val; continue }
        if (COOLDOWN_FIELDS.has(key)) { cd[key] = val; continue }
        if (JOB_FIELDS.has(key)) { job[key] = val; continue }
    }

    const ops = []

    if (Object.keys(core).length)
        ops.push(db.user.update({ where: { jid }, data: core }).catch(() => { }))

    if (Object.keys(eco).length)
        ops.push(db.userEconomy.upsert({ where: { jid }, update: eco, create: { jid, ..._resolveCreateData(eco) } }))

    if (Object.keys(rpg).length)
        ops.push(db.userRpg.upsert({ where: { jid }, update: rpg, create: { jid, ..._resolveCreateData(rpg) } }))

    if (Object.keys(cd).length) {
        const bigCd = _toBigInt(cd)
        ops.push(db.userCooldown.upsert({ where: { jid }, update: bigCd, create: { jid, ..._resolveCreateData(bigCd) } }))
    }

    if (Object.keys(job).length)
        ops.push(db.userJob.upsert({ where: { jid }, update: job, create: { jid, ..._resolveCreateData(job) } }))

    // Inventory
    for (const [itemName, quantity] of Object.entries(invItems)) {
        ops.push(
            db.userInventory.upsert({
                where: { jid_itemName: { jid, itemName } },
                update: { quantity: BigInt(Math.floor(quantity)) },
                create: { jid, itemName, quantity: BigInt(Math.floor(quantity)) },
            })
        )
    }

    // Tools
    for (const [toolName, data] of Object.entries(toolMap)) {
        ops.push(
            db.userTool.upsert({
                where: { jid_toolName: { jid, toolName } },
                update: data,
                create: { jid, toolName, owned: data.owned ?? 0, durability: data.durability ?? 0 },
            })
        )
    }

    // Pets
    for (const [petName, data] of Object.entries(petMap)) {
        const safeData = {
            count: data.count ?? 0,
            baby: data.baby ?? 0,
            exp: BigInt(data.exp ?? 0),
            food: BigInt(data.food ?? 0),
            lastClaim: BigInt(data.lastClaim ?? 0),
        }
        ops.push(
            db.userPet.upsert({
                where: { jid_petName: { jid, petName } },
                update: safeData,
                create: { jid, petName, ...safeData },
            })
        )
    }

    if (ops.length) await Promise.all(ops)
}

// =============================================
//  GRACEFUL SHUTDOWN
// =============================================
async function disconnect() {
    if (prisma) {
        await prisma.$disconnect()
        prisma = null
    }
}

process.on('beforeExit', disconnect)
process.on('SIGINT', async () => { await disconnect(); process.exit(0) })
process.on('SIGTERM', async () => { await disconnect(); process.exit(0) })

// =============================================
//  EXPORTS
// =============================================
module.exports = {
    db,

    // User
    getUser,
    getRawUser,
    flattenUser,
    saveUser,
    updateUserName,
    updateUser,
    updateEconomy,
    updateRpg,
    updateCooldown,
    updateJob,

    // Inventory
    getInventory,
    setInventory,
    addInventory,
    removeInventory,
    getAllInventory,

    // Tools
    getTool,
    setTool,

    // Pets
    getPet,
    setPet,

    // Chat
    getChat,
    updateChat,

    // Stats
    updateCommandStats,

    // Utils
    disconnect,

    // Constants
    DEFAULT_ITEMS,
    DEFAULT_TOOLS,
    DEFAULT_PETS,
}