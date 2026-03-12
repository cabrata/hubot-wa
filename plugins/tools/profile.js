const { parsePhoneNumber } = require('awesome-phonenumber')
const { createHash } = require('crypto')
const { getUser, db } = require('../../lib/database')
const { getStaff } = require('../../lib/staffManager')
const moment = require('moment-timezone')

const regionMap = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AG: 'Antigua and Barbuda',
  AI: 'Anguilla', AL: 'Albania', AM: 'Armenia', AO: 'Angola', AQ: 'Antarctica', AR: 'Argentina',
  AS: 'American Samoa', AT: 'Austria', AU: 'Australia', AW: 'Aruba', AX: 'Åland Islands',
  AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina', BB: 'Barbados', BD: 'Bangladesh', BE: 'Belgium',
  BF: 'Burkina Faso', BG: 'Bulgaria', BH: 'Bahrain', BI: 'Burundi', BJ: 'Benin', BL: 'Saint Barthélemy',
  BM: 'Bermuda', BN: 'Brunei Darussalam', BO: 'Bolivia, Plurinational State of', BQ: 'Bonaire, Sint Eustatius and Saba',
  BR: 'Brazil', BS: 'Bahamas', BT: 'Bhutan', BV: 'Bouvet Island', BW: 'Botswana', BY: 'Belarus',
  BZ: 'Belize', CA: 'Canada', CC: 'Cocos (Keeling) Islands', CD: 'Congo, The Democratic Republic of the',
  CF: 'Central African Republic', CG: 'Congo', CH: 'Switzerland', CI: `Côte d'Ivoire`, CK: 'Cook Islands',
  CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CV: 'Cabo Verde',
  CW: 'Curaçao', CX: 'Christmas Island', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DJ: 'Djibouti',
  DK: 'Denmark', DM: 'Dominica', DO: 'Dominican Republic', DZ: 'Algeria', EC: 'Ecuador', EE: 'Estonia',
  EG: 'Egypt', EH: 'Western Sahara', ER: 'Eritrea', ES: 'Spain', ET: 'Ethiopia', FI: 'Finland',
  FJ: 'Fiji', FK: 'Falkland Islands (Malvinas)', FM: 'Micronesia, Federated States of', FO: 'Faroe Islands',
  FR: 'France', GA: 'Gabon', GB: 'United Kingdom', GD: 'Grenada', GE: 'Georgia', GF: 'French Guiana',
  GG: 'Guernsey', GH: 'Ghana', GI: 'Gibraltar', GL: 'Greenland', GM: 'Gambia', GN: 'Guinea',
  GP: 'Guadeloupe', GQ: 'Equatorial Guinea', GR: 'Greece', GS: 'South Georgia and the South Sandwich Islands',
  GT: 'Guatemala', GU: 'Guam', GW: 'Guinea-Bissau', GY: 'Guyana', HK: 'Hong Kong', HM: 'Heard Island and McDonald Islands',
  HN: 'Honduras', HR: 'Croatia', HT: 'Haiti', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland',
  IL: 'State of Palestine', IM: 'Isle of Man', IN: 'India', IO: 'British Indian Ocean Territory',
  IQ: 'Iraq', IR: 'Iran, Islamic Republic of', IS: 'Iceland', IT: 'Italy', JE: 'Jersey',
  JM: 'Jamaica', JO: 'Jordan', JP: 'Japan', KE: 'Kenya', KG: 'Kyrgyzstan', KH: 'Cambodia',
  KI: 'Kiribati', KM: 'Comoros', KN: 'Saint Kitts and Nevis', KP: "Korea, Democratic People's Republic of",
  KR: 'Korea, Republic of', KW: 'Kuwait', KY: 'Cayman Islands', KZ: 'Kazakhstan', LA: "Lao People's Democratic Republic",
  LB: 'Lebanon', LC: 'Saint Lucia', LI: 'Liechtenstein', LK: 'Sri Lanka', LR: 'Liberia',
  LS: 'Lesotho', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya', MA: 'Morocco',
  MC: 'Monaco', MD: 'Moldova, Republic of', ME: 'Montenegro', MF: 'Saint Martin (French part)',
  MG: 'Madagascar', MH: 'Marshall Islands', MK: 'North Macedonia', ML: 'Mali', MM: 'Myanmar',
  MN: 'Mongolia', MO: 'Macao', MP: 'Northern Mariana Islands', MQ: 'Martinique', MR: 'Mauritania',
  MS: 'Montserrat', MT: 'Malta', MU: 'Mauritius', MV: 'Maldives', MW: 'Malawi', MX: 'Mexico',
  MY: 'Malaysia', MZ: 'Mozambique', NA: 'Namibia', NC: 'New Caledonia', NE: 'Niger',
  NF: 'Norfolk Island', NG: 'Nigeria', NI: 'Nicaragua', NL: 'Netherlands', NO: 'Norway',
  NP: 'Nepal', NR: 'Nauru', NU: 'Niue', NZ: 'New Zealand', OM: 'Oman', PA: 'Panama',
  PE: 'Peru', PF: 'French Polynesia', PG: 'Papua New Guinea', PH: 'Philippines', PK: 'Pakistan',
  PL: 'Poland', PM: 'Saint Pierre and Miquelon', PN: 'Pitcairn', PR: 'Puerto Rico', PS: 'Palestine, State of',
  PT: 'Portugal', PW: 'Palau', PY: 'Paraguay', QA: 'Qatar', RE: 'Réunion', RO: 'Romania',
  RS: 'Serbia', RU: 'Russian Federation', RW: 'Rwanda', SA: 'Saudi Arabia', SB: 'Solomon Islands',
  SC: 'Seychelles', SD: 'Sudan', SE: 'Sweden', SG: 'Singapore', SH: 'Saint Helena, Ascension and Tristan da Cunha',
  SI: 'Slovenia', SJ: 'Svalbard and Jan Mayen', SK: 'Slovakia', SL: 'Sierra Leone', SM: 'San Marino',
  SN: 'Senegal', SO: 'Somalia', SR: 'Suriname', SS: 'South Sudan', ST: 'Sao Tome and Principe',
  SV: 'El Salvador', SX: 'Sint Maarten (Dutch part)', SY: 'Syrian Arab Republic', SZ: 'Eswatini',
  TC: 'Turks and Caicos Islands', TD: 'Chad', TF: 'French Southern Territories', TG: 'Togo',
  TH: 'Thailand', TJ: 'Tajikistan', TK: 'Tokelau', TL: 'Timor-Leste', TM: 'Turkmenistan',
  TN: 'Tunisia', TO: 'Tonga', TR: 'Turkey', TT: 'Trinidad and Tobago', TV: 'Tuvalu',
  TW: 'Taiwan, Province of China', TZ: 'Tanzania, United Republic of', UA: 'Ukraine', UG: 'Uganda',
  UM: 'United States Minor Outlying Islands', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VA: 'Holy See (Vatican City State)', VC: 'Saint Vincent and the Grenadines', VE: 'Venezuela, Bolivarian Republic of',
  VG: 'Virgin Islands, British', VI: 'Virgin Islands, U.S.', VN: 'Viet Nam', VU: 'Vanuatu',
  WF: 'Wallis and Futuna', WS: 'Samoa', YE: 'Yemen', YT: 'Mayotte', ZA: 'South Africa',
  ZM: 'Zambia', ZW: 'Zimbabwe'
}

