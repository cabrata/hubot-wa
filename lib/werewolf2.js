// werewolf.js (modified by assistant — full file)

// NOTE: file based on user's werewolf (3).js with additions:
// - room.events tracking for announcements
// - safer accesses to global.db.data.chats[...] and blacklistUsers
// - detailed announcements in pagi() and after voteKill()
// - tracking of witch lastAction, sheriffLast, thiefSwap, etc.

// dependencies
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

// helper: ensure blacklistUsers exists
const ensureBlacklist = (from) => {
    if (!global.db) global.db = { data: { chats: {} } };
    if (!global.db.data.chats[from]) global.db.data.chats[from] = {};
    if (!global.db.data.chats[from].blacklistUsers) global.db.data.chats[from].blacklistUsers = {};
};

// werewolf kill (existing) - unchanged logic but add event tracking & safety
const killWerewolf = (sender, id, data) => {
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let { index, sesi, db } = result;
    let roomLoc = data[sesi];
    if (!roomLoc) return false;
    roomLoc.events = roomLoc.events || [];
    if (roomLoc.player[index].number === id) {
        if (db.effect.includes("guardian")) {
            roomLoc.guardian.push(parseInt(id));
            roomLoc.dead.push(parseInt(id));
            roomLoc.events.push({ type: "attempt_kill", number: id, protected: true, by: "werewolf" });
        } else if (!db.effect.includes("guardian")) {
            roomLoc.dead.push(parseInt(id));
            roomLoc.events.push({ type: "death", number: id, by: "werewolf" });
        }
    }
};

