const util = require('util')
const fs = require('fs')
const chalk = require('chalk')
const {
    getUser, updateUser, updateEconomy, updateRpg,
    updateCooldown, updateJob, updateChat, getChat,
    updateCommandStats, getInventory, setInventory,
    getTool, setTool, getPet, setPet, updateUserName,
} = require('./lib/database')

const { getStaff, saveStaff, checkDailyActivity } = require('./lib/staffManager')
const { checkAnomaly } = require('./lib/antiAbuse');

const isNumber = (x) => typeof x === 'number' && !isNaN(x)
const delay = (ms) => isNumber(ms) && new Promise((resolve) => setTimeout(resolve, ms))

module.exports = {
    // =============================================
    //  MESSAGE HANDLER
    // =============================================
    async handler(chatUpdate) {
        this.msgqueque = this.msgqueque || []
        if (!chatUpdate) return
        if (chatUpdate.messages.length > 1) console.log(chatUpdate.messages)

        let m = chatUpdate.messages[chatUpdate.messages.length - 1]
        if (!m) return

        // Store message for retry
        const { saveMessage } = require('./lib/store')
        saveMessage(m)

        try {
            m = await global.smsg(this, m) || m
            if (!m) return
            if (!m.sender || !m.sender.includes('@')) return // skip protocol/invalid messages

            m.exp = 0
            m.limit = false

            // ========== LOAD USER & CHAT FROM DB ==========
            try {
                const user = await getUser(m.sender, m.pushName)
                if (user && user.name !== m.pushName && m.pushName) {
                    await updateUserName(m.sender, m.pushName)
                }

            } catch (e) {
                console.error('[HANDLER] DB Error:', e.message)
            }

            // ========== PERMISSION CHECKS ==========
            const isROwner = global.owner
                .map((v) => v?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
                .includes(m.sender)
            const users = await getUser(m.sender)
            const isOwner = isROwner || m.fromMe
            const isMods = isROwner || users.moderator
            const isPrems = isROwner || (users.premium && Date.now() < Number(users.premium))
            const isTS = isROwner || users.timSupport

            // Self mode check
            if (!(isOwner || isMods || m.fromMe) && global.selfMode) return

            // detect self bot and no detect message from any
            if (m.isBaileys && !isROwner) return

            // Busy mode check
            if ((!isTS || !isMods || !isPrems) && (Date.now() < global.botBusyUntil) && global.hasSentBusyMessage[m.chat]) return

            //banned
            m.user = await getUser(m.sender);
            m.chatData = await getChat(m.chat);
            m.moneyPre = Number(m.user?.economy?.money || m.user?.money || 0);

            if ((!isTS || !isMods) && ((m.user && m.user.banned) || (m.chatData && m.chatData.isBanned))) return;
            if (typeof m.text !== 'string') m.text = ''

            // ========== JADIBOT DUPLICATE PREVENTION ==========
            // Prevent duplicate responses if both Main Bot and Jadibot are in the same group.
            if (m.isGroup && global.conn?.user?.lid && this.user?.id) {
                const mainBotJid = this.decodeJid(global.conn.user.lid);
                const thisBotJid = this.decodeJid(this.user.lid);
                
                if (mainBotJid !== thisBotJid) {
                    const groupMeta = m.groupMetadata || {};
                    const participants = groupMeta.participants || [];
                    const isMainBotHere = participants.some(p => {
                        let compareJid = p.id;
                        return compareJid === mainBotJid;
                    });
                    if (isMainBotHere) {
                        return; // Let the main bot handle this message
                    }
                }
            }


            // ========== RUN PLUGIN before() HOOKS ==========
            for (const name in global.plugins) {
                const plugin = global.plugins[name]
                if (!plugin || plugin.disabled) continue
                if (typeof plugin.all === 'function') {
                    try {
                        await plugin.all.call(this, m, chatUpdate)
                    } catch (e) {
                        if (typeof e !== 'string') console.error(e)
                    }
                }
            }

            m.exp += Math.ceil(Math.random() * 10)

            // ========== GROUP METADATA ==========
            // ========== GROUP METADATA (reuse from smsg LID resolution) ==========
            let groupMetadata = m.isGroup ? (m.groupMetadata || await this.groupMeta(m.chat)) : {}
            let participants = m.isGroup ? groupMetadata.participants || [] : []
            let userParticipant = m.isGroup ? participants.find((u) => this.decodeJid(u.phoneNumber) === m.sender) : {}
            let botParticipant = m.isGroup ? participants.find((u) => this.decodeJid(u.id) === this.decodeJid(this.user.id)) : {}
            let isAdmin = userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin' || false
            let isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin' || false
            let senderRaw = m.sender.split('@')[0]
            let isStaff = isROwner || isMods || (global.staff && !!global.staff[senderRaw])

            let usedPrefix

            // ========== COMMAND MATCHING ==========
            for (const name in global.plugins) {
                const plugin = global.plugins[name]
                if (!plugin || plugin.disabled) continue

                const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
                let _prefix = plugin.customPrefix || this.prefix || global.prefix

                let match = (_prefix instanceof RegExp
                    ? [[_prefix.exec(m.text), _prefix]]
                    : Array.isArray(_prefix)
                        ? _prefix.map((p) => {
                            const re = p instanceof RegExp ? p : new RegExp(str2Regex(p))
                            return [re.exec(m.text), re]
                        })
                        : typeof _prefix === 'string'
                            ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
                            : [[[], new RegExp()]]
                ).find((p) => p[1])

                // Run before() hook
                if (typeof plugin.before === 'function') {
                    if (await plugin.before.call(this, m, {
                        match, conn: this, participants, groupMetadata,
                        user: userParticipant, bot: botParticipant,
                        isROwner, isOwner, isAdmin, isBotAdmin, isPrems, isStaff, chatUpdate,
                    })) continue
                }

                // Plugin must have handler function
                if (typeof plugin.handler !== 'function' && typeof plugin !== 'function') continue

                if ((usedPrefix = (match[0] || '')[0])) {
                    let noPrefix = m.text.replace(usedPrefix, '')
                    let [command, ...args] = noPrefix.trim().split(/\s+/).filter((v) => v)
                    args = args || []
                    let _args = noPrefix.trim().split(/\s+/).slice(1)
                    let text = _args.join(' ')
                    command = (command || '').toLowerCase()

                    const fail = plugin.fail || global.dfail

                    // Match command
                    let isAccept = plugin.command instanceof RegExp
                        ? plugin.command.test(command)
                        : Array.isArray(plugin.command)
                            ? plugin.command.some((cmd) =>
                                cmd instanceof RegExp ? cmd.test(command) : cmd === command
                            )
                            : typeof plugin.command === 'string'
                                ? plugin.command === command
                                : false

                    if (!isAccept) continue

                    m.plugin = name

                    // ========== PERMISSION & BAN CHECKS ==========
                    const chatData = m.chatData || {}
                    const userData = m.user || {}

                    // Chat banned
                    if (name !== 'owner/unbanchat.js' && chatData.isBanned && !isROwner) continue
                    // Chat muted (only admin)
                    if (name !== 'group/unmute.js' && chatData.onlyAdmin && !isStaff && !isAdmin && m.isGroup) continue
                    // User banned
                    if (name !== 'owner/unbanuser.js' && userData.banned) continue
                    // Blacklisted in group
                    if (m.isGroup && chatData.blacklistUsers?.[m.sender]) continue

                    // Permission flags
                    if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this); continue }
                    if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue }
                    if (plugin.owner && !isOwner) { fail('owner', m, this); continue }
                    if (plugin.mods && !isMods) { fail('mods', m, this); continue }
                    if (plugin.premium && !isPrems) { fail('premium', m, this); continue }
                    if (plugin.staff && !isStaff) { fail('staff', m, this); continue }
                    if (plugin.group && !m.isGroup) { fail('group', m, this); continue }
                    if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue }
                    if (plugin.admin && !isAdmin) { fail('admin', m, this); continue }
                    if (plugin.private && m.isGroup) { fail('private', m, this); continue }
                    if (plugin.register === true && !userData.registered) { fail('unreg', m, this); continue }

                    // Level check
                    if (plugin.level && plugin.level > (userData.level || 0)) {
                        this.reply(m.chat, `Diperlukan level ${plugin.level} untuk menggunakan perintah ini. Level kamu ${userData.level || 0}`, m.msg)
                        continue
                    }

                    // Limit check
                    if (!isPrems && plugin.limit && (userData.economy?.limit || 0) < plugin.limit) {
                        this.reply(m.chat, `Limit anda habis, silahkan beli melalui *${usedPrefix}buylimit*`, m.msg)
                        continue
                    }

                    m.isCommand = true

                    // XP from plugin
                    let xp = 'exp' in plugin ? parseInt(plugin.exp) : 0
                    if (xp > 200) m.reply('Ngecit -_-')
                    else m.exp += xp

                    // ========== EXECUTE PLUGIN ==========
                    const extra = {
                        match, usedPrefix, noPrefix, _args, args, command, text,
                        conn: this, participants, groupMetadata,
                        user: userParticipant, bot: botParticipant,
                        isROwner, isOwner, isAdmin, isBotAdmin, isPrems, isStaff,
                        chatUpdate,
                        // Database helpers
                        db: require('./lib/database'),
                    }

                    try {
                        if (global.autoTyping) this.sendPresenceUpdate('composing', m.chat)
                        if (global.autoRead) await this.readMessages([m.key])

                        // Support both plugin formats:
                        // 1. module.exports = { handler() {} }
                        // 2. module.exports = function() {}
                        if (typeof plugin.handler === 'function') {
                            await plugin.handler.call(this, { m, ...extra })
                        } else if (typeof plugin === 'function') {
                            await plugin.call(this, m, extra)
                        }

                        if (!isPrems) m.limit = m.limit || plugin.limit || false
                    } catch (e) {
                        m.error = e
                        if (e) {
                            let errStr = util.format(e)

                            // Rate limit — suppress
                            if (errStr.includes('rate-overlimit') || errStr.includes('Connection Closed') || errStr.includes('429')) {
                                return
                            }

                            // Check if real system error
                            let isSystemError = errStr.includes('ReferenceError') ||
                                errStr.includes('TypeError') ||
                                errStr.includes('AxiosError') ||
                                errStr.includes('SyntaxError') ||
                                (e.stack && e.stack.includes('at '))

                            if (typeof e === 'string' || !isSystemError) {
                                let msg = e.message || errStr
                                msg = msg.replace(/^Error:\s*/i, '')
                                return m.reply(String(msg))
                            }

                            // Real error → notify user + log
                            let reportGrup = '120363368633822650@g.us';
                            let reportMsg = `📢 *LAPORAN ERROR SISTEM / API* 📢\n\n` +
                                `👤 *Sender:* @${m.sender.split('@')[0]}\n` +
                                `💬 *Command:* ${m.text}\n` +
                                `🧩 *Plugin:* ${m.plugin || 'Unknown'}\n` +
                                `📍 *Chat:* ${m.isGroup ? m.chat : 'Private Chat'}\n\n` +
                                `📝 *Detail Error:* \n\`\`\`${errStr}\`\`\``;

                            this.sendMessage(reportGrup, {
                                text: reportMsg,
                                mentions: [m.sender]
                            }).catch(err => {
                                console.log('Gagal kirim laporan ke grup staff:', err);
                            });
                        }
                    } finally {
                        // After hook
                        if (typeof plugin.after === 'function') {
                            try { await plugin.after.call(this, m, extra) } catch (e) { console.error(e) }
                        }
                        if (m.limit) m.reply('+' + m.limit + ' Limit terpakai')
                    }
                    break
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            // ========== UPDATE STATS ==========
            try {
                if (m && m.sender && m.user) {
                    // Update user exp & limit
                    const expGain = m.exp || 0
                    const limitUsed = m.limit ? m.limit * 1 : 0
                    if (expGain > 0 || limitUsed > 0) {
                        if (expGain > 0) await updateUser(m.sender, { exp: { increment: expGain } }).catch(() => { })
                        if (limitUsed > 0) await updateEconomy(m.sender, { limit: Math.max(0, (m.user.economy?.limit || 0) - limitUsed) }).catch(() => { })
                    }
                }

                // Command stats & Last Use Tracker
                if (m && m.plugin && m.isCommand) {
                    await updateCommandStats(m.plugin, m.error != null).catch(() => { })
                    if (!m.error) {
                       await updateUser(m.sender, { 
                           lastUseTime: new Date(), 
                           lastUseCommand: (usedPrefix || '') + command 
                       }).catch(() => { })
                    }
                }
            } catch (e) { }

            // Print log
            try {
                if (m && m.isCommand) require('./lib/print')(m, this)
            } catch (e) { }
            // [SNIPPET TRACKER ABSEN STAFF & ANTI ABUSE]
            try {
                if (m && m.plugin && !m.error) { // Hanya catat kalau command berhasil (gak error)
                    // Jalankan pengecekan harian
                    await checkDailyActivity(this);

                    // 👇 PENGECEKAN AI (CCTV / ANTI ABUSE)
                    let userPost = await getUser(m.sender);
                    let moneyPost = Number(userPost?.economy?.money || userPost?.money || 0);
                    let pluginName = m.plugin || 'Fitur_Bot';
                    await checkAnomaly(this, m, m.sender, m.moneyPre, moneyPost, pluginName);
                    // 👆 SELESAI PENGECEKAN AI

                    let staffData = getStaff();
                    if (staffData[m.sender]) {

                        let senderWa = m.sender.split('@')[0];
                        let isOwner = global.owner.map(v => v.replace(/[^0-9]/g, '')).includes(senderWa);

                        // 🔥 CEK PANGKAT DINAMIS (Gak perlu masukin nomor manual lagi!)
                        let roleStaff = staffData[m.sender].role ? staffData[m.sender].role.toLowerCase() : '';
                        let isSupervisor = roleStaff.includes('supervisor') || roleStaff.includes('hrd');

                        if (isOwner || isSupervisor) {
                            // 🛡️ Kalau Supervisor/Owner, otomatis set absen jadi MAX (9999) biar kebal auto-kick
                            staffData[m.sender].activity.dailyCmds = 999999999;
                            staffData[m.sender].activity.modCmds = 9999999999;
                            staffData[m.sender].activity.inactiveDays = 0; // Reset hari bolos
                        } else {
                            // 👷 Tracker normal buat kuli/staff biasa (Trainee, Support, Moderator)
                            staffData[m.sender].activity.dailyCmds += 1;

                            // Cek apakah command yang dipakai adalah command admin/moderator
                            let executedPlugin = global.plugins[m.plugin];
                            let isModCommand = executedPlugin && (executedPlugin.admin || executedPlugin.moderator || executedPlugin.group);

                            if (isModCommand) {
                                staffData[m.sender].activity.modCmds += 1;
                            }
                        }

                        // Simpan pembaruan absen
                        saveStaff(staffData);
                    }
                }
            } catch (e) {
                console.error("[STAFF TRACKER / CCTV ERROR]:", e);
            }

            if (global.autoRead && m) await this.readMessages([m.key]).catch(() => { })
        }
    },

    // =============================================
    //  PRESENCE UPDATE
    // =============================================
    async presenceUpdate(update) {
        if (!update) return
        const id = update.id
        const presences = update.presences
        if (!id || !presences) return

        function clockString(ms) {
            if (isNaN(ms)) return '--'
            let d = Math.floor(ms / 86400000)
            let h = Math.floor((ms % 86400000) / 3600000)
            let m = Math.floor((ms % 3600000) / 60000)
            let s = Math.floor((ms % 60000) / 1000)
            let res = []
            if (d > 0) res.push(`${d} hari`)
            if (h > 0) res.push(`${h} jam`)
            if (m > 0) res.push(`${m} menit`)
            if (s > 0 || res.length === 0) res.push(`${s} detik`)
            return res.join(', ')
        }

        for (const jid in presences) {
            const presence = presences[jid]
            let senderJid = jid

            // If the chat is a group and the typing user is a LID, try to resolve it using group metadata
            if (id.endsWith('@g.us') && jid.includes('@lid')) {
                try {
                    let groupMetadata = await this.groupMeta(id)
                    let participant = groupMetadata.participants?.find((p) => p.id === jid || p.lid === jid)
                    if (participant?.phoneNumber) senderJid = participant.phoneNumber
                    else if (participant?.id && !participant.id.includes('@lid')) senderJid = participant.id
                } catch (e) { }
            }

            // Tracker List Online (Per Group)
            global.onlineList = global.onlineList || {}
            let cGroup = id.endsWith('@g.us') ? id : 'global'
            global.onlineList[cGroup] = global.onlineList[cGroup] || {}
            global.onlineList[cGroup][senderJid] = {
                time: Date.now(),
                action: presence.lastKnownPresence
            }

            if (presence.lastKnownPresence === 'composing' || presence.lastKnownPresence === 'recording') {
                // Get user from DB
                const user = await getUser(senderJid).catch(() => null)
                if (user && user.afk > -1) {
                    let durasi = clockString(Date.now() - Number(user.afk))
                    let reason = presence.lastKnownPresence === 'composing' ? 'mengetik' : 'merekam suara'
                    let text = `\nKamu berhenti AFK karena ${reason}${user.afkReason ? ' (Alasan: ' + user.afkReason + ')' : ''}`

                    // Reply to the group or chat that the user has returned
                    try {
                        await this.sendMessage(id, {
                            text: `@${senderJid.split('@')[0]} berhenti AFK setelah ${durasi}${text}`,
                            mentions: [senderJid]
                        })
                    } catch (e) {
                        console.error('[PRESENCE UPDATE]', e.message)
                    }

                    await updateUser(senderJid, {
                        afk: -1n,
                        afkReason: ''
                    }).catch(() => { })
                }
            }
        }
    },

    // =============================================
    //  CALL REJECTION
    // =============================================
    async rejectOnCall(callsList) {
        for (const call of callsList) {
            try {
                const isOwnerCall = global.owner
                    .map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
                    .includes(call.from)

                if (call.status !== 'offer') continue

                if (isOwnerCall) {
                    await this.rejectCall(call.id, call.from)
                    this.sendMessage(call.from, { text: 'Auto reject call — owner mode 🤖' })
                    continue
                }

                if (!call.isGroup) {
                    const now = Date.now()
                    if (!global.callTracker[call.from]) {
                        global.callTracker[call.from] = { count: 1, lastCall: now }
                    } else {
                        const timeSince = now - global.callTracker[call.from].lastCall
                        if (timeSince <= 2 * 60 * 60 * 1000) {
                            global.callTracker[call.from].count++
                        } else {
                            global.callTracker[call.from].count = 1
                        }
                        global.callTracker[call.from].lastCall = now
                    }

                    await this.rejectCall(call.id, call.from)

                    if (global.callTracker[call.from].count >= 2) {
                        this.sendMessage(call.from, {
                            text: '⛔ Nomor kamu diblokir karena spam panggilan!\nHubungi owner untuk unblock.',
                        })
                        await updateUser(call.from, { banned: true, bannedReason: 'Spam Telpon' }).catch(() => { })
                        await delay(500)
                        await this.updateBlockStatus(call.from, 'block').catch(() => { })
                        delete global.callTracker[call.from]
                    } else {
                        this.sendMessage(call.from, {
                            text: '⚠ Jangan menelepon bot! Jika telepon lagi dalam 2 jam, nomor akan diblokir.',
                        })
                    }
                } else {
                    await this.rejectCall(call.id, call.from)
                }
            } catch (error) {
                console.error('[CALL]', error.message)
            }
        }
    },

    // =============================================
    //  GROUP PARTICIPANT UPDATE
    // =============================================
    async participantsUpdate({ id, participants, action }) {
        console.log({ id, participants, action })
        const chatData = await getChat(id).catch(() => null)
        if (!chatData) return

        let groupMetadata
        try { groupMetadata = await this.groupMeta(id) } catch { return }

        for (let { phoneNumber: participant } of participants) {
            const name = await this.getName(participant)
            let pp = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9mFzSckd12spppS8gAJ2KB2ER-ccZd4pBbw&usqp=CAU'
            try { pp = await this.profilePictureUrl(participant, 'image') } catch { }

            let text = ''
            if ((action === 'add' || action === 'invite' || action === 'invite_v4') && chatData.welcome) {
                text = (chatData.sWelcome || global.welcomeMsg)
                    .replace('@user', '@' + participant.split('@')[0])
                    .replace('@subject', await this.getName(id))
                    .replace('@desc', groupMetadata.desc || '')
            } else if ((action === 'remove' || action === 'leave') && chatData.welcome) {
                text = (chatData.sBye || global.byeMsg)
                    .replace('@user', '@' + participant.split('@')[0])
            } else if (action === 'promote') {
                text = (chatData.sPromote || global.promoteMsg)
                    .replace('@user', '@' + participant.split('@')[0])
            } else if (action === 'demote') {
                text = (chatData.sDemote || global.demoteMsg)
                    .replace('@user', '@' + participant.split('@')[0])
            }

            if (text) {
                let msgData = {
                    text,
                    mentions: this.parseMention(text),
                }

                try {
                    const { createWelcome, createLeave } = require('./lib/welcomecard.js')
                    let participantsCount = groupMetadata.participants.length || 0

                    if ((action === 'add' || action === 'invite' || action === 'invite_v4') && chatData.welcome) {
                        let cardBuf = await createWelcome(name, await this.getName(id), pp, participantsCount, { backgroundUrl: './assets/wp10030253-hu-tao-pc-wallpapers.jpg' })
                        msgData = {
                            image: cardBuf,
                            caption: text,
                            mentions: this.parseMention(text)
                        }
                    } else if ((action === 'remove' || action === 'leave') && chatData.welcome) {
                        let cardBuf = await createLeave(name, await this.getName(id), pp, participantsCount, { backgroundUrl: './assets/wp10030253-hu-tao-pc-wallpapers.jpg' })
                        msgData = {
                            image: cardBuf,
                            caption: text,
                            mentions: this.parseMention(text)
                        }
                    }
                } catch (e) {
                    console.error('[CANVAS] Error creating card:', e)
                }

                this.sendMessage(id, msgData)
            }
        }
    },

    // =============================================
    //  MESSAGE DELETE (ANTI-DELETE)
    // =============================================
    async delete(p) {
        const { remoteJid, fromMe, id, participant } = p
        if (fromMe) return

        const { getFullMessage } = require('./lib/store')
        const chats = getFullMessage(id)
        if (!chats) return

        const chatData = await getChat(remoteJid).catch(() => null)
        if (!chatData || !chatData.delete) return

        const msg = await global.smsg(this, chats)
        await this.reply(
            msg.chat,
            `Hayo apus apaan itu...\n\nMatiin fitur anti delete: *.antidelete off*`.trim(),
            msg.msg
        )
        this.copyNForward(msg.chat, chats).catch(() => { })
    },
}

// =============================================
//  DEFAULT FAIL MESSAGES
// =============================================
global.dfail = (type, m, conn) => {
    const msg = {
        rowner: '> Perintah ini hanya untuk owner!',
        owner: '> Perintah ini hanya untuk owner!',
        mods: '> Perintah ini hanya untuk owner dan moderator!',
        premium: '> Perintah ini hanya untuk premium user!',
        group: 'Perintah ini hanya bisa digunakan di grup!',
        private: 'Perintah ini hanya bisa digunakan di chat pribadi!',
        admin: '> Perintah ini hanya untuk admin grup!',
        botAdmin: '> Jadikan bot sebagai admin terlebih dahulu!',
        staff: '> Perintah ini hanya dapat diakses oleh Staff/Moderator bot!',
        unreg: 'Silahkan daftar dulu dengan cara:\n\n*#daftar nama.umur*\n\nContoh: *#daftar Kalip.20*',
        restrict: 'Fitur ini sedang di-*disable*!',
    }[type]
    if (msg) return m.reply(msg)
}

// Auto-reload handler
const file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright("[HANDLER] Updated 'handler.js'"))
    delete require.cache[file]
    if (global.reloadHandler) console.log(global.reloadHandler())
})
