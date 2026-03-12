
// werewolf.js (modified announcements only)
// Original structure preserved; added minimal helpers and announcement tracking.
// Changes:
// - Added ensureBlacklist helper
// - voteKill now records extra deaths (hunter retaliation, lover suicide) into room.dead and room.lastNightInfo
// - killww processes room.dead in a way that records explanatory messages into room.lastNightInfo
// - pagi() appends room.lastNightInfo lines after the standard pagii() text
// - malam() (voting branch) appends immediate effects (from voteKill) into the voting announcement
// Note: this file intentionally keeps existing functions intact but augments announcement behavior.

let toMs = require("ms");

var a;
var b;
var d;
var e;
var f;
var textnya;
var idd;
var room;

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function emoji_role(role) {
    if (role === "warga") return "👱‍♂️";
    if (role === "seer") return "🔮"; // ganti supaya beda dari sorcerer
    if (role === "guardian") return "👼";
    if (role === "sorcerer") return "🔮👿";
    if (role === "werewolf") return "🐺";
    if (role === "witch") return "🧙‍♀️";
    if (role === "hunter") return "🏹";
    if (role === "cupid") return "💘";
    if (role === "mayor") return "👑";
    if (role === "thief") return "🗝️";
    if (role === "sheriff") return "🔫";
    if (role === "joker") return "🤡";
    return "";
}

const findObject = (obj = {}, key, value) => {
    const result = [];
    const recursiveSearch = (obj = {}) => {
        if (!obj || typeof obj !== "object") return;
        if (obj[key] === value) result.push(obj);
        Object.keys(obj).forEach(function(k) {
            recursiveSearch(obj[k]);
        });
    };
    recursiveSearch(obj);
    return result;
};

// sessions
const sesi = (from, data) => {
    if (!data[from]) return false;
    return data[from];
};

// check sessions
const playerOnGame = (sender, data) => {
    let result = findObject(data, "id", sender);
    return result.length > 0;
};

// in room
const playerOnRoom = (sender, from, data) => {
    let result = findObject(data, "id", sender);
    if (result.length > 0 && result[0].sesi === from) return true;
    return false;
};

// get data player
const dataPlayer = (sender, data) => {
    let result = findObject(data, "id", sender);
    if (result.length > 0 && result[0].id === sender) return result[0];
    return false;
};

// get data player by number
const dataPlayerById = (id, data) => {
    let result = findObject(data, "number", id);
    if (result.length > 0 && result[0].number === id) return result[0];
    return false;
};

// keluar game
const playerExit = (from, id, data) => {
    room = sesi(from, data);
    if (!room) return false;
    const indexPlayer = room.player.findIndex((i) => i.id === id);
    if (indexPlayer !== -1) room.player.splice(indexPlayer, 1);
};

// get player by number (with index)
const getPlayerById = (from, sender, id, data) => {
    room = sesi(from, data);
    if (!room) return false;
    const indexPlayer = room.player.findIndex((i) => i.number === id);
    if (indexPlayer === -1) return false;
    return {
        index: indexPlayer,
        sesi: room.player[indexPlayer].sesi,
        db: room.player[indexPlayer],
    };
};

// get player by number but from sender context
const getPlayerById2 = (sender, id, data) => {
    let result = findObject(data, "id", sender);
    if (result.length > 0 && result[0].id === sender) {
        let from = result[0].sesi;
        room = sesi(from, data);
        if (!room) return false;
        const indexPlayer = room.player.findIndex((i) => i.number === id);
        if (indexPlayer === -1) return false;
        return {
            index: indexPlayer,
            sesi: room.player[indexPlayer].sesi,
            db: room.player[indexPlayer],
        };
    }
    return false;
};

// ------------------ helper: ensure blacklist exists ------------------
const ensureBlacklist = (from) => {
    try {
        if (!global.db) global.db = { data: { chats: {}, users: {} } };
        if (!global.db.data) global.db.data = { chats: {}, users: {} };
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[from]) global.db.data.chats[from] = {};
        if (!global.db.data.chats[from].blacklistUsers) global.db.data.chats[from].blacklistUsers = {};
    } catch (e) {
        // fail safe, but don't throw
        console.error("ensureBlacklist error", e);
        global.db = global.db || { data: { chats: {} } };
        global.db.data.chats[from] = global.db.data.chats[from] || {};
        global.db.data.chats[from].blacklistUsers = global.db.data.chats[from].blacklistUsers || {};
    }
};

// werewolf kill (existing)
const killWerewolf = (sender, id, data) => {
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let { index, sesi, db } = result;
    if (data[sesi].player[index].number === id) {
        if (db.effect.includes("guardian")) {
            data[sesi].guardian.push(parseInt(id));
            data[sesi].dead.push(parseInt(id));
        } else if (!db.effect.includes("guardian")) {
            data[sesi].dead.push(parseInt(id));
        }
    }
};

// sheriff action (night kill with risk)
const sheriffKill = (sender, id, data) => {
    // sender is sheriff's jid; id is number target
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let sheriff = dataPlayer(sender, data);
    let from = sheriff.sesi;
    if (!sheriff || !from) return false;
    let targetIndex = room.player.findIndex((p) => p.number === id);
    if (targetIndex === -1) return false;
    // If target is werewolf or sorcerer or joker => target dies (consider guardian)
    room.lastNightInfo = room.lastNightInfo || [];

    // If target is werewolf or sorcerer or joker => target dies (consider guardian)
    if (room.player[targetIndex].role === "werewolf" || room.player[targetIndex].role === "sorcerer" || room.player[targetIndex].role === "joker") {
        if (room.player[targetIndex].effect.includes("guardian")) {
            room.guardian.push(parseInt(id));
            room.dead.push(parseInt(id));
        } else {
            room.dead.push(parseInt(id));
        }
        room.lastNightInfo.push(`🔫 Sheriff @${sheriff.id.replace("@s.whatsapp.net","")} berhasil menembak @${room.player[targetIndex].id.replace("@s.whatsapp.net","")} (${room.player[targetIndex].role}).`);
    } else {
        // wrong kill -> sheriff dies immediately
        room.dead.push(parseInt(sheriff.number));
        room.lastNightInfo.push(`🔫 Sheriff @${sheriff.id.replace("@s.whatsapp.net","")} salah tembak, dia langsung dieksekusi oleh warga.`);
    }
};

