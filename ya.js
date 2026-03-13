'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const log = (msg) => console.log(`${C.cyan}[INFO]${C.reset} ${msg}`);
const ok = (msg) => console.log(`${C.green}[OK]${C.reset}  ${msg}`);
const err = (msg) => console.log(`${C.red}[ERR]${C.reset}  ${msg}`);
const title = (msg) => console.log(`\n${C.bold}${C.cyan}══ ${msg} ══${C.reset}`);

// Helpers
const toInt = (x, def = 0) => {
    const n = Number(x);
    return isFinite(n) ? Math.floor(n) : def;
};
const toFloat = (x, def = 0) => {
    const n = Number(x);
    return isFinite(n) ? n : def;
};
const toBigInt = (x) => {
    try { return BigInt(Math.floor(Number(x) || 0)); }
    catch { return 0n; }
};

function readJson(file) {
    try {
        if (!fs.existsSync(file)) return null;
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        err(`Failed to read/parse ${file}: ${e.message}`);
        return null;
    }
}

async function migrateBursa() {
    title('MIGRASI BURSA');
    const data = readJson('./database/bursa.json') || {};
    let success = 0, failed = 0;
    for (const [jid, b] of Object.entries(data)) {
        try {
            await prisma.bursa.upsert({
                where: { ownerJid: jid },
                update: {
                    ticker: b.ticker,
                    name: b.name,
                    price: toFloat(b.price),
                    sharesAvailable: toBigInt(b.sharesAvailable),
                    totalShares: toBigInt(b.totalShares),
                    funds: toFloat(b.funds)
                },
                create: {
                    ownerJid: jid,
                    ticker: b.ticker,
                    name: b.name,
                    price: toFloat(b.price),
                    sharesAvailable: toBigInt(b.sharesAvailable),
                    totalShares: toBigInt(b.totalShares),
                    funds: toFloat(b.funds)
                }
            });
            success++;
        } catch (e) {
            err(`Gagal migrasi bursa ${b.ticker}: ${e.message}`);
            failed++;
        }
    }
    ok(`Bursa: ✓ ${success} | ✗ ${failed}`);
}

async function migrateMarket() {
    title('MIGRASI MARKET');
    const data = readJson('./database/market.json');
    if (!data) return;

    try {
        await prisma.marketGlobal.upsert({
            where: { id: 1 },
            update: { lastUpdate: toBigInt(data.lastUpdate) },
            create: { id: 1, lastUpdate: toBigInt(data.lastUpdate) }
        });
        ok('MarketGlobal updated');
    } catch(e) { err('MarketGlobal failed: ' + e.message); }

    const config = data.assetsConfig || {};
    const assets = data.assets || {};
    let success = 0, failed = 0;

    for (const id of Object.keys(config)) {
        const c = config[id];
        const a = assets[id] || {};
        try {
            await prisma.marketAsset.upsert({
                where: { id },
                update: {
                    name: c.name,
                    basePrice: toFloat(c.basePrice),
                    volatility: toFloat(c.volatility),
                    vLiq: toFloat(c.vLiq),
                    currentPrice: toFloat(a.currentPrice),
                    previousPrice: toFloat(a.previousPrice)
                },
                create: {
                    id,
                    name: c.name,
                    basePrice: toFloat(c.basePrice),
                    volatility: toFloat(c.volatility),
                    vLiq: toFloat(c.vLiq),
                    currentPrice: toFloat(a.currentPrice),
                    previousPrice: toFloat(a.previousPrice)
                }
            });
            success++;
        } catch (e) {
            err(`Gagal migrasi market asset ${id}: ${e.message}`);
            failed++;
        }
    }
    ok(`MarketAssets: ✓ ${success} | ✗ ${failed}`);
}

async function migrateStaff() {
    title('MIGRASI STAFF');
    const data = readJson('./database/staff.json') || {};
    let success = 0, failed = 0;
    for (const [jid, s] of Object.entries(data)) {
        try {
            const act = s.activity || {};
            await prisma.staffActivity.upsert({
                where: { jid },
                update: {
                    name: s.name || '',
                    role: s.role || 'Staff',
                    dailyCmds: toInt(act.dailyCmds),
                    modCmds: toInt(act.modCmds),
                    inactiveDays: toInt(act.inactiveDays),
                    lastResetDay: act.lastResetDay || ''
                },
                create: {
                    jid,
                    name: s.name || '',
                    role: s.role || 'Staff',
                    dailyCmds: toInt(act.dailyCmds),
                    modCmds: toInt(act.modCmds),
                    inactiveDays: toInt(act.inactiveDays),
                    lastResetDay: act.lastResetDay || ''
                }
            });
            success++;
        } catch (e) {
            err(`Gagal migrasi staff ${jid}: ${e.message}`);
            failed++;
        }
    }
    ok(`Staff: ✓ ${success} | ✗ ${failed}`);
}

