const fs = require('fs')
const path = require('path')
const {
    getUser, updateUser, updateEconomy, updateRpg, updateCooldown, updateJob,
    setInventory, setTool, setPet, DEFAULT_ITEMS, DEFAULT_TOOLS, DEFAULT_PETS
} = require('./lib/database')

const USER_CORE_FIELDS = new Set([
    'name', 'pushName', 'gender', 'registered', 'age', 'regTime', 'regSince', 'setName', 'setAge', 'sn',
    'banned', 'bannedTime', 'Banneduser', 'BannedReason', 'banLevel', 'lastBanTime', 'warn', 'moderator', 'timSupport',
    'afk', 'afkReason', 'premium', 'premiumTime', 'exp', 'level', 'coin', 'atm', 'limit', 'glimit', 'tprem', 'tigame',
    'lbars', 'role', 'autolevelup', 'job', 'jobexp', 'vip', 'vipPoin', 'ajd', 'skata',
    'jail', 'penjara', 'dirawat', 'kingdom',
    'statusNikah', 'tanggalNikah', 'hamil', 'hamilStart', 'lastKencan', 'lastCekAyang', 'lastRawatAnak',
    'slotNetWinLoss', '_spinLock', 'slotFreeSpins', 'slotFSBet', 'freespin', 'fsBet',
    'slotSpinning', 'isAutoSpinning', 'cancelAutoSpin', 'lastslot',
    'swm', 'ds', 'chatgpt', 'guildId', 'gift', 'portofolio', 'invest', 'anak', 'properti', 'pasanganChar', 'lastCharSearch',
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

const ALL_ITEMS = new Set([
    ...(DEFAULT_ITEMS?.resource || []),
    ...(DEFAULT_ITEMS?.food || []),
    ...(DEFAULT_ITEMS?.cooked || []),
    ...(DEFAULT_ITEMS?.fish || []),
    ...(DEFAULT_ITEMS?.animal || []),
    ...(DEFAULT_ITEMS?.fruit || []),
    ...(DEFAULT_ITEMS?.seed || []),
    ...(DEFAULT_ITEMS?.rarity || []),
])
const ALL_TOOLS = new Set(DEFAULT_TOOLS || [])
const ALL_PETS = new Set(DEFAULT_PETS || [])

async function migrateUsers() {
    console.log('⏳ Memulai Migrasi User Guild dari database.json ke MySQL...')
    const dbPath = path.join(__dirname, 'database.json')
    if (!fs.existsSync(dbPath)) return console.log('❌ database.json tidak ditemukan!')

    let data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    let guilds = Object.values(data.guilds || {})
    let users = data.users || {}

    let targetUsers = new Set()

    for (const g of guilds) {
        if (g.owner) targetUsers.add(g.owner)
        if (g.members) g.members.forEach(m => targetUsers.add(m))
    }

    for (const [jid, u] of Object.entries(users)) {
        if (u.guild) targetUsers.add(jid) // if they had a guild property
    }

    console.log(`🔍 Ditemukan ${targetUsers.size} user yang berhubungan dengan guild. Memproses...`)
    let success = 0

    for (const jid of targetUsers) {
        const u = users[jid]
        if (!u) continue

        try {
            // Create base user if not exists
            await getUser(jid, u.name ? String(u.name) : 'User')

            // Extract grouped data
            let core = {}, eco = {}, rpg = {}, cd = {}, job = {}
            for (const [k, v] of Object.entries(u)) {
                if (k === 'guild') continue // diurus script migrasi guild
                if (USER_CORE_FIELDS.has(k)) core[k] = v
                else if (ECONOMY_FIELDS.has(k)) eco[k] = v
                else if (RPG_FIELDS.has(k)) rpg[k] = v
                else if (COOLDOWN_FIELDS.has(k)) cd[k] = v
                else if (JOB_FIELDS.has(k)) job[k] = v
            }

            // BigInt Helper
            const asBigInt = (obj, floatExceptions = []) => {
                let res = {}
                for (let k in obj) {
                    if (obj[k] === null || obj[k] === undefined) continue;
                    if (typeof obj[k] === 'number' && !floatExceptions.includes(k)) {
                        res[k] = BigInt(Math.floor(obj[k]))
                    } else {
                        res[k] = obj[k]
                    }
                }
                return res
            }

            // Update tables
            if (Object.keys(core).length > 0) {
                if (core['_spinLock'] !== undefined) {
                    core.spinLock = core['_spinLock'];
                    delete core['_spinLock'];
                }
                await updateUser(jid, asBigInt(core, ['slotNetWinLoss', 'slotFSBet', 'fsBet']))
            }
            if (Object.keys(eco).length > 0) await updateEconomy(jid, asBigInt(eco, ['saldo', 'pengeluaran', 'money', 'bank', 'balance']))
            if (Object.keys(rpg).length > 0) await updateRpg(jid, asBigInt(rpg))
            if (Object.keys(cd).length > 0) await updateCooldown(jid, asBigInt(cd))
            if (Object.keys(job).length > 0) await updateJob(jid, asBigInt(job))

            // Update Items
            for (const item of ALL_ITEMS) {
                if (u[item]) await setInventory(jid, item, u[item], 'misc') // category isn't tracked in old JSON directly
            }

            // Update Tools
            for (const tool of ALL_TOOLS) {
                if (u[tool] || u[`${tool}durability`]) {
                    await setTool(jid, tool, u[tool] || 0, u[`${tool}durability`] || 0)
                }
            }

            // Update Pets
            for (const pet of ALL_PETS) {
                if (u[pet] || u[`${pet}lastclaim`] || u[`${pet}exp`]) {
                    await setPet(jid, pet, {
                        count: u[pet] || 0,
                        baby: u[`anak${pet}`] || 0,
                        exp: u[`${pet}exp`] || 0,
                        food: u[`makanan${pet}`] || 0,
                        lastClaim: u[`${pet}lastclaim`] || 0
                    })
                }
            }

            success++
            process.stdout.write(`\r✅ Progress: ${success}/${targetUsers.size}`)
        } catch (e) {
            console.error(`\n❌ Gagal memigrasi ${jid}:`, e.message)
        }
    }

    console.log(`\n🎉 Selesai memigrasi ${success} user! Sekarang Anda bisa me-run ulang migrate_guild.js dengan aman.`)
    process.exit(0)
}

migrateUsers()