// seer dreamy
const dreamySeer = (sender, id, data) => {
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let { index, sesi, db } = result;
    if (data[sesi].player[index].role === "werewolf") {
        data[sesi].seer = true;
    }
    return data[sesi].player[index].role;
};

// sorcerer peek
const sorcerer = (sender, id, data) => {
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let { index, sesi } = result;
    return data[sesi].player[index].role;
};

// guardian protect
const protectGuardian = (sender, id, data) => {
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let { index, sesi } = result;
    data[sesi].player[index].effect.push("guardian");
};

// pengacakan role
const roleShuffle = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

// memberikan role ke player by jid
const roleChanger = (from, id, role, data) => {
    room = sesi(from, data);
    if (!room) return false;
    var index = room.player.findIndex((i) => i.id === id);
    if (index === -1) return false;
    room.player[index].role = role;
};

// function to compute role amounts algorithmically with thresholds
const roleAmount = (from, data) => {
    const result = sesi(from, data);
    if (!result) return false;
    const n = result.player.length;
    if (n < 5) return false;

    // Werewolf proportional
    let werewolf = Math.min(3, Math.max(1, Math.floor(n / 4)));

    // Progressive core roles
    let seer = n >= 5 ? Math.min(3, Math.floor(n / 6)) : 0;
    let guardian = n >= 6 ? Math.min(2, Math.floor(n / 8)) : 0;
    let sorcerer = n >= 8 ? Math.min(2, Math.floor(n / 9)) : 0;
    let witch = n >= 8 ? Math.min(2, Math.floor(n / 10)) : 0;
    let hunter = n >= 10 ? 1 : 0;
    let cupid = n >= 12 ? 1 : 0;

    // Special chaos roles (Mayor, Sheriff, Joker, Thief)
    let mayor = 0, sheriff = 0, joker = 0, thief = 0;
    if (n >= 12) {
        // auto aktif semua kalau 12+
        mayor = 1;
        sheriff = 1;
        joker = 1;
        thief = 1;
    } else {
        // random chance muncul kalau <12
        mayor = Math.random() < 0.5 ? 1 : 0;     // 50% chance
        sheriff = Math.random() < 0.6 ? 1 : 0;   // 60% chance
        joker = Math.random() < 0.3 ? 1 : 0;     // 30% chance
        thief = Math.random() < 0.4 ? 1 : 0;     // 40% chance
    }

    // Count total roles assigned
    let assigned = werewolf + seer + guardian + sorcerer + witch + hunter + cupid + mayor + sheriff + joker + thief;
    let warga = Math.max(1, n - assigned);

    return {
        werewolf,
        seer,
        guardian,
        sorcerer,
        witch,
        hunter,
        cupid,
        mayor,
        sheriff,
        joker,
        thief,
        warga
    };
};



     // Salin dan ganti seluruh fungsi roleGenerator yang lama dengan ini

const roleGenerator = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    var role = roleAmount(from, data);
    if (!role) return false;
    // initialize extra room state
    room.witch = room.witch || { healUsed: false, poisonUsed: false };
    room.thiefSwap = room.thiefSwap || { used: false };
    room.lovers = room.lovers || [];
    room.hunterChoice = room.hunterChoice || {}; // mapping hunter.number -> targetNumber

    // FUNGSI INI DIPERBAIKI
    const assignRole = (roleName, times) => {
        for (var i = 0; i < times; i++) {
            var player = room.player.filter((x) => x.role === false);
            var list = roleShuffle(player); // Daftar player yang belum punya role, sudah diacak
            if (list.length === 0) return false;
            
            // PERUBAHAN: Langsung ambil indeks 0, karena 'list' sudah diacak.
            // Tidak perlu Math.random() lagi.
            roleChanger(from, list[0].id, roleName, data);
        }
    };

    assignRole("werewolf", role.werewolf);
    assignRole("seer", role.seer);
    assignRole("guardian", role.guardian);
    
    // PERUBAHAN: Typo 'sorcere' diperbaiki menjadi 'sorcerer'
    assignRole("sorcerer", role.sorcerer); 
    
    assignRole("sheriff", role.sheriff);
    assignRole("witch", role.witch);
    assignRole("hunter", role.hunter);
    assignRole("cupid", role.cupid);
    assignRole("mayor", role.mayor);
    assignRole("thief", role.thief);
    assignRole("joker", role.joker);
    assignRole("warga", role.warga);
    
    for (let player of room.player) {
        if (player.role === false) {
            player.role = "warga";
        }
    }
     for (let player of room.player) {
        if (player.role === "witch") {
            player.witch = { heal: 1, poison: 1 };
        }
        if (player.role === "hunter") {
            player.hunterChoice = null;
        }
        if (player.role === "cupid") {
            player.lovers = [];
        }
        if (player.role === "sheriff") {
            player.sheriffUsed = false;
        }
    }
    
    shortPlayer(from, data);
};


// add cooldown
const addTimer = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.cooldown = Date.now() + toMs(90 + "s");
};

