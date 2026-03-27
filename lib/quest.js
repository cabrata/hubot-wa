const { db } = require('./database');

// ─── DATA PROCEDURAL GENERATION (SUPER KOMPLEKS) ───
const RPG_DATA = {
    npcs: ['penyihir_tua', 'pandai_besi', 'kepala_desa', 'pengembara_misterius', 'ksatria_kerajaan', 'pemburu_bayaran', 'pendeta_suci', 'jenderal_perang', 'tabib_desa'],
    npc_names: ['Penyihir Tua', 'Pandai Besi', 'Kepala Desa', 'Pengembara', 'Ksatria', 'Pemburu', 'Pendeta', 'Jenderal', 'Tabib'],
    locations: ['hutan_kematian', 'lembah_naga', 'kawah_vulkanik', 'reruntuhan_kuno', 'kuil_terkutuk', 'danau_es', 'gurun_kematian', 'goa_kegelapan', 'puncak_gunung'],
    monsters: ['Goblin Mutan', 'Serigala Bayangan', 'Golem Besi', 'Roh Jahat', 'Raksasa Batu', 'Iblis Bertanduk', 'Naga Tulang', 'Troll Beracun', 'Orc Berserker'],
    bosses: ['Cerberus', 'Minotaur', 'Dullahan', 'Ifrit', 'Leviathan', 'Chimera', 'Behemoth', 'Demon Lord'], // Target Boss Dungeon
    items_low: ['iron', 'batu', 'potion'],
    items_mid: ['emas', 'diamond', 'cerberus_fang', 'minotaur_horn'],
    items_high: ['mythic', 'legendary', 'dragon_scale', 'fire_core', 'titan_blood']
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Fungsi canggih buat merajut cerita otomatis
const replaceTags = (text, data) => {
    return text.replace(/{npc}/g, data.npcId)
               .replace(/{npcName}/g, data.npcName)
               .replace(/{loc}/g, data.lokasi)
               .replace(/{mob}/g, data.monster)
               .replace(/{boss}/g, data.bossTarget)
               .replace(/{item}/g, data.reqItem)
               .replace(/{amt}/g, data.reqJml)
               .replace(/{floorAmt}/g, data.reqFloor)
               .replace(/_/g, ' ');
};

class QuestEngine {
    constructor() {
        if (!global.activeGuildQuests) global.activeGuildQuests = {};
        if (!global.globalQuestBoard) global.globalQuestBoard = null;
        this.quests = global.activeGuildQuests;
        this.isSpawning = false; // Mencegah dobel interval
    }

    // ─── DYNAMIC QUEST GENERATOR (RATUSAN RIBU KOMBINASI) ───
    generateDynamicQuest(rankTarget = null) {
        const ranks = [
            { rank: 'D', minLevel: 1, exp: 500, eliksir: 20, harta: 50000000n, itemPool: RPG_DATA.items_low, reqJml: randomInt(15, 50), reqFloor: randomInt(2, 5) },
            { rank: 'C', minLevel: 5, exp: 1200, eliksir: 50, harta: 150000000n, itemPool: RPG_DATA.items_low, reqJml: randomInt(50, 150), reqFloor: randomInt(4, 8) },
            { rank: 'B', minLevel: 15, exp: 4500, eliksir: 250, harta: 800000000n, itemPool: RPG_DATA.items_mid, reqJml: randomInt(5, 20), reqFloor: randomInt(6, 12) },
            { rank: 'A', minLevel: 30, exp: 8000, eliksir: 500, harta: 2000000000n, itemPool: RPG_DATA.items_mid, reqJml: randomInt(20, 50), reqFloor: randomInt(10, 15) },
            { rank: 'SS', minLevel: 50, exp: 35000, eliksir: 2500, harta: 25000000000n, itemPool: RPG_DATA.items_high, reqJml: randomInt(2, 8), reqFloor: randomInt(15, 25) }
        ];

        let selectedRank = rankTarget ? ranks.find(r => r.rank === rankTarget) : getRandom(ranks);
        
        // Acak semua elemen variabel
        let qData = {
            npcId: getRandom(RPG_DATA.npcs),
            npcName: '',
            lokasi: getRandom(RPG_DATA.locations),
            monster: getRandom(RPG_DATA.monsters),
            bossTarget: getRandom(RPG_DATA.bosses),
            reqItem: getRandom(selectedRank.itemPool),
            reqJml: selectedRank.reqJml,
            reqFloor: selectedRank.reqFloor
        };
        qData.npcName = RPG_DATA.npc_names[RPG_DATA.npcs.indexOf(qData.npcId)];

        // Kumpulan Story Arcs (Campuran Roleplay Action, Submit, dan DUNGEON INTEGRATION)
        const storyArcs = [
            // Arc 1: Integrasi Dungeon Murni (Clear Lantai & Kill Boss)
            [
                { type: 'dialog', target: '{npc}', text: 'Bicara dengan `{npc}` tentang anomali di Dungeon.', npc_reply: '🗣️ {npcName}: "Dungeon memuntahkan energi gelap! Tolong bersihkan beberapa lantai sebelum terlambat!"' },
                { type: 'dungeon_action', actionType: 'floor_clear', max: qData.reqFloor, text: 'Masuk ke Dungeon (.dungeon party/raid) dan selesaikan {floorAmt} lantai.', npc_reply: '⚔️ Gelombang monster berhasil ditekan! Namun aura jahat belum hilang.' },
                { type: 'dungeon_action', actionType: 'boss_kill', target: '{boss}', max: 1, text: 'Penyebabnya adalah Boss! Terus telusuri Dungeon dan bunuh `{boss}`.', npc_reply: '🩸 {boss} tumbang! Kedamaian kembali.' },
                { type: 'dialog', target: '{npc}', text: 'Kembali dan lapor ke `{npc}` bahwa dungeon telah aman.', npc_reply: '🗣️ {npcName}: "Luar biasa! Markasmu layak mendapat penghargaan ini."' }
            ],
            // Arc 2: Wabah & Penawar (Kombinasi Submit & Action)
            [
                { type: 'dialog', target: '{npc}', text: 'Kunjungi `{npc}`. Terdengar desas-desus tentang kutukan aneh.', npc_reply: '🗣️ {npcName}: "Warga terkena kutukan! Aku bisa membuat penawarnya, tapi bawakan aku {amt} {item}!"' },
                { type: 'submit', req: { '{item}': '{amt}' }, text: 'Kumpulkan dan setorkan {amt} `{item}` ke markas (.gquest setor).', npc_reply: '📦 Material terkumpul. {npcName} mulai meracik obatnya.' },
                { type: 'action', lokasi: '{loc}', kegiatan: 'sebar_penawar', text: 'Bawa ramuan itu ke `{loc}` dan `sebar_penawar` ke seluruh area.', npc_reply: '✨ Cahaya suci menyebar, kutukan di {loc} perlahan menghilang.' }
            ],
            // Arc 3: Eksplorasi & Artefak
            [
                { type: 'action', lokasi: '{loc}', kegiatan: 'investigasi', text: 'Ada anomali sihir di `{loc}`. Lakukan `investigasi` ke sana.', npc_reply: '🔍 Kamu menemukan segel magis kuno yang tertutup lumpur.' },
                { type: 'action', lokasi: '{loc}', kegiatan: 'bongkar_segel', text: 'Segel itu menyembunyikan sesuatu! Lakukan `bongkar_segel` sekarang.', npc_reply: '💥 BOOM! Segel terbuka, memancarkan aura luar biasa!' },
                { type: 'dialog', target: '{npc}', text: 'Bawa artefak yang ditemukan ke `{npc}` untuk diteliti.', npc_reply: '🗣️ {npcName}: "Ini artefak legendaris! Sebagai gantinya, aku butuh {amt} {item} untuk biaya riset."' },
                { type: 'submit', req: { '{item}': '{amt}' }, text: 'Penuhi permintaan dengan menyetor {amt} `{item}`.', npc_reply: '✅ Transaksi selesai. Artefak berhasil diteliti!' }
            ],
            // Arc 4: Pembuatan Senjata Rahasia
            [
                { type: 'submit', req: { '{item}': '{amt}' }, text: 'Markas butuh senjata baru! Kumpulkan {amt} `{item}` secepatnya.', npc_reply: '🔨 Bahan berhasil dikumpulkan di gudang tempa.' },
                { type: 'action', lokasi: 'ruang_tempa', kegiatan: 'lebur_material', text: 'Pergi ke `ruang_tempa` di markas dan `lebur_material` tersebut.', npc_reply: '🔥 Material meleleh menjadi logam berkualitas tinggi.' },
                { type: 'dialog', target: '{npc}', text: 'Panggil `{npc}` untuk memimpin proses pendinginan senjata.', npc_reply: '🗣️ {npcName}: "Sempurna! Senjata ini siap digunakan di medan perang!"' }
            ]
        ];

        // Pilih arc secara acak, dan proses replace tags-nya
        let selectedArc = getRandom(storyArcs);
        let finalSteps = selectedArc.map(step => {
            let processedStep = { ...step };
            processedStep.text = replaceTags(step.text, qData);
            processedStep.npc_reply = replaceTags(step.npc_reply, qData);
            
            // Re-assign variable khusus tipe submit
            if (step.type === 'submit') {
                processedStep.req = { [qData.reqItem]: qData.reqJml };
            }
            // Re-assign target dialog & lokasi
            if (step.target) processedStep.target = replaceTags(step.target, qData);
            if (step.lokasi) processedStep.lokasi = replaceTags(step.lokasi, qData);
            
            // Konfigurasi max target buat Dungeon
            if (step.type === 'dungeon_action' && step.max) {
                processedStep.max = (step.actionType === 'floor_clear') ? qData.reqFloor : 1;
            }

            return processedStep;
        });

        // Bikin Judul yang Dinamis
        let titles = [
            `Misteri di ${qData.lokasi.replace('_', ' ')}`,
            `Pemberontakan ${qData.monster}`,
            `Permintaan Rahasia ${qData.npcName}`,
            `Ekspedisi Dungeon: Memburu ${qData.bossTarget}`
        ];

        return {
            rank: selectedRank.rank,
            title: `📜 ${replaceTags(getRandom(titles), qData).toUpperCase()}`,
            minLevel: selectedRank.minLevel,
            steps: finalSteps,
            reward: { exp: selectedRank.exp, eliksir: selectedRank.eliksir, harta: selectedRank.harta }
        };
    }

    // ─── FUNGSI TRIGGER DARI DALAM DUNGEON ───
    async triggerDungeonAction(guildId, actionType, amount = 1, targetName = null) {
        let active = this.quests[guildId];
        if (!active) return null;

        let step = active.template.steps[active.currentStep];
        
        // Cek apakah step quest saat ini adalah quest dungeon
        if (step && step.type === 'dungeon_action' && step.actionType === actionType) {
            // Kalau misinya bunuh boss spesifik, cek nama bossnya bener apa nggak
            if (actionType === 'boss_kill' && targetName && step.target !== targetName) return null;
            
            active.progress['dungeon'] = (active.progress['dungeon'] || 0) + amount;
            
            if (active.progress['dungeon'] >= step.max) {
                active.currentStep++;
                let completionCheck = await this.checkCompletion(guildId);
                return { stepDone: true, msg: step.npc_reply, isFinished: completionCheck.done, finalMsg: completionCheck.msg };
            } else {
                return { stepDone: false, msg: `Progress Misi Markas: ${active.progress['dungeon']} / ${step.max}` };
            }
        }
        return null;
    }

    // ─── AUTO SPAWN & BROADCAST KE CHANNEL (RANDOM DELAY) ───
    startAutoSpawn() {
        if (this.isSpawning) return; 
        this.isSpawning = true;

        const loopSpawn = () => {
            // Waktu acak antara 2 sampai 5 jam (dalam milidetik)
            let minTime = 2 * 60 * 60 * 1000; 
            let maxTime = 5 * 60 * 60 * 1000; 
            let randomDelay = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

            let jam = Math.floor(randomDelay / 3600000);
            let menit = Math.floor((randomDelay / 60000) % 60);
            console.log(`⏳ [AUTO-QUEST] Misi Global berikutnya akan muncul dalam ${jam} Jam ${menit} Menit.`);

            setTimeout(async () => {
                if (global.conn) {
                    let newQuest = this.generateDynamicQuest(); 
                    let qId = 'GQ-' + Date.now();

                    global.globalQuestBoard = {
                        id: qId,
                        template: newQuest,
                        timestamp: Date.now()
                    };

                    let teks = `🚨 *GLOBAL QUEST MUNCUL!* 🚨\n\n`;
                    teks += `Sebuah peristiwa besar sedang terjadi di benua ini! Markas yang berhasil mengklaim misi ini akan mendapatkan kekayaan dan kejayaan luar biasa!\n\n`;
                    teks += `📜 *Judul:* ${newQuest.title}\n`;
                    teks += `☠️ *Rank Kesulitan:* ${newQuest.rank}\n`;
                    teks += `🏰 *Syarat Minimal:* Guild Level ${newQuest.minLevel}\n\n`;
                    teks += `_⚠️ Siapa cepat dia dapat! Ketik *${global.prefix || '.'}gquest klaim* di grup markas kalian sekarang juga!_`;

                    try {
                        await global.conn.sendMessage('120363373141583166@newsletter', {
                            text: teks,
                            contextInfo: {
                                externalAdReply: {
                                    title: '⚔️ GLOBAL QUEST BARU!',
                                    body: 'HuTao BOT RPG Official',
                                    thumbnailUrl: 'https://i0.wp.com/i.ibb.co.com/9t5dkSZ/Screenshot-2025-01-03-14-42-53-66-7352322957d4404136654ef4adb64504.jpg',
                                    sourceUrl: 'https://saweria.co/hutaobot',
                                    mediaType: 1,
                                    renderLargerThumbnail: false
                                }
                            }
                        });
                        console.log('✅ [AUTO-QUEST] Berhasil broadcast event ke Channel!');
                    } catch (e) {
                        console.log("❌ [AUTO-QUEST] Gagal kirim broadcast ke channel:", e);
                    }
                }
                
                // Panggil loop lagi untuk nentuin waktu random quest selanjutnya
                loopSpawn();
            }, randomDelay);
        };

        // Mulai siklus untuk pertama kalinya
        loopSpawn();
    }

    // ─── FUNGSI POTONG ITEM DARI INVENTORY / ECONOMY ───
    async checkAndDeductItem(jid, item, amount) {
        let isEcoItem = ['iron', 'emas', 'diamond', 'batu', 'money', 'potion', 'mythic', 'legendary'].includes(item);
        if (isEcoItem) {
            let eco = await db.userEconomy.findUnique({where:{jid}});
            if (Number(eco?.[item] || 0) >= amount) {
                await db.userEconomy.update({where:{jid}, data:{[item]: {decrement: BigInt(amount)}}});
                return true;
            }
        } else {
            let inv = await db.userInventory.findUnique({where: { jid_itemName: { jid, itemName: item } }});
            if (inv && Number(inv.quantity) >= amount) {
                await db.userInventory.update({where: { id: inv.id }, data: { quantity: Number(inv.quantity) - amount } });
                return true;
            }
        }
        return false;
    }

    // ─── PROSES EKSEKUSI SETIAP TAHAPAN QUEST ───
    async processStep(guildId, playerJid, commandType, argsObj) {
        let active = this.quests[guildId];
        if (!active) return { error: '💤 Markasmu tidak memiliki Quest yang sedang berjalan.' };

        let stepData = active.template.steps[active.currentStep];

        // Pencegah error jika step adalah dungeon tapi user ketik command gquest aksi/setor
        if (stepData.type === 'dungeon_action') {
            return { error: `⚠️ Misi saat ini mengharuskanmu bertempur di dalam Dungeon! Gunakan command *.dungeon party* atau *.dungeon raid* bersama teman markasmu.` };
        }

        // 1. LOGIKA NGOBROL SAMA NPC
        if (stepData.type === 'dialog') {
            if (commandType !== 'bicara') return { error: `📝 Quest saat ini menugaskanmu untuk bicara dengan seseorang, bukan melakukan *${commandType}*.` };
            if (argsObj.target !== stepData.target) return { error: `❌ Kamu harus bicara dengan *${stepData.target}*, bukan *${argsObj.target}*.` };
            
            active.currentStep++;
            return { success: true, msg: stepData.npc_reply, next: await this.checkCompletion(guildId) };
        }

        // 2. LOGIKA PERGI & MELAKUKAN AKSI
        if (stepData.type === 'action') {
            if (commandType !== 'aksi') return { error: `📝 Quest menugaskanmu untuk pergi dan melakukan suatu aksi.` };
            if (argsObj.lokasi !== stepData.lokasi || argsObj.kegiatan !== stepData.kegiatan) {
                return { error: `❌ Aksi salah! Instruksi: Pergi ke *${stepData.lokasi}* dan lakukan *${stepData.kegiatan}*.` };
            }

            active.currentStep++;
            return { success: true, msg: stepData.npc_reply, next: await this.checkCompletion(guildId) };
        }

        // 3. LOGIKA SETOR BARANG MATERIAL
        if (stepData.type === 'submit') {
            if (commandType !== 'setor') return { error: `📝 Kamu harus menyetorkan material ke markas!` };
            
            let item = argsObj.item;
            let amount = argsObj.amount;
            
            if (!stepData.req[item]) return { error: `❌ Item *${item}* tidak dibutuhkan untuk quest saat ini.` };
            
            let needed = stepData.req[item] - (active.progress[item] || 0);
            if (needed <= 0) return { error: `✅ Kebutuhan *${item}* sudah terpenuhi! Lanjut ke material lain.` };
            
            if (amount > needed) amount = needed;

            let hasItem = await this.checkAndDeductItem(playerJid, item, amount);
            if (!hasItem) return { error: `❌ Kamu tidak memiliki *${amount} ${item}* di inventory-mu.` };

            active.progress[item] = (active.progress[item] || 0) + amount;
            
            let isDone = true;
            for (let reqItem in stepData.req) {
                if ((active.progress[reqItem] || 0) < stepData.req[reqItem]) isDone = false;
            }

            if (isDone) {
                active.currentStep++;
                return { success: true, msg: stepData.npc_reply || `✅ Seluruh material berhasil dikumpulkan!`, next: await this.checkCompletion(guildId) };
            } else {
                return { success: true, msg: `📦 Berhasil menyetorkan ${amount} ${item}. Progress: [${active.progress[item]} / ${stepData.req[item]}]` };
            }
        }
    }

    // ─── PENGECEKAN FINAL DAN PEMBERIAN HADIAH ───
    async checkCompletion(guildId) {
        let active = this.quests[guildId];
        if (active.currentStep >= active.template.steps.length) {
            let r = active.template.reward;
            let guild = await db.guild.findUnique({where:{id: guildId}});
            
            let dataUpdate = {
                exp: Number(guild.exp) + r.exp,
                eliksir: Number(guild.eliksir) + r.eliksir,
                harta: BigInt(guild.harta) + r.harta
            };

            let winMsg = `🎉 *QUEST MARKAS SELESAI!* 🎉\n\nMarkas menerima bayaran/hadiah:\n✨ +${r.exp.toLocaleString('id-ID')} EXP Guild\n💧 +${r.eliksir.toLocaleString('id-ID')} Eliksir\n💰 +Rp ${r.harta.toLocaleString('id-ID')} Kas Harta`;

            await db.guild.update({ where: {id: guildId}, data: dataUpdate });
            delete this.quests[guildId]; // Bersihkan quest dari memori
            return { done: true, msg: winMsg };
        }
        return { done: false };
    }
}

const questEngine = new QuestEngine();
module.exports = questEngine;