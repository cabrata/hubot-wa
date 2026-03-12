let handler = async (m, { conn, usedPrefix }) => {
    let tutorial = `
🏰 *TUTORIAL GUILD SYSTEM* 🏰

*1. PENDAFTARAN & INFO*
• ${usedPrefix}createguild <nama> (Membuat markas baru)
• ${usedPrefix}joinguild <nama> (Bergabung ke markas)
• ${usedPrefix}myguild (Cek status markasmu)
• ${usedPrefix}glist (Papan peringkat markas)

*2. MANAJEMEN ANGGOTA*
• ${usedPrefix}listacc (Cek daftar pelamar)
• ${usedPrefix}gacc / ${usedPrefix}gdecline @user (Terima/Tolak pelamar)
• ${usedPrefix}gpromote / ${usedPrefix}gdemote @user (Atur jabatan Staff)
• ${usedPrefix}gkick @user (Keluarkan anggota)
• ${usedPrefix}gleave (Keluar dari markas)

*3. EKONOMI & FASILITAS*
• ${usedPrefix}gdonasi <jumlah> (Sumbang Harta ke kas)
• ${usedPrefix}gtopdonasi (Papan skor donatur markas)
• ${usedPrefix}gshare <jumlah> (Bagikan kas ke semua anggota)
• ${usedPrefix}gshop (Beli item langka - Pajak 10% ke kas)
• ${usedPrefix}gstore <item> <jml> (Simpan barang ke gudang)
• ${usedPrefix}gstorage (Cek isi gudang markas)

*4. PVE & MISI (Cari EXP & Eliksir)*
• ${usedPrefix}gquest (Misi harian anggota markas)
• ${usedPrefix}gboss (Summon Boss Raid - Owner/Staff)
• ${usedPrefix}attackboss (Serang Boss bersama-sama)

*5. PVP & PERANG*
• ${usedPrefix}gattack (Rampok markas acak)
• ${usedPrefix}gwar <nama> (Tantang markas lain)
• ${usedPrefix}gwaracc <nama> (Terima tantangan perang)
• ${usedPrefix}gwarpause (Batalkan tantangan)
• ${usedPrefix}gally / ${usedPrefix}gallyacc <nama> (Ajak/Terima Aliansi)

*6. UPGRADE & PERTAHANAN*
• ${usedPrefix}gupgrade level (Tingkatkan level markas)
• ${usedPrefix}buyguardian (Beli monster penjaga markas)
• ${usedPrefix}gbuff (Beli efek kekuatan - Durasi 24 Jam)

*7. PENGATURAN MARKAS*
• ${usedPrefix}setguild <public/private> (Ubah privasi markas)
• ${usedPrefix}grename <nama_baru> (Ganti nama markas - Biaya 100M)
• ${usedPrefix}delguild (Bubarkan markas - Hanya Owner)
`.trim()

    conn.reply(m.chat, tutorial, m)
}

handler.help = ['guildtutorial']
handler.tags = ['rpgG']
handler.command = /^(guildtutorial|gtutorial|guild|gmenu|guildmenu)$/i
module.exports = handler