// merubah status room, dalam permainan
const startGame = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.status = true;
};

// rubah hari
const changeDay = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    if (room.time === "pagi") {
        room.time = "voting";
    } else if (room.time === "malem") {
        room.time = "pagi";
        room.day += 1;
    } else if (room.time === "voting") {
        room.time = "malem";
    }
};

// hari voting
const dayVoting = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    if (room.time === "malem") room.time = "voting";
    else if (room.time === "pagi") room.time = "voting";
};

// voting (modify mayor double vote)
const vote = (from, id, sender, data) => {
    room = sesi(from, data);
    if (!room) return false;
    const idGet = room.player.findIndex((i) => i.id === sender);
    if (idGet === -1) return false;
    const indexPlayer = room.player.findIndex((i) => i.number === id);
    if (indexPlayer === -1) return false;
    if (idGet !== -1) room.player[idGet].isvote = true;
    // if voter is mayor, their vote counts as 2
    const voterRole = room.player[idGet].role;
    room.player[indexPlayer].vote += (voterRole === 'mayor') ? 2 : 1;
};

// hasil voting
const voteResult = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.player.sort((a, b) => (a.vote < b.vote ? 1 : -1));
    if (room.player[0].vote === 0) return 0;
    if (room.player[0].vote === room.player[1].vote) return 1;
    return room.player[0];
};

// ------------------ Modified voteKill: record explanations ------------------
const voteKill = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.player.sort((a, b) => (a.vote < b.vote ? 1 : -1));
    if (room.player[0].vote === 0) return 0;
    if (room.player[0].vote === room.player[1].vote) return 1;

    room.lastNightInfo = room.lastNightInfo || [];
    room.dead = room.dead || [];

    // Mark voted player dead (and record)
    const executed = room.player[0];
    if (!executed) return 0;
    if (!executed.isdead) {
        executed.isdead = true;
        room.dead.push(parseInt(executed.number));
        ensureBlacklist(from);
        global.db.data.chats[from].blacklistUsers[executed.id] = true;
    }

    // Record that execution happened (for immediate announcement)
   // room.lastNightInfo.push(`⚖️ Warga desa telah mengeksekusi @${executed.id.replace("@s.whatsapp.net","")} (${executed.role})`);

    // If player was hunter, trigger hunter effect (kill chosen)
    if (executed.role === 'hunter') {
        let hunterNum = executed.number;
        let chosen = room.hunterChoice ? room.hunterChoice[hunterNum] : false;
        if (chosen) {
            // find index for chosen
            let idx = room.player.findIndex(p => p.number === chosen);
            if (idx !== -1 && room.player[idx].isdead === false) {
                room.player[idx].isdead = true;
                room.dead.push(parseInt(room.player[idx].number));
                ensureBlacklist(from);
                global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                room.lastNightInfo.push(`🏹 Hunter ${hunterNum}) @${executed.id.replace("@s.whatsapp.net","")} mati dan menarik @${room.player[idx].id.replace("@s.whatsapp.net","")} ikut mati.`);
            }
        } else {
            // if no chosen, kill random alive player (except self)
            let alive = room.player.filter(p => !p.isdead && p.number !== hunterNum);
            if (alive.length > 0) {
                let r = Math.floor(Math.random() * alive.length);
                let idx = room.player.findIndex(p => p.number === alive[r].number);
                if (idx !== -1) {
                    room.player[idx].isdead = true;
                    room.dead.push(parseInt(room.player[idx].number));
                    ensureBlacklist(from);
                    global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                    room.lastNightInfo.push(`🏹 Hunter ${hunterNum}) @${executed.id.replace("@s.whatsapp.net","")} mati dan menarik @${room.player[idx].id.replace("@s.whatsapp.net","")} ikut mati (acak).`);
                }
            }
        }
    }

    // If voted player is one of lovers, kill the lover too
    if (room.lovers && room.lovers.length === 2) {
        let votedNum = executed.number;
        if (room.lovers.includes(votedNum)) {
            let other = room.lovers.find(n => n !== votedNum);
            let idx = room.player.findIndex(p => p.number === other);
            if (idx !== -1 && room.player[idx].isdead === false) {
                room.player[idx].isdead = true;
                room.dead.push(parseInt(room.player[idx].number));
                ensureBlacklist(from);
                global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                room.lastNightInfo.push(`💘 Karena @${executed.id.replace("@s.whatsapp.net","")} mati, pasangannya @${room.player[idx].id.replace("@s.whatsapp.net","")} ikut mati karena patah hati.`);
            }
        }
    }
    return room.player[0];
};

// voting reset
const resetVote = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    for (let i = 0; i < room.player.length; i++) {
        room.player[i].vote = 0;
    }
};

const voteDone = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.voting = false;
};

const voteStart = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.voting = true;
};

// clear vote
const clearAllVote = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    for (let i = 0; i < room.player.length; i++) {
        room.player[i].vote = 0;
        room.player[i].isvote = false;
    }
};

// clearAll
const clearAll = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.dead = [];
    room.seer = false;
    room.guardian = [];
    room.voting = false;
};

// clear all status player
const clearAllSTATUS = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    for (let i = 0; i < room.player.length; i++) {
        room.player[i].effect = [];
    }
};

const skillOn = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    for (let i = 0; i < room.player.length; i++) room.player[i].status = false;
};

const skillOff = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    for (let i = 0; i < room.player.length; i++) room.player[i].status = true;
};

const playerHidup = (data) => {
    const hasil = data.player.filter((x) => x.isdead === false);
    return hasil.length;
};

const playerMati = (data) => {
    const hasil = data.player.filter((x) => x.isdead === true);
    return hasil.length;
};