async function migrateGiveaway() {
    title('MIGRASI GIVEAWAY & DAGET');
    const data = readJson('./database/giveaway.json') || {};
    const gw = data.giveaway || {};
    const dg = data.daget || {};
    let success = 0, failed = 0;

    for (const [id, g] of Object.entries(gw)) {
        try {
            await prisma.giveaway.upsert({
                where: { id },
                update: {
                    type: g.type || 'money',
                    isDaget: false,
                    amount: toFloat(g.amount),
                    totalReceivers: toInt(g.totalReceivers),
                    creator: g.creator || '',
                    status: g.status || 'open',
                    closedAt: g.closedAt ? toBigInt(g.closedAt) : null,
                    participants: g.participants || []
                },
                create: {
                    id,
                    type: g.type || 'money',
                    isDaget: false,
                    amount: toFloat(g.amount),
                    totalReceivers: toInt(g.totalReceivers),
                    creator: g.creator || '',
                    status: g.status || 'open',
                    closedAt: g.closedAt ? toBigInt(g.closedAt) : null,
                    participants: g.participants || [],
                    claimed: []
                }
            });
            success++;
        } catch (e) {
            err(`Gagal migrasi giveaway ${id}: ${e.message}`);
            failed++;
        }
    }

    for (const [id, d] of Object.entries(dg)) {
        try {
            await prisma.giveaway.upsert({
                where: { id },
                update: {
                    type: d.type || 'money',
                    isDaget: true,
                    totalAmount: toFloat(d.totalAmount),
                    remainingAmount: toFloat(d.remainingAmount),
                    totalReceivers: toInt(d.totalReceivers),
                    creator: d.creator || '',
                    status: d.status || 'open',
                    closedAt: d.closedAt ? toBigInt(d.closedAt) : null,
                    claimed: d.claimed || []
                },
                create: {
                    id,
                    type: d.type || 'money',
                    isDaget: true,
                    totalAmount: toFloat(d.totalAmount),
                    remainingAmount: toFloat(d.remainingAmount),
                    totalReceivers: toInt(d.totalReceivers),
                    creator: d.creator || '',
                    status: d.status || 'open',
                    closedAt: d.closedAt ? toBigInt(d.closedAt) : null,
                    participants: [],
                    claimed: d.claimed || []
                }
            });
            success++;
        } catch (e) {
            err(`Gagal migrasi daget ${id}: ${e.message}`);
            failed++;
        }
    }
    ok(`Giveaways/Dagets: ✓ ${success} | ✗ ${failed}`);
}

async function migrateRedeem() {
    title('MIGRASI REDEEM CODES');
    const data = readJson('./database/redeem.json') || {};
    const redeems = data.redeems || {};
    const modCards = data.moderatorCodes || {};
    let success = 0, failed = 0;

    for (const [code, r] of Object.entries(redeems)) {
        try {
            const d = r.data || {};
            await prisma.redeemCode.upsert({
                where: { code },
                update: {
                    creator: r.creator || '',
                    since: toBigInt(r.since),
                    reward: d.reward || {},
                    claim: d.claim || [],
                    expired: toBigInt(d.expired),
                    limituser: toInt(d.limituser),
                    forWho: d.forWho || [],
                    blocked: d.blocked || []
                },
                create: {
                    code,
                    creator: r.creator || '',
                    since: toBigInt(r.since),
                    reward: d.reward || {},
                    claim: d.claim || [],
                    expired: toBigInt(d.expired),
                    limituser: toInt(d.limituser),
                    forWho: d.forWho || [],
                    blocked: d.blocked || []
                }
            });
            success++;
        } catch (e) {
            err(`Gagal migrasi code ${code}: ${e.message}`);
            failed++;
        }
    }

    try {
        await prisma.modRedeemState.upsert({
            where: { id: 1 },
            update: {
                weeklyCount: toInt(modCards.weeklyCount),
                dailyCount: modCards.dailyCount || {},
                resetWeekly: toBigInt(modCards.resetWeekly)
            },
            create: {
                id: 1,
                weeklyCount: toInt(modCards.weeklyCount),
                dailyCount: modCards.dailyCount || {},
                resetWeekly: toBigInt(modCards.resetWeekly)
            }
        });
        ok('ModRedeemState updated');
    } catch(e) { err('ModRedeemState failed: ' + e.message); }

    ok(`Redeem Codes: ✓ ${success} | ✗ ${failed}`);
}

async function main() {
    console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════╗`);
    console.log(`║      JSON → Prisma SQL (ADDITIONAL) ║`);
    console.log(`╚═══════════════════════════════════════╝${C.reset}\n`);

    log('Testing database connection...');
    try {
        await prisma.$connect();
        ok('Database connected!\n');
    } catch (e) {
        err('Database connection failed: ' + e.message);
        process.exit(1);
    }

    await migrateBursa();
    await migrateMarket();
    await migrateStaff();
    await migrateGiveaway();
    await migrateRedeem();

    await prisma.$disconnect();
    console.log(`\n${C.green}${C.bold}✔ Migration completed!${C.reset}\n`);
}

main().catch(e => {
    err(`Fatal error: ${e.message}`);
    process.exit(1);
});
