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
// 3. FUNGSI AI: SURAT PEMBERHENTIAN
// ==========================================
async function generateDemotionLetter(name, role, reason) {
    try {
        const ai = new GoogleGenAI({ apiKey: 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo' }) 
        const prompt = `Kamu adalah sistem HRD dari HuTao Bot. Buatkan 1 paragraf pesan singkat, profesional, tapi tegas untuk memberhentikan staff bernama ${name} dari jabatan ${role}. Alasan: ${reason}. Jangan pakai salam pembuka/penutup yang kaku, langsung *to the point*.`
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
        return response.text
    } catch (e) {
        return `⚠️ Mohon maaf ${name}, karena ${reason}, akses ${role} kamu telah dicabut secara otomatis oleh sistem.`
    }
}

// ==========================================
// 4. FUNGSI EXECUTOR: CEK ABSEN HARIAN
// ==========================================
async function checkDailyActivity(conn) {
    let staffData = getStaff()
    let today = new Date().toISOString().split('T')[0]
    let isModified = false

    for (let jid in staffData) {
        let staff = staffData[jid]
        
        // 🛡️ DOUBLE PROTECTION: Dewa Shield (Cek ulang di mesin eksekutor)
        let role = (staff.role || '').toLowerCase()
        let isPetinggi = role.includes('super') || role.includes('hrd')
        let isGlobalOwner = global.owner && global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(jid)

        if (isPetinggi || isGlobalOwner) {
            staff.activity.dailyCmds = 999999999
            staff.activity.modCmds = 999999999
            staff.activity.inactiveDays = 0
        }

        // 🔄 EKSEKUSI RESET HARIAN & KICK
        if (staff.activity.lastResetDay !== today) {
            let cmds = staff.activity.dailyCmds
            let modCmds = staff.activity.modCmds
            
            // LOGIKA LULUS ABSEN: Minimal 50 cmd biasa ATAU 20 cmd khusus mod
            let passed = (cmds >= 50 || modCmds >= 20)
            
            // Kalau dia kuli biasa dan gak lulus target
            if (!passed && !isPetinggi && !isGlobalOwner) {
                staff.activity.inactiveDays += 1
                if (conn) {
                    conn.sendMessage(jid, { text: `⚠️ *PERINGATAN ABSENSI*\n\nHari ini kamu hanya menggunakan ${cmds} command dan ${modCmds} mod command. Target harian: 50 Cmd atau 20 Mod Cmd.\n\n_Peringkat Inaktif: ${staff.activity.inactiveDays}/7 Hari._` }).catch(()=>{})
                }
            } else {
                // Kalau aktif, kurangi dosa inaktifnya
                if (staff.activity.inactiveDays > 0) staff.activity.inactiveDays -= 1
            }

            // 🚨 AUTO DEMOTE: Kalau 7 hari berturut-turut nggak capai target
            if (staff.activity.inactiveDays >= 7) {
                let aiMessage = await generateDemotionLetter(staff.name, staff.role, 'tidak memenuhi target aktivitas selama 7 hari')
                if (conn) {
                    await conn.sendMessage(jid, { text: `🚨 *PEMBERHENTIAN OTOMATIS* 🚨\n\n${aiMessage}` }).catch(()=>{})
                }
                
                // Hapus akses dari SQL
                await db.user.update({ where: { jid: jid }, data: { moderator: false, timSupport: false } }).catch(()=>{})
                
                // Hapus dari Cache memory
                delete staffData[jid]
            } else {
                // Reset counter buat besok
                staff.activity.dailyCmds = 0
                staff.activity.modCmds = 0
                staff.activity.lastResetDay = today
            }
            isModified = true
        }
    }
    
    // Save ke SQL (background sync)
    if (isModified) saveStaff(staffData)
}

module.exports = { getStaff, saveStaff, getOwnerDB, saveOwnerDB, checkDailyActivity }