// get player win (exclude joker)
const getWinner = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    var ww = 0;
    var orang_baek = 0;
    const goodRoles = ['warga','guardian','seer','witch','hunter','mayor','sheriff','thief','cupid'];
    const evilRoles = ['werewolf','sorcerer'];
    for (let i = 0; i < room.player.length; i++) {
        if (room.player[i].isdead === false) {
            if (evilRoles.includes(room.player[i].role)) ww += 1;
            else if (goodRoles.includes(room.player[i].role)) orang_baek += 1;
            // joker is ignored in counting
        }
    }
    if (room.voting) {
        b = voteResult(from, data);
        if (b != 0 && b != 1) {
            if (evilRoles.includes(b.role)) ww -= 1;
            else if (goodRoles.includes(b.role)) orang_baek -= 1;
            // if b.role === 'joker' => handled elsewhere (joker win)
        }
    }
    if (ww === 0) {
        room.iswin = true;
        return { voting: room.voting, status: true };
    } else if (ww === orang_baek) {
        room.iswin = false;
        return { voting: room.voting, status: false };
    } else if (orang_baek === 0) {
        room.iswin = false;
        return { voting: room.voting, status: false };
    } else {
        return { voting: room.voting, status: null };
    }
};

// shorting
const shortPlayer = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.player.sort((a, b) => a.number - b.number);
};

// ------------------ Modified killww: apply dead list and record explanatory messages ------------------
const killww = (from, id, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.lastNightInfo = room.lastNightInfo || [];
    room.dead = room.dead || [];
    ensureBlacklist(from);

    // process dynamic list so that newly added deaths (hunter retaliation, lover suicide) are also processed
    let all = room.dead.slice(); // initial snapshot
    for (let j = 0; j < all.length; j++) {
        let deadNum = all[j];
        // safety: if deadNum not present in current room.dead (might have been processed) still continue
        let idd = getPlayerById(from, room.player[0].id, deadNum, data);
        if (!idd) continue;
        // skip if already marked dead
        if (room.player[idd.index].isdead === true) {
            continue;
        }
        // if guardian saved -> note and skip actual death
        if (room.player[idd.index].effect.includes("guardian")) {
            // guardian saving mention will be shown as "hampir dibunuh namun Guardian berhasil melindunginya" in pagii already
            // we can add a short info line as well
            // but we keep the original pagii behavior; no extra event needed here
            continue;
        }
        // apply death
        room.player[idd.index].isdead = true;
        ensureBlacklist(from);
        global.db.data.chats[from].blacklistUsers[room.player[idd.index].id] = true;

        // HUNTER: if the dead person is hunter -> their chosen target dies too
        if (room.player[idd.index].role === 'hunter') {
            let hunterNum = room.player[idd.index].number;
            let chosen = room.hunterChoice ? room.hunterChoice[hunterNum] : false;
            if (chosen) {
                let idx = room.player.findIndex(p => p.number === chosen);
                if (idx !== -1 && room.player[idx].isdead === false) {
                    room.player[idx].isdead = true;
                    ensureBlacklist(from);
                    global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                    // push into dead arrays so pagii lists them too
                    if (!room.dead.includes(room.player[idx].number)) {
                        room.dead.push(parseInt(room.player[idx].number));
                        all.push(room.player[idx].number); // ensure we process newly added death
                    }
                    room.lastNightInfo.push(`🏹 Hunter ${hunterNum}) @${room.player[idd.index].id.replace("@s.whatsapp.net","")} mati dan menarik @${room.player[idx].id.replace("@s.whatsapp.net","")} ikut mati.`);
                }
            } else {
                // random retaliation
                let alive = room.player.filter(p => !p.isdead && p.number !== hunterNum);
                if (alive.length > 0) {
                    let r = Math.floor(Math.random() * alive.length);
                    let idx = room.player.findIndex(p => p.number === alive[r].number);
                    if (idx !== -1) {
                        room.player[idx].isdead = true;
                        ensureBlacklist(from);
                        global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                        if (!room.dead.includes(room.player[idx].number)) {
                            room.dead.push(parseInt(room.player[idx].number));
                            all.push(room.player[idx].number);
                        }
                        room.lastNightInfo.push(`🏹 Hunter ${hunterNum}) @${room.player[idd.index].id.replace("@s.whatsapp.net","")} mati dan menarik @${room.player[idx].id.replace("@s.whatsapp.net","")} ikut mati (acak).`);
                    }
                }
            }
        }

        // LOVERS: if a lover dies, the other lover dies too
        if (room.lovers && room.lovers.length === 2) {
            let diedNum = room.player[idd.index].number;
            if (room.lovers.includes(diedNum)) {
                let other = room.lovers.find(n => n !== diedNum);
                let idx = room.player.findIndex(p => p.number === other);
                if (idx !== -1 && room.player[idx].isdead === false) {
                    room.player[idx].isdead = true;
                    ensureBlacklist(from);
                    global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                    if (!room.dead.includes(room.player[idx].number)) {
                        room.dead.push(parseInt(room.player[idx].number));
                        all.push(room.player[idx].number);
                    }
                    room.lastNightInfo.push(`💘 Karena @${room.player[idd.index].id.replace("@s.whatsapp.net","")} mati, pasangannya @${room.player[idx].id.replace("@s.whatsapp.net","")} ikut mati karena patah hati.`);
                }
            }
        }
        // Note: witch poison/heal & sheriff actions are expected to be recorded by the night-action handlers
        // If room.witch.lastAction exists, we'll create messages in pagi() below (so we don't duplicate here)
    }
};

