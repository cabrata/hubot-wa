const fs = require('fs')
const path = require('path')
const { db } = require('./database')
const { GoogleGenAI } = require('@google/genai')

// ==========================================
// 🧠 MEMORY CACHE
// ==========================================
let staffCache = {};
let ownerCache = {};

(async () => {
    try {
        const staffList = await db.staffActivity.findMany().catch(() => []);
        for (let s of staffList) {
            staffCache[s.jid] = {
                name: s.name,
                role: s.role,
                management: s.management || '-',
                age: s.age || '-',
                botNumber: s.botNumber || '-',
                addedAt: Number(s.addedAt || 0) || Date.now(),
                // 🔥 TAMBAHAN CACHE BARU
                busyReason: s.busyReason || '-',
                busyTime: s.busyTime || '-',
                dispensasi: {
                    cmd: s.targetCmds !== undefined ? s.targetCmds : 50,
                    mod: s.targetModCmds !== undefined ? s.targetModCmds : 20
                },
                activity: {
                    dailyCmds: s.dailyCmds || 0,
                    modCmds: s.modCmds || 0,
                    inactiveDays: s.inactiveDays || 0,
                    lastResetDay: s.lastResetDay || new Date().toISOString().split('T')[0]
                }
            };
        }

        const ownerList = await db.botOwnership.findMany().catch(() => []);
        for (let o of ownerList) {
            ownerCache[o.id] = {
                owner: o.owner,
                staff: typeof o.staff === 'string' ? JSON.parse(o.staff) : (o.staff || []),
                bots: typeof o.bots === 'string' ? JSON.parse(o.bots) : (o.bots || []),
                names: typeof o.names === 'string' ? JSON.parse(o.names) : (o.names || {})
            };
        }
        console.log('[SYSTEM] 🟢 Berhasil memuat data Staff & Management dari SQL ke Memory.');
    } catch (e) {
        console.error('[SYSTEM ERROR] 🔴 Gagal memuat database Staff/Owner:', e);
    }
})();

const getStaff = () => staffCache;
const getOwnerDB = () => ownerCache;

// ==========================================
// 2. FUNGSI SETTER (Update RAM + SQL)
// ==========================================
const saveStaff = async (data) => {
    staffCache = data; 
    for (let jid in data) {
        let s = data[jid];
        await db.staffActivity.upsert({
            where: { jid },
            create: { 
                jid, name: s.name, role: s.role, management: s.management, 
                age: String(s.age), botNumber: s.botNumber, addedAt: BigInt(s.addedAt || Date.now()),
                dailyCmds: s.activity.dailyCmds, modCmds: s.activity.modCmds, 
                inactiveDays: s.activity.inactiveDays, lastResetDay: s.activity.lastResetDay,
                // 🔥 TAMBAHAN CREATE BARU
                busyReason: s.busyReason, busyTime: s.busyTime,
                targetCmds: s.dispensasi.cmd, targetModCmds: s.dispensasi.mod
            },
            update: { 
                name: s.name, role: s.role, management: s.management, 
                age: String(s.age), botNumber: s.botNumber, addedAt: BigInt(s.addedAt || Date.now()),
                dailyCmds: s.activity.dailyCmds, modCmds: s.activity.modCmds, 
                inactiveDays: s.activity.inactiveDays, lastResetDay: s.activity.lastResetDay,
                // 🔥 TAMBAHAN UPDATE BARU
                busyReason: s.busyReason, busyTime: s.busyTime,
                targetCmds: s.dispensasi.cmd, targetModCmds: s.dispensasi.mod
            }
        }).catch(()=>{});
    }
    
    let currentJids = Object.keys(data);
    await db.staffActivity.deleteMany({
        where: { jid: { notIn: currentJids } }
    }).catch(()=>{});
}

const saveOwnerDB = async (data) => {
    // ... [Isinya sama kaya file lo sebelumnya, kaga ada yg berubah]
    ownerCache = data;
    for (let id in data) {
        let o = data[id];
        await db.botOwnership.upsert({
            where: { id },
            create: { id, owner: o.owner, staff: JSON.stringify(o.staff), bots: JSON.stringify(o.bots), names: JSON.stringify(o.names) },
            update: { owner: o.owner, staff: JSON.stringify(o.staff), bots: JSON.stringify(o.bots), names: JSON.stringify(o.names) }
        }).catch(()=>{});
    }
    
    let currentIds = Object.keys(data);
    await db.botOwnership.deleteMany({
        where: { id: { notIn: currentIds } }
    }).catch(()=>{});
}

