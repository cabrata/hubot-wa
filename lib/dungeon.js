const { db, getTool, setTool } = require('./database');

// ─── TINGKAT KESULITAN ───
const DIFFICULTY = {
    'F':  { mult: 0.5, name: 'F-Rank (Trainee)', minLevel: 1 },
    'E':  { mult: 0.8, name: 'E-Rank (Beginner)', minLevel: 5 },
    'D':  { mult: 1.0, name: 'D-Rank (Normal)', minLevel: 10 },
    'C':  { mult: 1.5, name: 'C-Rank (Hard)', minLevel: 25 },
    'B':  { mult: 2.5, name: 'B-Rank (Veteran)', minLevel: 50 },
    'A':  { mult: 5.0, name: 'A-Rank (Nightmare)', minLevel: 80 },
    'A+': { mult: 10.0, name: 'A+ Rank (Hell)', minLevel: 100 },
    'S':  { mult: 25.0, name: 'S-Rank (Abyssal)', minLevel: 150 },
    'SS': { mult: 100.0, name: 'SS-Rank (God Slayer)', minLevel: 250 }
};

// ─── SKILL & MANA ───
const SKILLS = {
    1: { name: 'Dual Slash',  type: 'balance', mana: 5,  atkMod: 1.2, defMod: 1.0 },
    2: { name: 'Cross Parry', type: 'defense', mana: 10, atkMod: 0.5, defMod: 2.5 },
    3: { name: 'Frenzy Strike',type: 'attack', mana: 15, atkMod: 2.5, defMod: 0.5 },
    4: { name: 'Blade Dance', type: 'speed',   mana: 20, atkMod: 1.8, defMod: 1.5 },
    5: { name: 'Lethal Combo',type: 'crit',    mana: 25, atkMod: 3.5, defMod: 0.2 }
};

// ─── MONSTER & BOSS ───
const MONSTER_LIST = [
    'Slime Mutan', 'Goblin Petarung', 'Hobgoblin', 'Dire Wolf', 'Troll Hutan',
    'Skeleton Warrior', 'Poisonous Snake', 'Giant Spider', 'Shadow Assassin', 
    'Gargoyle', 'Orc Berserker', 'Vampire Bat', 'Cursed Armor', 'Lizardman'
];

const BOSS_LIST = [
    'Cerberus', 'Minotaur', 'Dullahan', 'Lich King', 'Abyssal Dragon', 
    'Behemoth', 'Chimera', 'Ifrit', 'Leviathan', 'Colossal Titan', 
    'Demon Lord', 'Fallen Angel', 'Death Knight'
];