// roleLeft unchanged
async function roleLeft(chat, ww) {
    let room = ww[chat];
    let counter = {};
    for (let p of room.player) {
        if (!p.isdead && p.role) counter[p.role] = (counter[p.role] || 0) + 1;
    }
    let txt = "\n*⌂ R O L E   L E F T*\n\n";
    for (let [role, jumlah] of Object.entries(counter)) {
        txt += `• ${role} : ${jumlah}\n`;
    }
    return txt.trim();
}

const pagii = (data) => {
    if (data.dead.length < 1) {
        return `*⌂ W E R E W O L F - G A M E*\n\nMentari telah terbit, tidak ada korban berjatuhan malam ini... \n90 detik tersisa sebelum waktu penentuan\n*Hari ke ${data.day}*`
    } else {
        a = "";
        d = "";
        e = [];
        f = [];
        for (let i = 0; i < data.dead.length; i++) {
            b = data.player.findIndex((x) => x.number === data.dead[i]);
            if (data.player[b].effect.includes("guardian")) e.push(data.player[b].id);
            else f.push(data.player[b].id);
        }
        for (let i = 0; i < f.length; i++) {
            if (i === f.length - 1) {
                if (f.length > 1) a += ` dan @${f[i].replace("@s.whatsapp.net", "")}`;
                else a += `@${f[i].replace("@s.whatsapp.net", "")}`;
            } else if (i === f.length - 2) a += `@${f[i].replace("@s.whatsapp.net", "")}`;
            else a += `@${f[i].replace("@s.whatsapp.net", "")}, `;
        }
        for (let i = 0; i < e.length; i++) {
            if (i === e.length - 1) {
                if (e.length > 1) d += ` dan @${e[i].replace("@s.whatsapp.net", "")}`;
                else d += `@${e[i].replace("@s.whatsapp.net", "")}`;
            } else if (i === e.length - 2) d += `@${e[i].replace("@s.whatsapp.net", "")}`;
            else d += `@${e[i].replace("@s.whatsapp.net", "")}, `;
        }
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nPagi telah tiba, warga desa menemukan ${data.dead.length > 1 ? "beberapa" : "1"} mayat. ${a ? a + " telah mati! " : ""}${d.length > 1 ? ` ${d} hampir dibunuh, namun Guardian berhasil melindunginya.` : ""}\n\n90 detik untuk berdiskusi\n*Hari ke ${data.day}*`;
        textnya += `\n\n*RULES*\n\n- *Dilarang cepu ke sesama partner!*\n- *Dilarang mengirim bukti screenshot dan pesan diteruskan!*`;
        return textnya;
    }
};

async function pagi(conn, x, data) {
    // x is the room object
    let ment = [];
    for (let i = 0; i < x.player.length; i++) ment.push(x.player[i].id);
    shortPlayer(x.room, data);

    // Ensure arrays exist
    x.events = x.events || [];
    x.lastNightInfo = x.lastNightInfo || [];
    x.dead = x.dead || [];

    // Apply pending deaths and produce explanatory messages (killww will also populate lastNightInfo)
    killww(x.room, x.dead, data);
    shortPlayer(x.room, data);
    // Now build base pagi text
    let base = pagii(x);

    // Append extra explanatory lines (hunter retaliation, lover suicides, witch actions, sheriff results) if any
    // Witch actions: detect room.witch.lastAction if exists -> produce message
    let extras = [];
    try {
        if (x.witch && x.witch.lastAction) {
            if (x.witch.lastAction.type === "heal") {
                let healedNum = x.witch.lastAction.target;
                let healed = x.player.find(pl => pl.number === healedNum);
                if (healed) extras.push(`🧙‍♀️ Witch menyelamatkan @${healed.id.replace("@s.whatsapp.net","")} semalam.`);
            } else if (x.witch.lastAction.type === "poison") {
                let poisonedNum = x.witch.lastAction.target;
                let poisoned = x.player.find(pl => pl.number === poisonedNum);
                if (poisoned) extras.push(`🧙‍♀️ Witch meracuni @${poisoned.id.replace("@s.whatsapp.net","")} semalam.`);
            }
        }
    } catch (e) {
        // ignore
    }

    // Append any lastNightInfo (these were populated by voteKill and killww)
    if (x.lastNightInfo && x.lastNightInfo.length > 0) {
        for (let ln of x.lastNightInfo) {
            extras.push(ln);
        }
    }

    // Combine base + extras
    let finalText = base;
    if (extras.length > 0) {
        finalText += "\n\n*INFO MALAM*";
        for (let ex of extras) finalText += `\n${ex}`;
    }

    await conn.groupSettingUpdate(x.room, 'not_announcement');
    await conn.sendMessage(x.room, {
        text: finalText,
        contextInfo: {
            externalAdReply: {
                title: 'W E R E W O L F',
                body: 'HuTao BOT',
                sourceUrl: '',
                mediaType: 1,
                renderLargerThumbnail: true,
            }, mentionedJid: x.player.map(p => p.id),
        }
    });

    // cleanup: clear lastNightInfo and dead so next cycle starts fresh
    x.lastNightInfo = [];
    x.dead = [];
    changeDay(x.room, data);
}

async function voting(conn, x, data) {
    let ment = [];
    voteStart(x.room, data)
    textnya =
        '*⌂ W E R E W O L F - G A M E*\n\nSenja telah tiba. Kalian mempunyai waktu selama 50 detik untuk memilih!\n\n*L I S T - P L A Y E R*:\n';
    shortPlayer(x.room, data);
    for (let i = 0; i < x.player.length; i++) {
        textnya += `(${x.player[i].number}) @${x.player[i].id.replace("@s.whatsapp.net", "")} ${x.player[i].isdead === true ? "☠️" : ""}\n`;
        ment.push(x.player[i].id);
    }
    textnya += "\nketik *.ww vote nomor* untuk voting player\n\n";
    textnya += await roleLeft(x.room, data);
    dayVoting(x.room, data);
    clearAll(x.room, data);
    clearAllSTATUS(x.room, data);
    await conn.groupSettingUpdate(x.room, 'not_announcement');
    return await conn.sendMessage(x.room, {
        text: textnya,
        contextInfo: {
            externalAdReply: {
                title: 'W E R E W O L F',
                body: 'HuTao BOT',
                mediaType: 1,
                renderLargerThumbnail: true,
            },
            mentionedJid: ment,
        },
    });
}

async function malam(conn, x, data) {
    var hasil_vote = voteResult(x.room, data);
    if (hasil_vote === 0) {
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nTidak ada yang dieksekusi hari ini. Pemain malam hari: kalian punya 90 detik untuk beraksi!\n\n`;
        textnya += await roleLeft(x.room, data);
        await conn.groupSettingUpdate(x.room, 'announcement');
        return conn.sendMessage(x.room, { text: textnya, contextInfo: {} }).then(() => {
            changeDay(x.room, data);
            voteDone(x.room, data);
            resetVote(x.room, data);
            clearAllVote(x.room, data);
            if (getWinner(x.room, data).status != null) return win(x, 1, conn, data);
        });
    } else if (hasil_vote === 1) {
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nHasil voting seri.\n\nPemain malam hari: kalian punya 90 detik untuk beraksi!\n\n`;
        textnya += await roleLeft(x.room, data);
        await conn.groupSettingUpdate(x.room, 'announcement');
        return conn.sendMessage(x.room, { text: textnya, contextInfo: {} }).then(() => {
            changeDay(x.room, data);
            voteDone(x.room, data);
            resetVote(x.room, data);
            clearAllVote(x.room, data);
            if (getWinner(x.room, data).status != null) return win(x, 1, conn, data);
        });
    } else if (hasil_vote != 0 && hasil_vote != 1) {
        // Joker check: if voted player is joker -> Joker wins immediately
        if (hasil_vote.role === "joker") {
            textnya = `*⌂ W E R E W O L F - G A M E*\n\nWarga desa telah memilih dan mengeksekusi @${hasil_vote.id.replace("@s.whatsapp.net","")}.\n\n🃏 *JOKER TERUNGKAP!* 🎉\nJoker berhasil ditangkap warga dan *MENANG SENDIRI*!`;
            await conn.sendMessage(x.room, { text: textnya, contextInfo: { mentionedJid: [hasil_vote.id] } });
            await conn.delay(1000);
            // End game and declare joker winner
            return await winJoker(x, hasil_vote, conn, data);
        }
        // Normal flow: announce role and kill (voteKill will record explanatory effects into room.lastNightInfo)
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nWarga desa telah memilih dan sepakat @${hasil_vote.id.replace("@s.whatsapp.net","")} dieksekusi.\n\n@${hasil_vote.id.replace("@s.whatsapp.net","")} adalah ${hasil_vote.role} ${emoji_role(hasil_vote.role)}\n\nPemain malam hari: kalian punya 90 detik untuk beraksi!\n\n`;
        textnya += await roleLeft(x.room, data);

        // call voteKill which will set executed as dead and populate room.dead and room.lastNightInfo
        voteKill(x.room, data);

        // build immediate extras (if voteKill created lastNightInfo entries)
        let extras = [];
        let roomObj = sesi(x.room, data);
        if (roomObj && roomObj.lastNightInfo && roomObj.lastNightInfo.length > 0) {
            extras = roomObj.lastNightInfo.slice();
        }

        // prepare mention for executed
        let ment = [];
        ment.push(hasil_vote.id);
        ensureBlacklist(x.room);
        global.db.data.chats[x.room].blacklistUsers[hasil_vote.id] = true;
        await conn.groupSettingUpdate(x.room, 'announcement');

        // append extras (like lover/hunter immediate deaths) to the voting announcement
        if (extras.length > 0) {
            textnya += `\n*INFO EKSEKUSI*`;
            for (let ex of extras) textnya += `\n${ex}`;
        }

        return conn.sendMessage(x.room, {
            text: textnya,
            contextInfo: {
                mentionedJid: ment
            },
        }).then(() => {
            changeDay(x.room, data);
            voteDone(x.room, data);
            resetVote(x.room, data);
            clearAllVote(x.room, data);
            // clear immediate lastNightInfo so pagi won't duplicate; keep it only for pagi if needed
            if (roomObj) roomObj.lastNightInfo = roomObj.lastNightInfo || [];
            if (getWinner(x.room, data).status != null) return win(x, 1, conn, data);
        });
    }
}

