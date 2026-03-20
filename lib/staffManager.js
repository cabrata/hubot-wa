const fs = require('fs')
const path = require('path')
const { db } = require('./database')
const { GoogleGenAI } = require('@google/genai')

// ==========================================
// 🧠 MEMORY CACHE (Biar getStaff tetep sinkronus & cepet!)
// ==========================================
let staffCache = {};
let ownerCache = {};

// Inisialisasi: Tarik data dari SQL ke Memory saat bot nyala
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

// ==========================================
// 1. FUNGSI GETTER (Synchronous - Langsung baca dari RAM)
// ==========================================
const getStaff = () => staffCache;
const getOwnerDB = () => ownerCache;

// ==========================================
// 2. FUNGSI SETTER (Update RAM + Background Save ke SQL)
// ==========================================
const saveStaff = async (data) => {
    staffCache = data; // Update memory langsung
    for (let jid in data) {
        let s = data[jid];
        await db.staffActivity.upsert({
            where: { jid },
            create: { 
                jid, name: s.name, role: s.role, management: s.management, 
                age: String(s.age), botNumber: s.botNumber, addedAt: BigInt(s.addedAt || Date.now()),
                dailyCmds: s.activity.dailyCmds, modCmds: s.activity.modCmds, 
                inactiveDays: s.activity.inactiveDays, lastResetDay: s.activity.lastResetDay 
            },
            update: { 
                name: s.name, role: s.role, management: s.management, 
                age: String(s.age), botNumber: s.botNumber, addedAt: BigInt(s.addedAt || Date.now()),
                dailyCmds: s.activity.dailyCmds, modCmds: s.activity.modCmds, 
                inactiveDays: s.activity.inactiveDays, lastResetDay: s.activity.lastResetDay 
            }
        }).catch(()=>{});
    }
    
    // Auto-delete di SQL kalau ada staff yang dipecat dari JSON/Cache
    let currentJids = Object.keys(data);
    await db.staffActivity.deleteMany({
        where: { jid: { notIn: currentJids } }
    }).catch(()=>{});
}

const saveOwnerDB = async (data) => {
    ownerCache = data; // Update memory langsung
    for (let id in data) {
        let o = data[id];
        await db.botOwnership.upsert({
            where: { id },
            create: { 
                id, owner: o.owner, 
                staff: JSON.stringify(o.staff), 
                bots: JSON.stringify(o.bots), 
                names: JSON.stringify(o.names) 
            },
            update: { 
                owner: o.owner, 
                staff: JSON.stringify(o.staff), 
                bots: JSON.stringify(o.bots), 
                names: JSON.stringify(o.names) 
            }
        }).catch(()=>{});
    }
    
    let currentIds = Object.keys(data);
    await db.botOwnership.deleteMany({
        where: { id: { notIn: currentIds } }
    }).catch(()=>{});
}

// ==========================================
// 3. FUNGSI AI: SURAT PEMBERHENTIAN (BORONGAN GRUP)
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

    const groupId = '120363368633822650@g.us' // ID Grup Staff lu
    
    // Wadah penampungan buat public shaming
    let sp1List = []
    let sp2List = []
    let firedList = []
    let firedNames = [] // Khusus buat dikirim ke AI

    for (let jid in staffData) {
        let staff = staffData[jid]
        
        let role = (staff.role || '').toLowerCase()
        let isPetinggi = role.includes('super') || role.includes('hrd')
        let isGlobalOwner = global.owner && global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(jid)

        if (isPetinggi || isGlobalOwner) {
            staff.activity.dailyCmds = 9999
            staff.activity.modCmds = 9999
            staff.activity.inactiveDays = 0
        }

        if (staff.activity.lastResetDay !== today) {
            let cmds = staff.activity.dailyCmds
            let modCmds = staff.activity.modCmds
            
            let passed = (cmds >= 50 || modCmds >= 20)
            
            if (!passed && !isPetinggi && !isGlobalOwner) {
                staff.activity.inactiveDays += 1
                
                // Masukin ke daftar antrean sesuai dosa mereka
                if (staff.activity.inactiveDays === 3) sp1List.push(jid)
                else if (staff.activity.inactiveDays === 6) sp2List.push(jid)
                else if (staff.activity.inactiveDays >= 7) {
                    firedList.push(jid)
                    firedNames.push(staff.name) // Simpen namanya buat di-roasting AI
                }
            } else {
                if (staff.activity.inactiveDays > 0) staff.activity.inactiveDays -= 1
            }

            if (staff.activity.inactiveDays >= 7) {
                // Cabut akses dari SQL & memory
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
    
    // ==========================================
    // 📢 EKSEKUSI PENGUMUMAN GRUP & KICK MASSAL
    // ==========================================
    if (conn && (sp1List.length > 0 || sp2List.length > 0 || firedList.length > 0)) {
        let teksBroadcast = `📢 *LAPORAN HARIAN HRD* 📢\n\n`
        let allMentions = []

        if (sp1List.length > 0) {
            teksBroadcast += `⚠️ *SP 1 (Bolos 3 Hari)*\nTarget harian kaga nyampe, ayo aktif lagi bang!\n`
            sp1List.forEach(jid => { 
                teksBroadcast += `• @${jid.split('@')[0]}\n`
                allMentions.push(jid) 
            })
            teksBroadcast += `\n`
        }

        if (sp2List.length > 0) {
            teksBroadcast += `🚨 *SP 2 (Bolos 6 Hari - PERINGATAN TERAKHIR)*\nBesok masih AFK = Auto Kick!\n`
            sp2List.forEach(jid => { 
                teksBroadcast += `• @${jid.split('@')[0]}\n`
                allMentions.push(jid) 
            })
            teksBroadcast += `\n`
        }

        if (firedList.length > 0) {
            let aiRoast = await generateGroupDemotion(firedNames)
            teksBroadcast += `☠️ *EKSEKUSI PEMECATAN* ☠️\n${aiRoast}\n\n`
            firedList.forEach(jid => { 
                teksBroadcast += `• @${jid.split('@')[0]} (Sayonara 👋)\n`
                allMentions.push(jid) 
            })
        }

        // 1. Kirim pesan 1x ke grup Staff dengan nge-tag semua tersangka
        await conn.sendMessage(groupId, { text: teksBroadcast.trim(), mentions: allMentions }).catch(()=>{})

        // 2. Eksekusi Kick buat yang dipecat (Delay 5 detik per orang)
        if (firedList.length > 0) {
            for (let jidToKick of firedList) {
                // Jeda 5 detik biar WhatsApp kaga ngira bot lu kesurupan
                await new Promise(resolve => setTimeout(resolve, 5000)) 
                await conn.groupParticipantsUpdate(groupId, [jidToKick], 'remove').catch(()=>{})
            }
        }
    }

    if (isModified) saveStaff(staffData)
}

module.exports = { getStaff, saveStaff, getOwnerDB, saveOwnerDB, checkDailyActivity }
