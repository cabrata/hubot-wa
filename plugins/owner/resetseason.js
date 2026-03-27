const { db } = require('../../lib/database');

let handler = async (m, { conn }) => {
    // Kalo lagi reset, tolak request biar ga dobel
    if (global.isResettingSeason) return m.reply("⏳ Sabar bang, lagi mindahin database buat Season baru...");
    
    // Kunci pintunya
    global.isResettingSeason = true;

    try {
        if (!global.rpgSeason) global.rpgSeason = 1;
        let nextSeason = global.rpgSeason + 1;

        m.reply(`⏳ Memulai Operasi Reset Season ke-${nextSeason}...\nMereset 93k+ data player beserta riwayat Giveaway & Redeem Code. Proses ini hitungan detik, pantau CPU lu pasti adem...`);

        // Eksekusi semua query secara berbarengan (paralel) biar instan!
        await Promise.all([
            // 1. RESET TABEL USER (Core Stats)
            db.user.updateMany({
                data: {
                    exp: 100n, level: 1n, limit: 500n, glimit: 10n,
                    role: 'Newbie ㋡', job: 'Pengangguran', jobexp: 0n,
                    slotNetWinLoss: 0, spinLock: false, slotFreeSpins: 0n,
                    slotFSBet: 0, freespin: 0n, fsBet: 0, slotSpinning: false,
                    isAutoSpinning: false, cancelAutoSpin: false
                }
            }),

            // 2. RESET TABEL ECONOMY (Uang, Gacha, Bangunan)
            db.userEconomy.updateMany({
                data: {
                    saldo: 0, pengeluaran: 0, money: 0, bank: 0, balance: 0,
                    chip: 0n, tiketcoin: 0n, poin: 0n, litecoin: 0n, gems: 0n, cupon: 0n,
                    dana: 0n, gopay: 0n, ovo: 0n, diamond: 0n, emerald: 0n, berlian: 0n,
                    iron: 0n, emas: 0n, arlok: 0n, bisnis: 0n, berbisnis: 0n, rumahsakit: 0n,
                    fortress: 0n, shield: false, pertanian: 0n, pertambangan: 0n, camptroops: 0n,
                    tambang: 0n, penduduk: 0n, archer: 0n, subscribers: 0n, viewers: 0n,
                    like: 0n, playButton: 0n, taxi: 0n, common: 0n, as: 0n, uncommon: 0n,
                    mythic: 0n, legendary: 0n, glory: 0n, enchant: 0n, pet: 0n, psepick: 0n, psenjata: 0n
                }
            }),

            // 3. RESET TABEL RPG (Stats Darah, RPG Class)
            db.userRpg.updateMany({
                data: {
                    healt: 100n, health: 100n, energi: 100n, power: 100n, stamina: 100n, haus: 100n, laper: 100n,
                    pc: 0n, korbanngocok: 0n, ngewe: 0n, jualan: 0n, ngocokk: 0n, antarpaket: 0n,
                    ojekk: 0n, polisi: 0n, ojek: 0n, pedagang: 0n, dokter: 0n, petani: 0n, montir: 0n, kuli: 0n,
                    trofi: 0n, rtrofi: 'Perunggu', troopcamp: 0n,
                    attack: 0n, strenght: 0n, speed: 0n, defense: 0n, regeneration: 0n,
                    darahiblis: 0n, demonblood: 0n, demonkill: 0n, hashirakill: 0n, alldemonkill: 0n, allhashirakill: 0n,
                    ramuan: 0n, string: 0n, eleksirb: 0n, shadow: 0n,
                    pancing: 0n, pancingan: 0n, totalPancingan: 0n, anakpancingan: 0n, umpan: 0n, sampah: 0n, potion: 0n
                }
            }),

            // 4. RESET TABEL COOLDOWN (Biar semua lastclaim, dll jadi 0)
            db.userCooldown.updateMany({
                data: {
                    lastseen: 0n, lastSetStatus: 0n, lastIstigfar: 0n, lastclaim: 0n, judilast: 0n,
                    lastnambang: 0n, lastnebang: 0n, lastkerja: 0n, lastmaling: 0n, lastbunuhi: 0n,
                    lastbisnis: 0n, lastberbisnis: 0n, lastmancing: 0n, lastramuanclaim: 0n, lastgemclaim: 0n,
                    lastpotionclaim: 0n, laststringclaim: 0n, lastswordclaim: 0n, lastweaponclaim: 0n, lastironclaim: 0n,
                    lastmancingclaim: 0n, lastadventure: 0n, lastberburu: 0n, lastkill: 0n, lastfishing: 0n,
                    lastdungeon: 0n, lastwar: 0n, lastsda: 0n, lastberbru: 0n, lastduel: 0n, lastjb: 0n,
                    lastmining: 0n, lasthunt: 0n, lasthun: 0n, lastngocok: 0n, lastgift: 0n, lastrob: 0n,
                    lastngojek: 0n, lastngewe: 0n, lastjualan: 0n, lastngocokk: 0n, lastgrab: 0n, lastberkebon: 0n,
                    lastcodereg: 0n, lastdagang: 0n, lasthourly: 0n, lastweekly: 0n, lastyearly: 0n,
                    lastmonthly: 0n, lastturu: 0n, lastbansos: 0n, lastrampok: 0n, lastngaji: 0n, lastlonte: 0n,
                    lastkoboy: 0n, lastdate: 0n, lasttambang: 0n, lastngepet: 0n, lasttaxi: 0n, lastyoutuber: 0n,
                    lastbossbattle: 0n, lastberbisnis2: 0n, lastLeaveG: 0n
                }
            }),

            // 5. RESET TABEL JOB (Progress kerja harian user)
            db.userJob.updateMany({
                data: {
                    kerjasatu: 0n, kerjadua: 0n, kerjatiga: 0n, kerjaempat: 0n, kerjalima: 0n,
                    kerjaenam: 0n, kerjatujuh: 0n, kerjadelapan: 0n, kerjasembilan: 0n, kerjasepuluh: 0n,
                    kerjasebelas: 0n, kerjaduabelas: 0n, kerjatigabelas: 0n, kerjaempatbelas: 0n, kerjalimabelas: 0n,
                    pekerjaansatu: 0n, pekerjaandua: 0n, pekerjaantiga: 0n, pekerjaanempat: 0n, pekerjaanlima: 0n,
                    pekerjaanenam: 0n, pekerjaantujuh: 0n, pekerjaandelapan: 0n, pekerjaansembilan: 0n, pekerjaansepuluh: 0n,
                    pekerjaansebelas: 0n, pekerjaanduabelas: 0n, pekerjaantigabelas: 0n, pekerjaanempatbelas: 0n, pekerjaanlimabelas: 0n
                }
            }),

            // 6. RESET TABEL INVENTORY (Item kayak pisang, batu, kayu direset jadi 0)
            db.userInventory.updateMany({
                data: { quantity: 0n }
            }),

            // 7. RESET TABEL PET & TOOLS (Biar fair mulai dari nol)
            db.userPet.updateMany({
                data: { count: 0n, baby: 0n, exp: 0n, food: 0n, lastClaim: 0n }
            }),
            db.userTool.updateMany({
                data: { owned: 0n, durability: 0n }
            }),

            // 8. HAPUS SEMUA DATA GIVEAWAY, DAGET, & REDEEM CODE
            db.giveaway.deleteMany({}),
            db.redeemCode.deleteMany({}),
            db.modRedeemState.updateMany({
                data: { weeklyCount: 0, dailyCount: {}, resetWeekly: 0n }
            })
        ]);

        // Simpan season baru
        global.rpgSeason = nextSeason;

        const replies = [
            `Sip! Reset season berhasil. Selamat datang di season ${nextSeason}, petualang! 🔥`,
            `Mantap! Data game RPG seluruh user udah direset. Saatnya mulai petualangan baru di season ${nextSeason}! ⚔️`,
            `Berhasil! Season direset. Ayo mulai perjalanan epikmu di season ${nextSeason}! ✨`
        ];

        const response = replies[Math.floor(Math.random() * replies.length)];
        
        m.reply(`✅ Proses Selesai!\nSeluruh 93k+ data player, beserta riwayat Giveaway, Daget, dan Redeem Code berhasil dibersihkan! CPU panel lu aman sentosa.`);
        conn.reply("120363373141583166@newsletter", response);

    } catch (e) {
        console.error("Gagal reset season:", e);
        m.reply("❌ Terjadi kesalahan saat mereset season. Cek console botnya.");
    } finally {
        // Blok ini 100% dipanggil mau prosesnya sukses atau error, bot lu nggak bakal nyangkut!
        global.isResettingSeason = false; 
    }
}

handler.help = ['resetseason'];
handler.tags = ['owner'];
handler.rowner = true;
handler.command = /^(resetseason)$/i;

module.exports = handler;