async function skill(conn, x, data) {
    skillOn(x.room, data)
    if (getWinner(x.room, data).status != null || x.win != null) return win(x, 1, conn, data);
    if (!x || !x.player) return;
    if (x.win != null) return;
    let tok1 = "\n";
    let tok2 = "\n";
    let membernya = [];
    shortPlayer(x.room, data);
    for (let i = 0; i < x.player.length; i++) {
        tok1 += `(${x.player[i].number}) @${x.player[i].id.replace("@s.whatsapp.net","")}${x.player[i].isdead === true ? " ☠️" : ""}\n`;
        membernya.push(x.player[i].id);
    }
    for (let i = 0; i < x.player.length; i++) {
        tok2 += `(${x.player[i].number}) @${x.player[i].id.replace("@s.whatsapp.net","")} ${x.player[i].role === "werewolf" || x.player[i].role === "sorcerer" ? `${x.player[i].isdead === true ? ` ☠️` : ` ${x.player[i].role}`}` : " "}\n`;
        membernya.push(x.player[i].id);
    }
    // iterate players and send private prompts for their role's night action
    for (let i = 0; i < x.player.length; i++) {
        if (x.player[i].isdead === true) continue;
        const role = x.player[i].role;
        const jid = x.player[i].id;
        if (role === "werewolf") {
            textnya = `Silahkan pilih salah satu orang yang ingin kamu makan malam ini\n*LIST PLAYER*:\n${tok2}\n\nKetik *.wwpc kill nomor* untuk membunuh player\n\n*Dilarang cepu ke sesama partner!*`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "warga") {
            textnya = `Kamu adalah Warga Desa. Tetap waspada.\n*LIST PLAYER*:\n${tok1}`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "seer") {
            textnya = `Kamu adalah Seer. Pilih satu player untuk melihat rolenya.\n*LIST PLAYER*:\n${tok1}\n\nKetik *.wwpc dreamy nomor*`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "guardian") {
            textnya = `Kamu adalah Guardian. Pilih player untuk dilindungi.\n*LIST PLAYER*:\n${tok1}\n\nKetik *.wwpc deff nomor*`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "sorcerer") {
            textnya = `Kamu adalah Sorcerer (partner werewolf). Pilih satu player untuk membuka identitas (hati-hati!).\n*LIST PLAYER*:\n${tok2}\n\nKetik *.wwpc sorcerer nomor*`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "sheriff") {
            textnya = `Kamu adalah Sheriff. Malam ini kamu dapat menembak 1 orang.\nJika benar (werewolf/sorcerer/joker) target mati.\nJika salah, kamu akan mati.\n*LIST PLAYER*:\n${tok1}\n\nKetik *.wwpc sheriff nomor*`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "witch") {
            // show status of potions
            room = sesi(x.room, data);
            let healUsed = room.witch ? room.witch.healUsed : false;
            let poisonUsed = room.witch ? room.witch.poisonUsed : false;
            textnya = `Kamu adalah Witch.\nPotion Heal digunakan: ${healUsed ? "✅" : "❌"}\nPotion Poison digunakan: ${poisonUsed ? "✅" : "❌"}\n\nKetik *.wwpc witch heal nomor* atau *.wwpc witch poison nomor*\n*LIST PLAYER*:\n${tok1}`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "hunter") {
            textnya = `Kamu adalah Hunter. Kamu dapat memilih target yang akan terbunuh bersamamu jika kamu mati.\n*LIST PLAYER*:\n${tok1}\n\nKetik *.wwpc hunter nomor* untuk memilih target (opsional).`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "cupid") {
            textnya = `Kamu adalah Cupid. Pilih 2 orang untuk dijadikan lovers malam pertama.\n*LIST PLAYER*:\n${tok1}\n\nKetik *.wwpc cupid nomor1 nomor2*`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "mayor") {
            textnya = `Kamu adalah Mayor. Suaramu dihitung 2 saat voting.\n*LIST PLAYER*:\n${tok1}\n\nTidak ada aksi malam khusus.`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "thief") {
            textnya = `Kamu adalah Thief. Malam pertama kamu dapat menukar rolemu dengan orang lain.\n*LIST PLAYER*:\n${tok1}\n\nKetik *.wwpc thief nomor* untuk menukar (opsional).`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        } else if (role === "joker") {
            textnya = `Kamu adalah Joker. Tujuanmu: agar warga mengeksekusimu saat voting.\nJika kamu dieksekusi, kamu menang!`;
            await conn.sendMessage(jid, { text: textnya, mentions: membernya });
        }
    }
}