// ==========================================
// 3. FUNGSI AI: SURAT PEMBERHENTIAN GRUP
// ==========================================
async function generateGroupDemotion(namesArray) {
    let names = namesArray.join(', ')
    try {
        const ai = new GoogleGenAI({ apiKey: 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo' }) 
        const prompt = `Kamu adalah HRD kejam dari HuTao Bot. Buatkan 1 paragraf pesan pengumuman publik yang tegas dan sarkas untuk memecat staff berikut: ${names}. Alasan: pasif dan makan gaji buta selama 7 hari berturut-turut. Langsung to the point, tanpa salam.`
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
        return response.text
    } catch (e) {
        return `☠️ Selamat tinggal untuk: ${names}. Kalian resmi dipecat oleh sistem karena tidak memenuhi target selama 7 hari.`
    }
}

// ==========================================
// 4. FUNGSI EXECUTOR: CEK ABSEN HARIAN
// ==========================================
async function checkDailyActivity(conn) {
    let staffData = getStaff()
    let today = new Date().toISOString().split('T')[0]
    let isModified = false

    const groupId = '120363368633822650@g.us'
    
    let sp1List = []
    let sp2List = []
    let firedList = []
    let firedNames = [] 

    for (let jid in staffData) {
        let staff = staffData[jid]
        
        // 1. CEK STATUS CUTI (EXPIRED APA BELUM)
        if (staff.busyTime !== '-') {
            let todayDate = new Date(today);
            let busyDate = new Date(staff.busyTime);
            
            if (todayDate > busyDate) {
                // Udah lewat tanggalnya, reset otomatis
                staff.busyReason = '-';
                staff.busyTime = '-';
                staff.dispensasi = { cmd: 50, mod: 20 };
                
                // Infoin ke staff nya via DM
                if (conn) {
                    conn.sendMessage(jid, { text: `🔔 *MASA CUTI HABIS*\n\nHalo ${staff.name}, masa dispensasi/cuti kamu telah habis hari ini. Silakan kembali penuhi target harian normal kamu (50 Cmd / 20 Mod Cmd).` }).catch(()=>{})
                }
                isModified = true;
            }
        }

        let isCutiAktif = staff.busyTime !== '-';
        let role = (staff.role || '').toLowerCase()
        let isPetinggi = role.includes('super') || role.includes('hrd')
        let isGlobalOwner = global.owner && global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(jid)

        if (isPetinggi || isGlobalOwner) {
            staff.activity.dailyCmds = 999999999
            staff.activity.modCmds = 999999999
            staff.activity.inactiveDays = 0
        }

        if (staff.activity.lastResetDay !== today) {
            let cmds = staff.activity.dailyCmds
            let modCmds = staff.activity.modCmds
            
            // 2. CEK KELULUSAN PAKAI DISPENSASI
            let passed = (cmds >= staff.dispensasi.cmd || modCmds >= staff.dispensasi.mod)
            
            if (!passed && !isPetinggi && !isGlobalOwner && !isCutiAktif) {
                // Kalo kaga lulus DAN lagi kaga cuti
                staff.activity.inactiveDays += 1
                
                if (staff.activity.inactiveDays === 3) sp1List.push(jid)
                else if (staff.activity.inactiveDays === 6) sp2List.push(jid)
                else if (staff.activity.inactiveDays >= 7) {
                    firedList.push(jid)
                    firedNames.push(staff.name) 
                }
            } else {
                // Kalau rajin (atau lagi cuti), kurangi dosa inaktifnya
                if (staff.activity.inactiveDays > 0) staff.activity.inactiveDays -= 1
            }

            if (staff.activity.inactiveDays >= 7) {
                await db.user.update({ where: { jid: jid }, data: { moderator: false, timSupport: false } }).catch(()=>{})
                delete staffData[jid]
            } else {
                staff.activity.dailyCmds = 0
                staff.activity.modCmds = 0
                staff.activity.lastResetDay = today
            }
            isModified = true
        }
    }
    
    // ... [PENGUMUMAN GRUP & KICK MASSAL SAMA KAYAK KEMAREN]
    // ... (taruh lagi kode if (conn && (sp1List.length > 0 ... )) lo disini)

    if (isModified) saveStaff(staffData)
}

module.exports = { getStaff, saveStaff, getOwnerDB, saveOwnerDB, checkDailyActivity }