// sheriff action (night kill with risk) — uses sender JID & numeric id
const sheriffKill = (sender, id, data) => {
    // sender is sheriff's jid; id is number target
    let result = getPlayerById2(sender, id, data);
    if (!result) return false;
    let sheriff = dataPlayer(sender, data);
    let from = sheriff.sesi;
    if (!sheriff || !from) return false;
    let roomLoc = data[from];
    if (!roomLoc) return false;
    roomLoc.events = roomLoc.events || [];
    let targetIndex = roomLoc.player.findIndex((p) => p.number === id);
    if (targetIndex === -1) return false;
    // If target is werewolf or sorcerer or joker => target dies (consider guardian)
    if (["werewolf", "sorcerer", "joker"].includes(roomLoc.player[targetIndex].role)) {
        if (roomLoc.player[targetIndex].effect.includes("guardian")) {
            roomLoc.guardian.push(parseInt(id));
            roomLoc.dead.push(parseInt(id));
            roomLoc.events.push({ type: "sheriff_kill", sheriff: sheriff.number, target: id, protected: true });
        } else {
            roomLoc.dead.push(parseInt(id));
            roomLoc.events.push({ type: "sheriff_kill", sheriff: sheriff.number, target: id, protected: false });
        }
    } else {
        // wrong kill -> sheriff dies immediately
        roomLoc.dead.push(parseInt(sheriff.number));
        roomLoc.events.push({ type: "sheriff_miss", sheriff: sheriff.number, target: id });
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
    // record event
    data[sesi].events = data[sesi].events || [];
    data[sesi].events.push({ type: "guardian_protect", target: id });
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
    // base numbers
    let werewolf = Math.max(1, Math.floor(n / 4)); // ~1 per 4 players
    if (werewolf > Math.floor(n / 3)) werewolf = Math.floor(n / 3); // cap
    let seer = n >= 6 ? 1 : 0;
    let guardian = n >= 6 ? 1 : 0;
    let sheriff = n >= 8 ? 1 : 0;
    let sorcerer = n >= 9 ? 1 : 0;
    let witch = n >= 10 ? 1 : 0;
    let hunter = n >= 11 ? 1 : 0;
    let cupid = n >= 12 ? 1 : 0;
    let mayor = n >= 13 ? 1 : 0;
    let thief = n >= 15 ? 1 : 0;
    let joker = n >= 12 ? 1 : 0; // Joker muncul lebih awal (12+)

    // ensure minimal composition and not exceed players
    let assigned = werewolf + seer + guardian + sorcerer + sheriff + witch + hunter + cupid + mayor + thief + joker;
    let warga = Math.max(1, n - assigned);

    return {
        werewolf,
        seer,
        guardian,
        sorcere: sorcerer,
        sheriff,
        witch,
        hunter,
        cupid,
        mayor,
        thief,
        joker,
        warga
    };
};

const roleGenerator = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    var role = roleAmount(from, data);
    if (!role) return false;
    // initialize extra room state
    room.witch = room.witch || { healUsed: false, poisonUsed: false, lastAction: null };
    room.thiefSwap = room.thiefSwap || { used: false };
    room.lovers = room.lovers || [];
    room.hunterChoice = room.hunterChoice || {}; // mapping hunter.number -> targetNumber
    room.events = room.events || []; // event log for announcements

    const assignRole = (roleName, times) => {
        for (var i = 0; i < times; i++) {
            var player = room.player.filter((x) => x.role === false);
            var list = roleShuffle(player);
            if (list.length === 0) return false;
            var random = Math.floor(Math.random() * list.length);
            roleChanger(from, list[random].id, roleName, data);
        }
    };

    assignRole("werewolf", role.werewolf);
    assignRole("seer", role.seer);
    assignRole("guardian", role.guardian);
    assignRole("sorcerer", role.sorcere);
    assignRole("sheriff", role.sheriff);
    assignRole("witch", role.witch);
    assignRole("hunter", role.hunter);
    assignRole("cupid", role.cupid);
    assignRole("mayor", role.mayor);
    assignRole("thief", role.thief);
    assignRole("joker", role.joker);
    assignRole("warga", role.warga);

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

// vote killing
// keep signature same (from, data) — this function will mutate room and room.events
const voteKill = (from, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.events = room.events || [];
    room.player.sort((a, b) => (a.vote < b.vote ? 1 : -1));
    if (room.player[0].vote === 0) return 0;
    if (room.player[0].vote === room.player[1].vote) return 1;
    // Mark voted player dead (we only record here; actual isdead applied in killww)
    room.events.push({ type: "execution", number: room.player[0].number });
    // also mark blacklist safely
    ensureBlacklist(from);
    global.db.data.chats[from].blacklistUsers[room.player[0].id] = true;
    // handle hunter effect & lovers later in killww which processes room.dead
    // but for execution we add to room.dead to be processed by killww flow in pagi
    room.dead.push(parseInt(room.player[0].number));
    // Note: we do not directly set isdead here; killww will apply and set isdead and process hunter/lovers
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

// werewolf killing apply dead list to actual isdead and trigger lover/hunter consequences
// modified: ensure blacklist exists and record events for hunter/cupid
const killww = (from, id, data) => {
    room = sesi(from, data);
    if (!room) return false;
    room.events = room.events || [];
    ensureBlacklist(from);

    for (let j = 0; j < room.dead.length; j++) {
        let deadNum = room.dead[j];
        idd = getPlayerById(from, room.player[0].id, deadNum, data);
        if (!idd) continue;
        // if guardian saved -> add event and skip marking isdead
        if (room.player[idd.index].effect.includes("guardian")) {
            room.events.push({ type: "guardian_saved", number: deadNum });
            // add to guardian array already handled before
            continue;
        }
        // mark actual isdead and blacklist
        room.player[idd.index].isdead = true;
        global.db.data.chats[from].blacklistUsers[room.player[idd.index].id] = true;
        room.events.push({ type: "death_applied", number: deadNum });

        // if hunter died, handle as in voteKill: kill chosen or random and record event
        if (room.player[idd.index].role === 'hunter') {
            let hunterNum = room.player[idd.index].number;
            let chosen = room.hunterChoice ? room.hunterChoice[hunterNum] : false;
            if (chosen) {
                let idx = room.player.findIndex(p => p.number === chosen);
                if (idx !== -1 && room.player[idx].isdead === false) {
                    room.player[idx].isdead = true;
                    global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                    room.events.push({ type: "hunter_retaliate", hunter: hunterNum, target: chosen });
                }
            } else {
                let alive = room.player.filter(p => !p.isdead && p.number !== hunterNum);
                if (alive.length > 0) {
                    let r = Math.floor(Math.random() * alive.length);
                    let idx = room.player.findIndex(p => p.number === alive[r].number);
                    room.player[idx].isdead = true;
                    global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                    room.events.push({ type: "hunter_retaliate_random", hunter: hunterNum, target: alive[r].number });
                }
            }
        }

        // lovers: if a lover dies, other lover dies too + record event
        if (room.lovers && room.lovers.length === 2) {
            let diedNum = room.player[idd.index].number;
            if (room.lovers.includes(diedNum)) {
                let other = room.lovers.find(n => n !== diedNum);
                let idx = room.player.findIndex(p => p.number === other);
                if (idx !== -1 && room.player[idx].isdead === false) {
                    room.player[idx].isdead = true;
                    global.db.data.chats[from].blacklistUsers[room.player[idx].id] = true;
                    room.events.push({ type: "lover_suicide", died: diedNum, other: other });
                }
            }
        }
    }
    // after processing, clear dead array (we will announce based on events)
    // but keep it for pagii formatting if needed — here we leave to pagi() to clear after announcing
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

// pagii text still used for short announcement, but pagi() now builds richer text using room.events
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

// richer pagi announce using room.events
async function pagi(conn, x, data) {
    let ment = [];
    for (let i = 0; i < x.player.length; i++) ment.push(x.player[i].id);
    shortPlayer(x.room, data);

    // Ensure room.events exists
    x.events = x.events || [];

    // apply dead & side effects
    killww(x.room, x.dead, data);
    shortPlayer(x.room, data);
    changeDay(x.room, data);

    // build rich message based on events
    let lines = [];
    lines.push(`*⌂ W E R E W O L F - G A M E*`);
    lines.push(`\n🌅 Pagi telah tiba — hasil malam ini:`);

    if (x.events.length === 0 && x.dead.length < 1) {
        lines.push(`\n- Tidak ada korban malam ini.`);
    } else {
        // Process events in order they were added
        for (let ev of x.events) {
            if (!ev || !ev.type) continue;
            if (ev.type === "death_applied") {
                let p = x.player.find(pl => pl.number === ev.number);
                if (p) lines.push(`\n☠️ ${p.number}) @${p.id.replace("@s.whatsapp.net","")} (${p.role}) ditemukan mati.`);
            } else if (ev.type === "guardian_saved") {
                let p = x.player.find(pl => pl.number === ev.number);
                if (p) lines.push(`\n🛡️ ${p.number}) @${p.id.replace("@s.whatsapp.net","")} hampir dibunuh namun diselamatkan oleh Guardian.`);
            } else if (ev.type === "hunter_retaliate" || ev.type === "hunter_retaliate_random") {
                let hunter = x.player.find(pl => pl.number === ev.hunter);
                let victim = x.player.find(pl => pl.number === ev.target);
                if (hunter && victim) lines.push(`\n🏹 Hunter ${hunter.number}) @${hunter.id.replace("@s.whatsapp.net","")} mati dan menarik ${victim.number}) @${victim.id.replace("@s.whatsapp.net","")} ikut mati!`);
            } else if (ev.type === "lover_suicide") {
                let died = x.player.find(pl => pl.number === ev.died);
                let other = x.player.find(pl => pl.number === ev.other);
                if (died && other) lines.push(`\n💘 Karena ${died.number}) @${died.id.replace("@s.whatsapp.net","")} mati, pasangannya ${other.number}) @${other.id.replace("@s.whatsapp.net","")} ikut mati karena patah hati.`);
            } else if (ev.type === "sheriff_kill") {
                let sheriff = x.player.find(pl => pl.number === ev.sheriff);
                let target = x.player.find(pl => pl.number === ev.target);
                if (ev.protected) {
                    if (sheriff) lines.push(`\n🔫 Sheriff ${sheriff.number}) @${sheriff.id.replace("@s.whatsapp.net","")} menembak ${target.number}) @${target.id.replace("@s.whatsapp.net","")} namun target terlindungi Guardian.`);
                } else {
                    if (sheriff && target) lines.push(`\n🔫 Sheriff ${sheriff.number}) @${sheriff.id.replace("@s.whatsapp.net","")} menembak ${target.number}) @${target.id.replace("@s.whatsapp.net","")} dan berhasil membunuhnya (${target.role}).`);
                }
            } else if (ev.type === "sheriff_miss") {
                let sheriff = x.player.find(pl => pl.number === ev.sheriff);
                if (sheriff) lines.push(`\n🔫 Sheriff ${sheriff.number}) @${sheriff.id.replace("@s.whatsapp.net","")} salah tembak dan mati!`);
            } else if (ev.type === "witch_heal") {
                let t = x.player.find(pl => pl.number === ev.target);
                if (t) lines.push(`\n🧙‍♀️ Witch menyelamatkan ${t.number}) @${t.id.replace("@s.whatsapp.net","")}.`);
            } else if (ev.type === "witch_poison") {
                let t = x.player.find(pl => pl.number === ev.target);
                if (t) lines.push(`\n🧙‍♀️ Witch meracuni ${t.number}) @${t.id.replace("@s.whatsapp.net","")}.`);
            } else if (ev.type === "execution") {
                // execution will be included as death_applied later — but we can note that an execution happened
                let t = x.player.find(pl => pl.number === ev.number);
                if (t) lines.push(`\n⚖️ Warga mengeksekusi ${t.number}) @${t.id.replace("@s.whatsapp.net","")} (${t.role}).`);
            } else if (ev.type === "thief_swap") {
                // thief swap recorded as {type:"thief_swap", thief: n, target: m}
                let thief = x.player.find(pl => pl.number === ev.thief);
                let target = x.player.find(pl => pl.number === ev.target);
                if (thief && target) lines.push(`\n🗝️ Thief ${thief.number}) @${thief.id.replace("@s.whatsapp.net","")} menukar peran dengan ${target.number}) @${target.id.replace("@s.whatsapp.net","")}.`);
            } else if (ev.type === "cupid_chosen") {
                let a = x.player.find(pl => pl.number === ev.a);
                let b = x.player.find(pl => pl.number === ev.b);
                if (a && b) lines.push(`\n💘 Cupid mempersatukan ${a.number}) @${a.id.replace("@s.whatsapp.net","")} dan ${b.number}) @${b.id.replace("@s.whatsapp.net","")} sebagai lovers.`);
            }
        }
    }

    // footer & rules
    lines.push(`\n\n90 detik untuk diskusi — Hari ke ${x.day}`);
    lines.push(`\n\n*RULES*\n- Dilarang cepu\n- Dilarang screenshot bukti`);

    await conn.groupSettingUpdate(x.room, 'not_announcement');
    await conn.sendMessage(x.room, {
        text: lines.join(""),
        contextInfo: { mentionedJid: x.player.map(p => p.id) }
    });

    // cleanup: clear events and dead (we already applied deaths in killww)
    x.events = [];
    x.dead = [];
}

// voting (unchanged)
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
    // at night we can also show a small mysterious narration based on events that will occur
    // but we should NOT reveal targets. We'll give short flavor text.
    let room = x;
    room.events = room.events || [];
    let flavor = [];
    // if thief swap used or available
    if (room.thiefSwap && room.thiefSwap.used) flavor.push("🗝️ Ada bisik-bisik bahwa seseorang menukar identitasnya malam ini...");
    // if witch might act
    if (room.witch && (!room.witch.healUsed || !room.witch.poisonUsed)) {
        // don't reveal if used or not, but give hint she may act
        flavor.push("🧙‍♀️ Ada ramuan yang siap digunakan malam ini...");
    }
    // if cupid hasn't chosen but is available, nothing to show; if chosen, add neutral line
    if (room.lovers && room.lovers.length === 2) flavor.push("💘 Ada dua hati yang terikat malam ini...");
    // werewolf action flavor
    flavor.push("🐺 Ada lolongan samar di kegelapan...");

    let hasil_vote = voteResult(x.room, data);
    if (hasil_vote === 0) {
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nTidak ada yang dieksekusi hari ini. Pemain malam hari: kalian punya 90 detik untuk beraksi!\n\n${flavor.join("\n")}\n\n`;
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
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nHasil voting seri.\n\nPemain malam hari: kalian punya 90 detik untuk beraksi!\n\n${flavor.join("\n")}\n\n`;
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
        // If voted player is joker -> immediate joker win (announce then end)
        // We need to run voteKill logic to add events and then announce via pagi() style OR special message
        // Here we should use voteKill to push execution event and dead; then build combined message
        // But voteKill previously only mutates room.events and room.dead; we'll call it then craft message
        // Joker special handling:
        // If the person voted is joker, we will immediately announce joker win (so not proceed normal night)
        room.events = room.events || [];
        // get top voted
        let top = voteKill(x.room, data); // returns the voted player object (as in previous code)
        if (top && top.role === 'joker') {
            // announce and call winJoker
            textnya = `*⌂ W E R E W O L F - G A M E*\n\nWarga desa telah memilih dan mengeksekusi @${top.id.replace("@s.whatsapp.net","")}.\n\n🃏 *JOKER TERUNGKAP!* 🎉\nJoker berhasil ditangkap warga dan *MENANG SENDIRI*!`;
            await conn.sendMessage(x.room, { text: textnya, contextInfo: { mentionedJid: [top.id] } });
            return await winJoker(x, top, conn, data);
        }

        // Normal flow: announce who got executed + other events
        // voteKill already added an execution event and room.dead; call killww in morning will apply
        // Here we will include the immediate knowledge: reveal role of executed and then let night continue
        // Build immediate vote announcement (this mimics previous behavior)
        let executed = hasil_vote;
        textnya = `*⌂ W E R E W O L F - G A M E*\n\nWarga desa telah memilih dan sepakat @${executed.id.replace("@s.whatsapp.net","")} dieksekusi.\n\n@${executed.id.replace("@s.whatsapp.net","")} adalah ${executed.role} ${emoji_role(executed.role)}\n\nPemain malam hari: kalian punya 90 detik untuk beraksi!\n\n`;
        textnya += await roleLeft(x.room, data);

        // Make sure we added the execution into events and dead via voteKill call above
        // Actually we didn't call voteKill here because voteKill was called earlier in original code.
        // But to be safe, ensure execution event exists:
        room.events = room.events || [];
        room.events.push({ type: "execution_reveal", number: executed.number }); // for pagi announce if needed

        // mark blacklist safely
        ensureBlacklist(x.room);
        global.db.data.chats[x.room].blacklistUsers[executed.id] = true;

        await conn.groupSettingUpdate(x.room, 'announcement');
        return conn.sendMessage(x.room, {
            text: textnya,
            contextInfo: {
                mentionedJid: [executed.id]
            },
        }).then(() => {
            changeDay(x.room, data);
            voteDone(x.room, data);
            resetVote(x.room, data);
            clearAllVote(x.room, data);
            if (getWinner(x.room, data).status != null) return win(x, 1, conn, data);
        });
    }
}

// skill dispatch (unchanged except we ensure events for some actions)
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

// Witch helper functions to be called from game-wwpc.js (we record events)
function witchHeal(room, targetNum) {
    room = room || {};
    room.witch = room.witch || {};
    room.events = room.events || [];
    // mark that witch healed this target; remove from dead if exists
    let idxDead = room.dead ? room.dead.indexOf(parseInt(targetNum)) : -1;
    if (idxDead !== -1) {
        room.dead.splice(idxDead, 1);
    }
    room.witch.healUsed = true;
    room.witch.lastAction = { type: "heal", target: parseInt(targetNum) };
    room.events.push({ type: "witch_heal", target: parseInt(targetNum) });
    return true;
}

function witchPoison(room, targetNum) {
    room = room || {};
    room.witch = room.witch || {};
    room.events = room.events || [];
    room.witch.poisonUsed = true;
    room.witch.lastAction = { type: "poison", target: parseInt(targetNum) };
    room.dead = room.dead || [];
    room.dead.push(parseInt(targetNum));
    room.events.push({ type: "witch_poison", target: parseInt(targetNum) });
    return true;
}

// thief swap action recorded (call from game-wwpc when thief swaps)
function thiefSwapAction(room, thiefNum, targetNum) {
    room = room || {};
    room.events = room.events || [];
    room.thiefSwap = room.thiefSwap || { used: false };
    room.thiefSwap.used = true;
    room.events.push({ type: "thief_swap", thief: thiefNum, target: targetNum });
    // actual role swap should be done by game-wwpc using roleChanger directly on players array
}

// sheriffKill earlier defined already pushes events; keep it as exported function.

// Win Joker modified to keep same functionality but uses group's DB safely
async function winJoker(x, jokerPlayer, conn, data) {
    const sesinya = x.room;
    // reward sample (keep previous behavior)
    let jid = jokerPlayer.id;
    let users = global.db.data.users[jid] || (global.db.data.users[jid] = {});
    let moneyEarned = Math.floor(Math.random() * (590000000 - 600000000 + 1) + 600000000);
    let expEarned = Math.floor(Math.random() * (500000 - 490000 + 1) + 500000);
    let limitEarned = Math.floor(Math.random() * (4000 - 3000 + 1) + 4000);
    users.money = (users.money || 0) + moneyEarned;
    users.exp = (users.exp || 0) + expEarned;
    users.limit = (users.limit || 0) + limitEarned;

    textnya = `*J O K E R - W I N*\n\n🃏 *JOKER MENANG SENDIRI* 🃏\n\nSelamat kepada @${jid.replace("@s.whatsapp.net","")} (Joker) yang berhasil membuat warga mengeksekusinya!\nJoker mendapatkan\n- Money: ${moneyEarned}\n- Exp: ${expEarned}\n- Limit: ${limitEarned}\n\nGame berakhir.`;
    await conn.groupSettingUpdate(sesinya, 'not_announcement');
    await conn.sendMessage(sesinya, { text: textnya, contextInfo: { mentionedJid: [jid] } });
    delete data[sesinya];
    return;
}

// win() unchanged logic except safety check for blacklist
async function win(x, t, conn, data) {
    const sesinya = x.room;
    const winnerData = getWinner(x.room, data);

    if (winnerData.status === false || x.iswin === false) {
        // WEREWOLF WIN
        textnya = `*W E R E W O L F - W I N*\n\n🏆 *TEAM WEREWOLF* 🏆\n\n`;
        let ment = [];
        for (let i = 0; i < x.player.length; i++) {
            // ensure blacklist exists
            ensureBlacklist(sesinya);
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
        return await conn.sendMessage(sesinya, { text: textnya, contextInfo: { mentionedJid: ment } })
            .then(() => { delete data[x.room]; });
    } else if (winnerData.status === true) {
        // WARGA WIN
        textnya = `*T E A M - W A R G A - W I N*\n\n🏆 *TEAM WARGA* 🏆\n\n`;
        let ment = [];
        for (let i = 0; i < x.player.length; i++) {
            ensureBlacklist(sesinya);
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
    roleShuffle,
    // new helpers
    witchHeal,
    witchPoison,
    thiefSwapAction
};