async function winJoker(x, jokerPlayer, conn, data) {
    const sesinya = x.room;
       let users = global.db.data.users[jokerPlayer.id] || (global.db.data.users[jokerPlayer.id] = {})

       let moneyEarned = Math.floor(Math.random() * (590000000 - 600000000 + 1) + 600000000);
                let expEarned = Math.floor(Math.random() * (500000 - 490000 + 1) + 500000);
                let limitEarned = Math.floor(Math.random() * (4000 - 3000 + 1) + 4000);
       users.money = (users.money || 0) + moneyEarned;
                users.exp = (users.exp || 0) + expEarned;
                users.limit = (users.limit || 0) + limitEarned;

       textnya = `*J O K E R - W I N*\n\n🃏 *JOKER MENANG SENDIRI* 🃏\n\nSelamat kepada @${jokerPlayer.id.replace("@s.whatsapp.net","")} (Joker) yang berhasil membuat warga mengeksekusinya!\nJoker mendapatkan\n- Money: ${moneyEarned}\n- Exp: ${expEarned}\n- Limit: ${limitEarned}\n\nGame berakhir.`;
    await conn.groupSettingUpdate(sesinya, 'not_announcement');
    await conn.sendMessage(sesinya, { text: textnya, contextInfo: { mentionedJid: [jokerPlayer.id] } });
    
    if (!global.db.data.chats[sesinya].blacklistUsers)
        global.db.data.chats[sesinya].blacklistUsers = {};

    for (let player of x.player) {
        if (player && player.id && global.db.data.chats[sesinya].blacklistUsers[player.id]) {
            delete global.db.data.chats[sesinya].blacklistUsers[player.id];
        }
    }
    
    delete data[sesinya];
    return;
}