// 🎁 MATERIAL DROP BOSS SPESIFIK 
const BOSS_DROPS = {
    'Cerberus': 'cerberus_fang',
    'Minotaur': 'minotaur_horn',
    'Dullahan': 'dullahan_armor',
    'Lich King': 'lich_soul',
    'Abyssal Dragon': 'dragon_scale',
    'Behemoth': 'behemoth_claw',
    'Chimera': 'chimera_tail',
    'Ifrit': 'fire_core',
    'Leviathan': 'water_core',
    'Colossal Titan': 'titan_blood',
    'Demon Lord': 'demon_heart',
    'Fallen Angel': 'angel_feather',
    'Death Knight': 'dark_sword_fragment'
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── DYNAMIC DAILY EVENTS ───
const EVENTS = {
    0: { id: 'abyssal_surge', icon: '☠️', name: 'Abyssal Surge', desc: 'Aura gelap memperkuat Attack Monster (+50%), tapi Drop EXP meningkat (x2.0).' },
    1: { id: 'mana_overflow', icon: '💧', name: 'Mana Overflow', desc: 'Aliran Mana tidak terbatas! Semua penggunaan Mana untuk Skill berkurang 50%.' },
    2: { id: 'shadow_eclipse',icon: '🌑', name: 'Shadow Eclipse', desc: 'Monster menjadi lebih tangguh (HP +30%, ATK +20%), namun Loot meningkat pesat (x1.5).' },
    3: { id: 'moon_blossom',  icon: '🌸', name: 'Moon Blossom', desc: 'Bunga bulan mekar. Monster mendapat HP ekstra (+20%), namun menjatuhkan EXP & Uang melimpah (x1.5).' },
    4: { id: 'peaceful_breeze',icon:'🍃', name: 'Peaceful Breeze', desc: 'Angin damai berhembus. Monster melemah (HP & ATK -20%). Cocok untuk pemula.' },
    5: { id: 'blood_moon',    icon: '🩸', name: 'Blood Moon', desc: 'Bulan darah! HP/Mana Regen saat naik lantai berkurang setengah, tapi EXP melonjak tajam (x2.5).' },
    6: { id: 'golden_rush',   icon: '💰', name: 'Golden Rush', desc: 'Harta karun meluap! Semua perolehan Uang dari Dungeon dikalikan 3 (x3.0).' }
};

function getDailyEvent() {
    let day = new Date().getDay();
    return EVENTS[day];
}

class DungeonEngine {
    constructor() {
        if (!global.dungeonSessions) global.dungeonSessions = {};
        this.sessions = global.dungeonSessions;
    }

    async startSession(leaderJid, mode, diffCode, guildId = null, guildName = null) {
        let diff = DIFFICULTY[diffCode.toUpperCase()] || DIFFICULTY['D'];
        let sessionId = 'DG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        let currentEvent = getDailyEvent();
        
        let pDungeon = await db.userDungeon.upsert({
            where: { jid: leaderJid },
            update: { inSession: true },
            create: { jid: leaderJid, inSession: true }
        });

        this.sessions[sessionId] = {
            id: sessionId,
            mode: mode, 
            difficulty: diff,
            event: currentEvent, 
            floor: pDungeon.currentFloor || 1,
            players: [leaderJid],
            maxPlayers: mode === 'SOLO' ? 1 : (mode === 'PARTY' ? 5 : 10),
            guildId: guildId, 
            guildName: guildName,
            status: 'EXPLORING', 
            monster: null,
            bossState: { charging: false, usedUltimate: false }, // STATE KHUSUS ULTIMATE BOSS
            turnQueue: [], 
            loot: { money: 0n, exp: 0n, itemDrops: {} },
            guildLoot: { eliksir: 0, exp: 0, harta: 0n } 
        };

        return this.sessions[sessionId];
    }

    async generateEncounter(sessionId) {
        let session = this.sessions[sessionId];
        let isBoss = session.floor % 10 === 0; 
        
        let baseHp = isBoss ? 10000 : 800;
        let baseAtk = isBoss ? 1500 : 150;
        let scale = session.difficulty.mult * (1 + (session.floor * 0.15));

        let pCount = session.players.length;
        let hpMod = baseHp * scale * (isBoss ? pCount : 1);
        let atkMod = baseAtk * scale;

        // EFEK EVENT KE MONSTER
        if (session.event.id === 'shadow_eclipse') { hpMod *= 1.3; atkMod *= 1.2; }
        if (session.event.id === 'moon_blossom') { hpMod *= 1.2; }
        if (session.event.id === 'peaceful_breeze') { hpMod *= 0.8; atkMod *= 0.8; }
        if (session.event.id === 'abyssal_surge') { atkMod *= 1.5; }

        let randomMonster = getRandom(MONSTER_LIST);
        let randomBoss = getRandom(BOSS_LIST);

        session.monster = {
            baseName: isBoss ? randomBoss : randomMonster, 
            name: isBoss ? `👑 ${randomBoss} (Floor ${session.floor})` : `👿 ${randomMonster}`,
            isBoss: isBoss,
            hp: Math.floor(hpMod),
            maxHp: Math.floor(hpMod),
            atk: Math.floor(atkMod)
        };

        session.bossState = { charging: false, usedUltimate: false };

        if (isBoss) {
            session.status = 'BOSS_GATE';
            session.gateReq = Math.floor(hpMod * 0.3); 
        } else {
            session.status = 'COMBAT';
        }

        return session.monster;
    }

    async checkBossGate(sessionId) {
        let session = this.sessions[sessionId];
        let totalPower = 0;

        for (let jid of session.players) {
            let uRpg = await db.userRpg.findUnique({ where: { jid } });
            let sword = await getTool(jid, 'sword');
            let armor = await getTool(jid, 'armor');
            
            let pPower = (Number(uRpg.attack) + Number(uRpg.defense)) + (sword.owned * 150) + (armor.owned * 200);
            totalPower += pPower;
        }

        if (totalPower >= session.gateReq) {
            session.status = 'COMBAT'; 
            return { passed: true, totalPower, req: session.gateReq };
        } else {
            await this.wipeoutParty(sessionId);
            return { passed: false, totalPower, req: session.gateReq };
        }
    }

    async processAttack(sessionId, playerJid, skillId) {
        let session = this.sessions[sessionId];
        if (session.status !== 'COMBAT') return { error: 'Sedang tidak dalam pertarungan!' };

        let skill = SKILLS[skillId] || SKILLS[1];
        let pDungeon = await db.userDungeon.findUnique({ where: { jid: playerJid } });
        
        let actualManaCost = skill.mana;
        if (session.event.id === 'mana_overflow') actualManaCost = Math.floor(skill.mana * 0.5);

        if (pDungeon.mana < actualManaCost) return { error: `Mana tidak cukup untuk ${skill.name}! Sisa Mana: ${pDungeon.mana} (Butuh: ${actualManaCost})` };

        let uRpg = await db.userRpg.findUnique({ where: { jid: playerJid } });
        let sword = await getTool(playerJid, 'sword');
        let armor = await getTool(playerJid, 'armor');

        let pAtk = (Number(uRpg.attack) + (sword.owned * 150)) * skill.atkMod;
        let pDef = (Number(uRpg.defense) + (armor.owned * 200)) * skill.defMod;

        // 🛡️ LOGIKA BOSS ULTIMATE (DEATH MECHANIC) 🛡️
        let isUltimateTurn = session.monster.isBoss && session.bossState && session.bossState.charging;
        
        if (isUltimateTurn) {
            if (skillId != 2) { // JIKA TIDAK MEMAKAI SKILL DEFENSE
                let newHealth = 0; 
                await db.userRpg.update({ where: { jid: playerJid }, data: { health: newHealth } });

                if (session.players.length === 1) {
                    await this.wipeoutParty(sessionId);
                    return { status: 'WIPEOUT_ULTIMATE', bossName: session.monster.name };
                } else {
                    return { status: 'PLAYER_DEAD_ULTIMATE', bossName: session.monster.name };
                }
            } else {
                session.bossState.charging = false;
                session.bossState.usedUltimate = true;
                pDef += session.monster.atk * 2; 
            }
        }
        
        let dmgToMonster = Math.floor(Math.max(1, pAtk - (session.monster.hp * 0.05)));
        session.monster.hp -= dmgToMonster;

        await db.userDungeon.update({
            where: { jid: playerJid },
            data: { mana: Math.max(0, pDungeon.mana - actualManaCost) }
        });

        if (session.monster.hp <= 0) return await this.floorCleared(sessionId);

        // ⚠️ TRIGGER BOSS ULTIMATE CHARGE
        if (session.monster.isBoss && session.monster.hp <= (session.monster.maxHp * 0.3) && !session.bossState?.usedUltimate && !session.bossState?.charging) {
            session.bossState.charging = true;
            return {
                status: 'BOSS_CHARGING',
                skillUsed: skill.name,
                dmgGiven: dmgToMonster,
                mHp: session.monster.hp,
                pMana: pDungeon.mana - actualManaCost
            };
        }

        let dmgToPlayer = Math.floor(Math.max(1, session.monster.atk - pDef));
        if (isUltimateTurn) dmgToPlayer = Math.floor(session.monster.atk * 0.05); 

        let newHealth = Math.max(0, Number(uRpg.health) - dmgToPlayer);
        await db.userRpg.update({ where: { jid: playerJid }, data: { health: newHealth } });

        if (newHealth <= 0) {
            if (session.players.length === 1) {
                await this.wipeoutParty(sessionId);
                return { status: 'WIPEOUT', dmgGiven: dmgToMonster, dmgTaken: dmgToPlayer };
            } else {
                return { status: 'PLAYER_DEAD', dmgGiven: dmgToMonster, dmgTaken: dmgToPlayer };
            }
        }

        return { 
            status: 'NEXT_TURN', skillUsed: skill.name, dmgGiven: dmgToMonster, 
            dmgTaken: dmgToPlayer, mHp: session.monster.hp, pMana: pDungeon.mana - actualManaCost 
        };
    }

    async floorCleared(sessionId) {
        let session = this.sessions[sessionId];
        
        let bExp = session.monster.isBoss ? 5000 : 500;
        let bMoney = session.monster.isBoss ? 25000 : 1000;
        
        let expMult = 1, moneyMult = 1;
        if (session.event.id === 'moon_blossom') { expMult = 1.5; moneyMult = 1.5; }
        if (session.event.id === 'golden_rush') { moneyMult = 3; }
        if (session.event.id === 'abyssal_surge') { expMult = 2; }
        if (session.event.id === 'shadow_eclipse') { expMult = 1.5; moneyMult = 1.5; }
        if (session.event.id === 'blood_moon') { expMult = 2.5; }

        session.loot.exp += BigInt(Math.floor(bExp * session.difficulty.mult * expMult));
        session.loot.money += BigInt(Math.floor(bMoney * session.difficulty.mult * moneyMult));

        // 🎁 DROP ITEM MATERIAL SPESIAL DARI BOSS
        if (session.monster.isBoss && Math.random() <= 0.3) {
            let droppedItem = BOSS_DROPS[session.monster.baseName] || 'boss_core';
            session.loot.itemDrops[droppedItem] = (session.loot.itemDrops[droppedItem] || 0) + 1;
        }

        // TAMBAHAN LOOT MARKAS
        if ((session.mode === 'PARTY' || session.mode === 'RAID') && session.guildId) {
            session.guildLoot.exp += Math.floor((session.monster.isBoss ? 1000 : 50) * session.difficulty.mult);
            session.guildLoot.eliksir += Math.floor(session.monster.isBoss ? (20 * session.difficulty.mult) : (2 * session.difficulty.mult));
            session.guildLoot.harta += BigInt(Math.floor(bMoney * 1.5 * session.difficulty.mult * moneyMult));
        }

        // 🌟 INTEGRASI LANGSUNG KE GUILD QUEST 🌟
        let questUpdateMsg = '';
        if (session.guildId) {
            // MANGGIL QUEST ENGINE DI DALAM SINI AJA, JADI GA ERROR CIRCULAR DEPENDENCY
            const QuestEngine = require('./quest'); 
            
            let q1 = await QuestEngine.triggerDungeonAction(session.guildId, 'floor_clear', 1);
            if (q1 && q1.stepDone) {
                questUpdateMsg += `\n\n🔔 *UPDATE MISI MARKAS:*\n${q1.msg}`;
                if (q1.isFinished) questUpdateMsg += `\n\n${q1.finalMsg}`;
            } else if (q1) {
                questUpdateMsg += `\n\n🔔 *PROGRESS MISI:* ${q1.msg}`;
            }

            if (session.monster.isBoss) {
                let q2 = await QuestEngine.triggerDungeonAction(session.guildId, 'boss_kill', 1, session.monster.baseName);
                if (q2 && q2.stepDone) {
                    questUpdateMsg += `\n\n🔔 *UPDATE MISI MARKAS:*\n${q2.msg}`;
                    if (q2.isFinished) questUpdateMsg += `\n\n${q2.finalMsg}`;
                }
            }
        }

        session.floor += 1;
        session.status = 'EXPLORING';

        let regenMult = session.event.id === 'blood_moon' ? 0.5 : 1;

        for (let jid of session.players) {
            let uRpg = await db.userRpg.findUnique({ where: { jid } });
            let uDungeon = await db.userDungeon.findUnique({ where: { jid } });
            
            let heal = Math.floor(Number(uRpg.health) * 0.20 * regenMult);
            let manaRegen = Math.floor(uDungeon.maxMana * 0.30 * regenMult);

            await db.userRpg.update({ where: { jid }, data: { health: Math.min(100, Number(uRpg.health) + heal) } });
            await db.userDungeon.update({ where: { jid }, data: { mana: Math.min(uDungeon.maxMana, uDungeon.mana + manaRegen) } });
        }

        let clearedData = { ...session.monster };
        session.monster = null;

        return { status: 'CLEARED', boss: clearedData.isBoss, newFloor: session.floor, drops: session.loot.itemDrops, questUpdate: questUpdateMsg };
    }

    async wipeoutParty(sessionId) {
        let session = this.sessions[sessionId];
        for (let jid of session.players) {
            let sword = await getTool(jid, 'sword');
            let armor = await getTool(jid, 'armor');

            await db.userDungeon.update({
                where: { jid }, data: { inSession: false, currentFloor: 1, sessionMoney: 0n, sessionExp: 0n }
            });

            if (sword.owned > 0) await setTool(jid, 'sword', sword.owned, Math.max(0, sword.durability - 25));
            if (armor.owned > 0) await setTool(jid, 'armor', armor.owned, Math.max(0, armor.durability - 25));
            await db.userRpg.update({ where: { jid }, data: { health: 5 } });
        }
        delete this.sessions[sessionId];
    }

    async leaveSession(sessionId) {
        let session = this.sessions[sessionId];
        if (!session) return;
        
        for (let jid of session.players) {
            let uDungeon = await db.userDungeon.findUnique({ where: { jid } });
            await db.userDungeon.update({
                where: { jid }, data: { inSession: false, currentFloor: session.floor, maxFloor: Math.max(uDungeon.maxFloor, session.floor) }
            });
            let uEco = await db.userEconomy.findUnique({ where: { jid } });
            let uCore = await db.user.findUnique({ where: { jid } });

            await db.userEconomy.update({ where: { jid }, data: { money: Number(uEco.money) + Number(session.loot.money) } });
            await db.user.update({ where: { jid }, data: { exp: BigInt(uCore.exp) + session.loot.exp } });

            // 🎁 TRANSFER ITEM DROPS KE INVENTORY MASING-MASING
            for (let item in session.loot.itemDrops) {
                let amount = session.loot.itemDrops[item];
                let inv = await db.userInventory.findUnique({ where: { jid_itemName: { jid: jid, itemName: item } } });
                if (inv) {
                    await db.userInventory.update({ where: { id: inv.id }, data: { quantity: Number(inv.quantity) + amount } });
                } else {
                    await db.userInventory.create({ data: { jid: jid, itemName: item, itemCategory: 'material', quantity: amount } });
                }
            }
        }

        if ((session.mode === 'PARTY' || session.mode === 'RAID') && session.guildId) {
            let guild = await db.guild.findUnique({ where: { id: session.guildId } });
            if (guild) {
                await db.guild.update({
                    where: { id: session.guildId },
                    data: {
                        exp: Number(guild.exp) + session.guildLoot.exp,
                        eliksir: Number(guild.eliksir) + session.guildLoot.eliksir,
                        harta: BigInt(guild.harta) + session.guildLoot.harta
                    }
                });
            }
        }

        delete this.sessions[sessionId];
    }
    
    async forceClearAllLocks() {
        await db.userDungeon.updateMany({ where: { inSession: true }, data: { inSession: false } });
        this.sessions = {};
    }
}

module.exports = new DungeonEngine();