let handler = async (m, { conn, usedPrefix, text }) => {
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    if (typeof who === 'undefined') {
        who = m.sender
    }
    
    let user = await getUser(who)
    if (!user) throw '❌ Pengguna tidak terdaftar di dalam database.'

    let pp = 'https://telegra.ph/file/168ed310d65b7cb3ef451.jpg'
    try {
        pp = await conn.profilePictureUrl(who, 'image')
    } catch (e) {} 

    let about = (await conn.fetchStatus(who).catch(console.error) || {}).status || '~'
    let username = conn.getName(who)
    let staffData = getStaff()
    let staffInfo = staffData[who] || {}
    
    let isNabil = global.nabil.includes(who.split('@')[0]);
    let isMods = user.moderator || false
    let isTimS = user.timSupport || false
    let isROwner = global.owner.includes(who.split('@')[0])
    let isPrems = (Number(user.premiumTime) || 0) > Date.now() || false
    let roleStaff = (staffInfo.role || '').toLowerCase()
    let isSupervisor = roleStaff.includes('supervisor')
    let isTrainee = roleStaff.includes('trainee')

    let rankIcon = '👤'
    let rankText = ''
    if (isNabil) {
        rankIcon = '✴️'; rankText = '(Admin)'
    } else if (isROwner) {
        rankIcon = '👑'; rankText = '(Owner)'
    } else if (isSupervisor) {
        rankIcon = '⚜️'; rankText = '(Supervisor)'
    } else if (isMods) {
        rankIcon = '🔱'; rankText = '(Moderator)'
    } else if (isTimS) {
        rankIcon = '〽️'; rankText = '(Tim Support)'
    } else if (isPrems) {
        rankIcon = '⭐'; rankText = '(Premium)'
    } else if (isTrainee) {
        rankIcon = '🔰'; rankText = '(Trainee)'
    } 
    
    // Format Tanggal Pendaftaran
    let regDate = '-'
    let regSince = Number(user.regSince || 0)
    if (regSince > 0) {
        let dateObj = new Date(regSince)
        let day = ('0' + dateObj.getDate()).slice(-2)
        let month = ('0' + (dateObj.getMonth() + 1)).slice(-2)
        let year = dateObj.getFullYear()
        regDate = `${day}/${month}/${year}`
    }

    // Hitung Sisa Premium
    let sisaPrem = '-'
    let premiumTime = Number(user.premiumTime || 0)
    if (isPrems && premiumTime > Date.now()) {
        let sisaTime = premiumTime - Date.now()
        let days = Math.floor(sisaTime / (1000 * 60 * 60 * 24))
        let hours = Math.floor((sisaTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        let minutes = Math.floor((sisaTime % (1000 * 60 * 60)) / (1000 * 60))
        sisaPrem = `${days}H ${hours}J ${minutes}M`
    }
      
    // Format Nomor & Negara
    let phoneStr = '+' + who.split('@')[0]
    let phoneNumber = parsePhoneNumber(phoneStr)
    let countryCode = phoneNumber?.regionCode || (phoneNumber?.getRegionCode ? phoneNumber.getRegionCode() : 'ID')
    let negara = regionMap[countryCode] || 'Tidak diketahui'

    // Format Umur
    let ageNum = Number(user.age || -1)
    let age = ageNum <= 0 ? `Belum diset (Ketik ${usedPrefix}daftar)` : ageNum

    // Cek Guild Tanpa Bikin Crash!
    let userGuildId = user?.guildId || user?.guild;
    let guildName = 'Tidak ada ❌'
    if (userGuildId) {
        let guildnya = await db.guild.findUnique({ where: { id: userGuildId } }).catch(() => null);
        if (guildnya) guildName = guildnya.name
    }

    // Hitung Sisa Ulang Tahun (Ambil dari tabel RPG)
    let ultah = user.rpg?.ultah || user.ultah;
    let nextBirthdayInfo = ''
    if (ultah && ultah !== '') {
        let bdParts = ultah.split('/')
        if (bdParts.length === 3 || bdParts.length === 2) {
            let today = moment().tz('Asia/Jakarta').startOf('day')
            let currentYear = today.year()
            
            let nextBd = moment(`${bdParts[0]}/${bdParts[1]}/${currentYear}`, 'DD/MM/YYYY').tz('Asia/Jakarta')
            if (nextBd.isBefore(today)) {
                nextBd.add(1, 'year')
            }

            let daysLeft = nextBd.diff(today, 'days')
            
            if (daysLeft === 0) {
                nextBirthdayInfo = `🎉 *(HARI INI!)*`
            } else {
                nextBirthdayInfo = `🕒 (${daysLeft} hari lagi)`
            }
        }
    }

    // 🛡️ SAFE PARSE PASANGAN CHAR (Mencegah Error "{" atau undefined)
    let pasChar = user.pasanganChar;
    if (typeof pasChar === 'string') {
        try { pasChar = JSON.parse(pasChar); } catch (e) { pasChar = null; }
    }

    let pasText = "-"
    if (pasChar && pasChar.name) {
        let pts = Number(pasChar.point || 0)
        let status = "Pdkt 💕"
        if (pts >= 50 && pts < 200) status = "Pacaran 👩‍❤️‍👨"
        else if (pts >= 200 && pts < 300) status = "Menikah 💍"
        else if (pts >= 300) status = "Berkeluarga 🏡"
        pasText = `${pasChar.name} [${status}]`
    }
    
    // Pasangan Real WA
    let pasanganWa = user.rpg?.pasangan || user.pasangan;
    let pasanganText = (pasanganWa && pasanganWa !== '') ? `@${pasanganWa.split('@')[0]}` : '-'

    // Role & Icon
    

    // Data Ekonomi (Format angka dipastikan Number agar toLocaleString jalan)
    let moneyDisp = Number(user.economy?.money || 0).toLocaleString('id-ID')
    let bankDisp = Number(user.economy?.bank || 0).toLocaleString('id-ID')
    let saldoDisp = Number(user.economy?.saldo || 0).toLocaleString('id-ID')
    let expDisp = Number(user.exp || 0).toLocaleString('id-ID')
    let limitDisp = Number(user.limit || 0).toLocaleString('id-ID')
     
            // Filter Nama: Cek apakah target adalah diri sendiri atau orang lain
    let waName = (who === m.sender) ? m.pushName : await conn.getName(who);
    let finalName = user.name ? user.name : waName;


        let str = `
╭─── ·[ *P R O F I L E* ]· ───
│ 
│ ${rankIcon} *Name:* ${finalName} ${rankText}
│ 📛 *Username:* ${waName} (@${who.replace(/@.+/, '')})
│ 🎂 *Age:* ${age} ${nextBirthdayInfo}
│ 🧬 *Gender:* ${user.gender === 'lk' ? 'Laki-laki ♂️' : user.gender === 'pr' ? 'Perempuan ♀️' : `Ketik ${usedPrefix}addprofile`}
│ 🌍 *Negara:* ${negara}
│
├─ ·[ 🎭 *S T A T U S* ]·
│
│ 🎭 *Role:* ${user.role || '-'}
│ 📈 *Level:* ${Number(user.level || 0)}
│ 🏛️ *Guild:* ${guildName}
│ 🕓 *Daftar:* ${regDate}
│ 🎟️ *Premium:* ${sisaPrem}
│
├─ ·[ 💰 *E K O N O M I* ]·
│
│ 💵 *Money:* Rp ${moneyDisp}
│ 🏦 *Bank:* Rp ${bankDisp}
│ 💳 *Saldo/Dana:* Rp ${saldoDisp}
│ 📊 *Exp:* ${expDisp}
│ 🪙 *Limit:* ${limitDisp}
│
├─ ·[ 💍 *R E L A T I O N S H I P* ]·
│
│ 💖 *Pasangan (Wa):* ${pasanganText}
│ 🌸 *Pasangan (Char):* ${pasText}
│
├─ ·[ 🪪 *C O N T A C T* ]·
│
│ 📞 *Nomor:* ${phoneNumber?.number?.international || phoneStr}
│ 💬 *About:* ${about}
│
╰─────────────────────
`.trim()

    await conn.sendMessage(m.chat, {
        text: str,
        contextInfo: {
            mentionedJid: conn.parseMention(str),
            externalAdReply: {
                title: "HuTao Bot",
                body: `Profile Info`,
                thumbnailUrl: pp,
                sourceUrl: 'https://whatsapp.com/channel/0029VatzpbmIyPtM90JWFJ1m',
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    })
}

handler.help = ['profile [@user]']
handler.tags = ['info']
handler.command = /^(profile|me|prof|profil)$/i

module.exports = handler
