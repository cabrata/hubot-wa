const fs = require('fs')
const path = require('path')
const { db } = require('./database')
const { GoogleGenAI } = require('@google/genai')

const getStaff = async () => {
    const list = await db.staffActivity.findMany();
    let res = {};
    for (let s of list) {
        res[s.jid] = {
            name: s.name,
            role: s.role,
            activity: {
                dailyCmds: s.dailyCmds,
                modCmds: s.modCmds,
                inactiveDays: s.inactiveDays,
                lastResetDay: s.lastResetDay
            }
        };
    }
    return res;
}

const saveStaff = async (data) => {
    for (let jid in data) {
        let s = data[jid];
        await db.staffActivity.upsert({
            where: { jid },
            create: { jid, name: s.name, role: s.role, dailyCmds: s.activity.dailyCmds, modCmds: s.activity.modCmds, inactiveDays: s.activity.inactiveDays, lastResetDay: s.activity.lastResetDay },
            update: { name: s.name, role: s.role, dailyCmds: s.activity.dailyCmds, modCmds: s.activity.modCmds, inactiveDays: s.activity.inactiveDays, lastResetDay: s.activity.lastResetDay }
        });
    }
}

const getOwnerDB = async () => {
    let conf = await db.botOwnership.findUnique({ where: { id: "Official" } });
    if (!conf) return { Official: { owner: "", staff: [], bots: [], names: {} } };
    return {
        Official: {
            owner: conf.owner,
            staff: typeof conf.staff === 'string' ? JSON.parse(conf.staff) : conf.staff,
            bots: typeof conf.bots === 'string' ? JSON.parse(conf.bots) : conf.bots,
            names: typeof conf.names === 'string' ? JSON.parse(conf.names) : conf.names
        }
    };
}

const saveOwnerDB = async (data) => {
    if (data.Official) {
        let off = data.Official;
        await db.botOwnership.upsert({
            where: { id: "Official" },
            create: { id: "Official", owner: off.owner, staff: off.staff, bots: off.bots, names: off.names },
            update: { owner: off.owner, staff: off.staff, bots: off.bots, names: off.names }
        });
    }
}

// 🤖 FUNGSI AI: Buat surat peringatan pemecatan
async function generateDemotionLetter(name, role, reason) {
    try {
        const ai = new GoogleGenAI({ apiKey: 'AIzaSyARBHX28ScN0SPPm5m8bLpaSbUw2RCg5yo' }) // Pakai key ke-1 kamu
        const prompt = `Kamu adalah sistem HRD dari HuTao Bot. Buatkan 1 paragraf pesan singkat, profesional, tapi tegas untuk memberhentikan staff bernama ${name} dari jabatan ${role}. Alasan: ${reason}. Jangan pakai salam pembuka/penutup yang kaku, langsung *to the point*.`
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
        return response.text
    } catch (e) {
        return `⚠️ Mohon maaf ${name}, karena ${reason}, akses ${role} kamu telah dicabut secara otomatis oleh sistem.`
    }
}

// 🕒 FUNGSI CEK ABSEN HARIAN (Jalankan ini tiap hari jam 00:00)
async function checkDailyActivity(conn) {
    let staffData = await getStaff()
    let today = new Date().toISOString().split('T')[0]
    let isModified = false

    for (let jid in staffData) {
        let staff = staffData[jid]
        
        // Reset harian
        if (staff.activity.lastResetDay !== today) {
            let cmds = staff.activity.dailyCmds
            let modCmds = staff.activity.modCmds
            
            // LOGIKA LULUS ABSEN: Minimal 50 cmd biasa ATAU 10 cmd khusus mod
            let passed = (cmds >= 100 || modCmds >= 20)
            
            if (!passed) {
                staff.activity.inactiveDays += 1
                conn.sendMessage(jid, { text: `⚠️ *PERINGATAN ABSENSI*\n\nHari ini kamu hanya menggunakan ${cmds} command dan ${modCmds} mod command. Target harian: 50 Cmd / 10 Mod Cmd.\n\n_Peringkat Inaktif: ${staff.activity.inactiveDays}/7 Hari._` })
            } else {
                // Kalau aktif, kurangi dosa inaktifnya
                if (staff.activity.inactiveDays > 0) staff.activity.inactiveDays -= 1
            }

            // AUTO DEMOTE: Kalau 7 hari berturut-turut nggak capai target
            if (staff.activity.inactiveDays >= 7) {
                let aiMessage = await generateDemotionLetter(staff.name, staff.role, 'tidak memenuhi target aktivitas selama 7 hari')
                await conn.sendMessage(jid, { text: `🚨 *PEMBERHENTIAN OTOMATIS* 🚨\n\n${aiMessage}` })
                
                // Hapus akses dari SQL
                await db.user.update({ where: { jid: jid }, data: { moderator: false, timSupport: false } })
                
                await db.staffActivity.delete({ where: { jid: jid } }).catch(()=>{})
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
    if (isModified) await saveStaff(staffData)
}

module.exports = { getStaff, saveStaff, getOwnerDB, saveOwnerDB, checkDailyActivity }
