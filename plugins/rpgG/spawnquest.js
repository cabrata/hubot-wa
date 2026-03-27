const QuestEngine = require('../../lib/quest');
const { getUser, db } = require('../../lib/database');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    
    if (!user.moderator && !global.owner.includes(m.sender.split('@')[0])) {
        return m.reply('🛑 Akses Ditolak! Command ini dikhususkan untuk Dewa (Moderator/Owner Bot).');
    }

    // Format: .spawnquest NamaGuild | TipeMisi(1-10) | EXP | Eliksir | Harta
    let [guildName, tipeMisi, hadiahExp, hadiahEliksir, hadiahHarta] = text.split('|').map(v => v?.trim());

    if (!guildName || !tipeMisi || !hadiahExp || !hadiahEliksir || !hadiahHarta) {
        let menu = `🛠️ *CUSTOM QUEST MAKER (GOD MODE)* 🛠️\n\n`;
        menu += `Cara Penggunaan:\n`;
        menu += `=> *${usedPrefix + command} Nama Guild | Tipe | EXP | Eliksir | Harta*\n\n`;
        menu += `*PILIHAN TIPE MISI (1-10):*\n`;
        menu += `[1] 🐉 Bantai Naga Kuno (Action)\n`;
        menu += `[2] 🧱 Restorasi Istana Dewa (Submit)\n`;
        menu += `[3] 🗺️ Pencarian Artefak (Action -> Dialog)\n`;
        menu += `[4] 🧟‍♂️ Invasi Pasukan Undead (Action -> Dialog)\n`;
        menu += `[5] 🧪 Penawar Wabah Racun (Dialog -> Submit Potion)\n`;
        menu += `[6] ⚒️ Penempaan Pedang Kosmik (Submit -> Action -> Dialog)\n`;
        menu += `[7] 🥷 Pemberontakan Bandit Gurun (Action -> Action)\n`;
        menu += `[8] 🩸 Ritual Bulan Berdarah (Submit -> Action)\n`;
        menu += `[9] 🗿 Golem Raksasa Mengamuk (Dialog -> Submit -> Action)\n`;
        menu += `[10] 🌌 Ekspedisi Dimensi Gelap (Action -> Dialog -> Action)\n\n`;
        menu += `*Batas Maksimal Hadiah:*\n`;
        menu += `- EXP: 100.000\n- Eliksir: 5.000\n- Harta: 100 Miliar\n\n`;
        menu += `*Contoh:* \n${usedPrefix + command} Garuda | 6 | 50000 | 2000 | 50000000000`;
        return m.reply(menu);
    }

    let targetGuild = await db.guild.findFirst({ where: { name: guildName } });
    if (!targetGuild) return m.reply(`❌ Guild dengan nama *${guildName}* tidak ditemukan.`);

    if (QuestEngine.quests[targetGuild.id]) {
        return m.reply(`⚠️ Guild *${targetGuild.name}* sedang menjalankan Quest lain. Misi dewa tidak bisa ditimpa kecuali mereka membatalkannya.`);
    }

    // Filter Limit Hadiah (Anti Rungkad)
    let exp = Math.min(parseInt(hadiahExp), 100000);
    let eliksir = Math.min(parseInt(hadiahEliksir), 5000);
    let harta = BigInt(hadiahHarta) > 100_000_000_000n ? 100_000_000_000n : BigInt(hadiahHarta);

    if (isNaN(exp) || isNaN(eliksir)) return m.reply('❌ Hadiah EXP dan Eliksir harus berupa angka bulat!');

    let customQuest = {
        id: 'MOD_QUEST_' + Date.now(),
        rank: 'SS (GOD TIER)',
        title: '🌟 Misi Suci Penurunan Dewa',
        minLevel: 1, 
        reward: { exp: exp, eliksir: eliksir, harta: harta, drop: 'legendary' },
        steps: []
    };

    // RACIKAN 10 TIPE MISI DEWA
    switch (tipeMisi) {
        case '1':
            customQuest.title = '🐉 Penaklukan Naga Kuno';
            customQuest.steps.push(
                { type: 'dialog', target: 'panglima', text: 'Bicara dengan `panglima` di markas untuk mengambil senjata khusus penembus sisik naga.', npc_reply: '⚔️ Panglima: "Bawa tombak ini! Jangan kembali sebelum naga itu mati!"' },
                { type: 'action', lokasi: 'sarang_naga', kegiatan: 'bunuh_naga', text: 'Pergi ke `sarang_naga` dan `bunuh_naga` tersebut!', npc_reply: '🩸 KRAAAK! Kepala naga terpenggal. Kalian berhasil menyelamatkan kota!' }
            );
            break;
        case '2':
            customQuest.title = '🧱 Restorasi Istana Dewa';
            customQuest.steps.push(
                { type: 'submit', req: { mythic: 10, diamond: 50 }, text: 'Dewa meminta persembahan 10 Mythic dan 50 Diamond untuk membangun kembali istananya. Setor sekarang!', npc_reply: '✨ Cahaya suci turun dari langit. Dewa memberkati guild kalian!' }
            );
            break;
        case '3':
            customQuest.title = '🗺️ Pencarian Artefak Kuno';
            customQuest.steps.push(
                { type: 'action', lokasi: 'piramida', kegiatan: 'bongkar_makam', text: 'Pergi ke `piramida` dan `bongkar_makam` kuno di sana untuk mencari kotak emas.', npc_reply: '⚰️ Kalian menemukan sebuah kotak emas bersinar!' },
                { type: 'dialog', target: 'pendeta', text: 'Berikan kotak tersebut dengan bicara ke `pendeta`.', npc_reply: '⛪ Pendeta: "Luar biasa! Ini adalah Artefak suci yang hilang ratusan tahun lalu!"' }
            );
            break;
        case '4':
            customQuest.title = '🧟‍♂️ Invasi Pasukan Undead';
            customQuest.steps.push(
                { type: 'action', lokasi: 'gerbang_kota', kegiatan: 'tahan_serangan', text: 'Pasukan Undead menyerang! Pergi ke `gerbang_kota` dan `tahan_serangan` mereka.', npc_reply: '🛡️ Pasukan kalian berhasil menahan gelombang pertama!' },
                { type: 'dialog', target: 'raja', text: 'Lapor ke `raja` bahwa gerbang kota telah aman.', npc_reply: '👑 Raja: "Kalian adalah pahlawan sejati kerajaan ini!"' }
            );
            break;
        case '5':
            customQuest.title = '🧪 Penawar Wabah Misterius';
            customQuest.steps.push(
                { type: 'dialog', target: 'tabib', text: 'Warga desa bertumbangan! Segera tanya `tabib` apa yang dibutuhkan.', npc_reply: '💉 Tabib: "Wabah ini mematikan! Aku butuh banyak ramuan obat secepatnya!"' },
                { type: 'submit', req: { potion: 100 }, text: 'Kumpulkan dan setorkan 100 Potion ke markas untuk didistribusikan.', npc_reply: '🩺 Tabib: "Terima kasih! Obat ini akan menyelamatkan ratusan nyawa!"' }
            );
            break;
        case '6':
            customQuest.title = '⚒️ Penempaan Pedang Kosmik';
            customQuest.steps.push(
                { type: 'submit', req: { iron: 500, emas: 100, diamond: 10 }, text: 'Kumpulkan bahan mentah: 500 Iron, 100 Emas, dan 10 Diamond.', npc_reply: '📦 Material terkumpul. Siap untuk dilebur!' },
                { type: 'action', lokasi: 'gunung_berapi', kegiatan: 'lebur_logam', text: 'Bawa material ke `gunung_berapi` dan `lebur_logam` menggunakan lava.', npc_reply: '🌋 Logam berhasil menyatu menjadi baja kosmik yang sangat panas!' },
                { type: 'dialog', target: 'pandai_besi', text: 'Serahkan baja kosmik tersebut ke `pandai_besi`.', npc_reply: '👨‍🏭 Pandai Besi: "Sempurna! Pedang Kosmik ini akan membelah langit!"' }
            );
            break;
        case '7':
            customQuest.title = '🥷 Pemberontakan Bandit Gurun';
            customQuest.steps.push(
                { type: 'action', lokasi: 'gurun_pasir', kegiatan: 'sergap_markas', text: 'Penyusup bersembunyi di padang pasir. Pergi ke `gurun_pasir` dan `sergap_markas` mereka!', npc_reply: '⚔️ Pasukan bandit panik dan mencoba melawan!' },
                { type: 'action', lokasi: 'gurun_pasir', kegiatan: 'tangkap_bos', text: 'Jangan biarkan pimpinan mereka kabur! Lakukan `tangkap_bos` di lokasi yang sama.', npc_reply: '⛓️ Pemimpin bandit berhasil diikat dan diseret ke penjara.' }
            );
            break;
        case '8':
            customQuest.title = '🩸 Ritual Bulan Berdarah';
            customQuest.steps.push(
                { type: 'submit', req: { batu: 300, mythic: 5 }, text: 'Bangun altar ritual. Setorkan 300 Batu dan 5 Mythic.', npc_reply: '🗿 Altar berhasil dibangun. Udara terasa berat...' },
                { type: 'action', lokasi: 'altar_kuno', kegiatan: 'segel_iblis', text: 'Iblis mulai muncul! Pergi ke `altar_kuno` dan `segel_iblis` tersebut segera!', npc_reply: '⚡ Segel sihir berhasil ditutup tepat waktu. Dunia kembali aman.' }
            );
            break;
        case '9':
            customQuest.title = '🗿 Golem Raksasa Mengamuk';
            customQuest.steps.push(
                { type: 'dialog', target: 'penyihir', text: 'Golem raksasa menghancurkan desa! Tanya `penyihir` cara mengalahkannya.', npc_reply: '🧙‍♀️ Penyihir: "Fisik tak mempan padanya! Kita butuh ledakan besar dari Diamond dan Potion!"' },
                { type: 'submit', req: { diamond: 50, potion: 50 }, text: 'Setorkan 50 Diamond dan 50 Potion untuk dirakit menjadi bom ajaib.', npc_reply: '💣 Bom ajaib siap digunakan!' },
                { type: 'action', lokasi: 'tengah_desa', kegiatan: 'lempar_bom', text: 'Cegat golem di `tengah_desa` dan `lempar_bom` tersebut!', npc_reply: '💥 BOOOOM! Golem hancur berkeping-keping menjadi debu.' }
            );
            break;
        case '10':
            customQuest.title = '🌌 Ekspedisi Dimensi Gelap';
            customQuest.steps.push(
                { type: 'action', lokasi: 'portal_hitam', kegiatan: 'masuk_portal', text: 'Sebuah celah dimensi terbuka. Pergi ke `portal_hitam` dan `masuk_portal` untuk investigasi.', npc_reply: '🌀 Kalian tersedot ke dimensi yang hampa dan gelap gulita.' },
                { type: 'dialog', target: 'roh_penjaga', text: 'Bicara dengan `roh_penjaga` yang mengambang di kejauhan.', npc_reply: '👻 Roh Penjaga: "Dimensi ini runtuh! Cepat hancurkan inti kristalnya untuk keluar!"' },
                { type: 'action', lokasi: 'inti_kristal', kegiatan: 'hancurkan', text: 'Cari `inti_kristal` dan `hancurkan` sekuat tenaga!', npc_reply: '✨ CRATTT! Kristal pecah. Kalian terlempar kembali ke dunia nyata dengan selamat.' }
            );
            break;
        default:
            return m.reply('❌ Tipe misi tidak valid. Pilih angka 1 sampai 10.');
    }

    // Suntik Misi ke Guild
    QuestEngine.quests[targetGuild.id] = {
        id: customQuest.id,
        template: customQuest,
        currentStep: 0,
        progress: {}
    };

    let msg = `🚨 *PANGGILAN DARI DEWA!* 🚨\n\nMarkas kalian (*${targetGuild.name}*) ditunjuk langsung oleh Yang Maha Kuasa untuk menjalankan sebuah Misi Suci!\n\nSeluruh anggota diharap segera mengetik *${usedPrefix}gquest info* untuk melihat instruksi.\n\n*🎁 Hadiah Dijanjikan:*\n- ${exp.toLocaleString('id-ID')} EXP\n- ${eliksir.toLocaleString('id-ID')} Eliksir\n- Rp ${harta.toLocaleString('id-ID')} Harta`;
    
    conn.reply(targetGuild.owner, msg, null).catch(()=>{});

    m.reply(`✅ *Custom Quest Berhasil Diciptakan!*\n\nTarget: ${targetGuild.name}\nJudul: ${customQuest.title}\nHadiah disesuaikan: EXP (${exp}), Eliksir (${eliksir}), Harta (Rp ${harta})\n\n_Pesan otomatis telah dikirim ke Owner Guild tersebut._`);
};

handler.help = ['spawnquest <guild | tipe | exp | eliksir | harta>'];
handler.tags = ['owner'];
handler.command = /^(spawnquest|forcequest|modquest)$/i;
module.exports = handler;