async function win(x, t, conn, data) {
    const sesinya = x.room;
    const winnerData = getWinner(x.room, data);

    if (winnerData.status === false || x.iswin === false) {
        // WEREWOLF WIN
        textnya = `*W E R E W O L F - W I N*\n\n🏆 *TEAM WEREWOLF* 🏆\n\n`;
        let ment = [];
        for (let i = 0; i < x.player.length; i++) {
            global.db.data.chats[sesinya].blacklistUsers = {};
            if (x.player[i].role === "sorcerer" || x.player[i].role === "werewolf") {
                let jid = x.player[i].id;
                let users = global.db.data.users[jid] || (global.db.data.users[jid] = {})

                let moneyEarned = Math.floor(Math.random() * (300000000 - 290000000 + 1) + 300000000);
                let expEarned = Math.floor(Math.random() * (250000 - 240000 + 1) + 250000);
                let limitEarned = Math.floor(Math.random() * (2500 - 2200 + 1) + 2500);

                // Menambahkan hadiah ke database
                users.money = (users.money || 0) + moneyEarned;
                users.exp = (users.exp || 0) + expEarned;
                users.limit = (users.limit || 0) + limitEarned;
                textnya += `*${x.player[i].number})* *@${jid.replace("@s.whatsapp.net", "")}*\n`;
                textnya += `      *Role* : ${x.player[i].role}\n`;
                textnya += `          +${moneyEarned.toLocaleString()} Money\n`;
                textnya += `          +${expEarned.toLocaleString()} Exp\n`;
                textnya += `          +${limitEarned.toLocaleString()} Limit\n\n`;

                ment.push(jid);
            }
        }
        await conn.groupSettingUpdate(sesinya, 'not_announcement');
        
    for (let player of x.player) {
        if (player && player.id && global.db.data.chats[sesinya].blacklistUsers[player.id]) {
            delete global.db.data.chats[sesinya].blacklistUsers[player.id];
        }
    }
    
        return await conn.sendMessage(sesinya, { text: textnya, contextInfo: { mentionedJid: ment } })
            .then(() => { delete data[x.room]; });
    } else if (winnerData.status === true) {
        // WARGA WIN
        textnya = `*T E A M - W A R G A - W I N*\n\n🏆 *TEAM WARGA* 🏆\n\n`;
        let ment = [];
        for (let i = 0; i < x.player.length; i++) {
            global.db.data.chats[sesinya].blacklistUsers = {};
            if (["warga", "guardian", "seer", "witch", "hunter", "mayor", "sheriff", "thief", "cupid"].includes(x.player[i].role)) {
                let jid = x.player[i].id;
                let users = global.db.data.users[jid] || (global.db.data.users[jid] = {})

                let moneyEarned = Math.floor(Math.random() * (240000000 - 250000000 + 1) + 250000000);
                let expEarned = Math.floor(Math.random() * (200000 - 190000 + 1) + 200000);
                let limitEarned = Math.floor(Math.random() * (2100 - 2000 + 1) + 2100);

                // Menambahkan hadiah ke database
                users.money = (users.money || 0) + moneyEarned;
                users.exp = (users.exp || 0) + expEarned;
                users.limit = (users.limit || 0) + limitEarned;
                textnya += `*${x.player[i].number})* *@${jid.replace("@s.whatsapp.net", "")}*\n`;
                textnya += `      *Role* : ${x.player[i].role}\n`;
                textnya += `          +${moneyEarned.toLocaleString()} Money\n`;
                textnya += `          +${expEarned.toLocaleString()} Exp\n`;
                textnya += `          +${limitEarned.toLocaleString()} Limit\n\n`;

                ment.push(jid);
            }
        }
        await conn.groupSettingUpdate(sesinya, 'not_announcement');
        
    for (let player of x.player) {
        if (player && player.id && global.db.data.chats[sesinya].blacklistUsers[player.id]) {
            delete global.db.data.chats[sesinya].blacklistUsers[player.id];
        }
    }
    
        return await conn.sendMessage(sesinya, { text: textnya, contextInfo: { mentionedJid: ment } })
            .then(() => { delete data[x.room]; });
    }
}

// playing loops (unchanged)
async function run(conn, id, data) {
    while (getWinner(id, data).status === null) {
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await sleep(90000); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await pagi(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await sleep(90000); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await voting(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await sleep(90000); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await malam(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await skill(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) break;
    }
    await win(sesi(id, data), 1, conn, data);
}

async function run_vote(conn, id, data) { /* similar loop - kept as before */
    while (getWinner(id, data).status === null) {
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await voting(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await sleep(50000); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await malam(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await skill(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) break;
    }
    await win(sesi(id, data), 1, conn, data);
}

async function run_malam(conn, id, data) {
    while (getWinner(id, data).status === null) {
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await skill(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await sleep(90000); }
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await pagi(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) break;
    }
    await win(sesi(id, data), 1, conn, data);
}
async function run_pagi(conn, id, data) {
    while (getWinner(id, data).status === null) {
        if (getWinner(id, data).status != null) { win(getWinner(id, data), 1, conn, data); break; } else { await pagi(conn, sesi(id, data), data); }
        if (getWinner(id, data).status != null) break;
    }
    await win(sesi(id, data), 1, conn, data);
}

module.exports = {
    emoji_role,
    sesi,
    playerOnGame,
    playerOnRoom,
    playerExit,
    dataPlayer,
    dataPlayerById,
    getPlayerById,
    getPlayerById2,
    killWerewolf,
    killww,
    dreamySeer,
    sorcerer,
    protectGuardian,
    roleShuffle,
    roleChanger,
    roleAmount,
    roleGenerator,
    addTimer,
    startGame,
    playerHidup,
    playerMati,
    vote,
    voteResult,
    clearAllVote,
    getWinner,
    win,
    pagi,
    malam,
    skill,
    voteStart,
    voteDone,
    voting,
    run,
    run_vote,
    run_malam,
    run_pagi,
    roleLeft,
    sheriffKill,
    roleShuffle
};

let fs = require('fs')
let chalk = require('chalk')
let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("Update 'lib/werewolf js'"))
  delete require.cache[file]
  require(file)
})