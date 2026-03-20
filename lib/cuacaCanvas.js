const { createCanvas, loadImage } = require('canvas')
const axios = require('axios')

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

async function fetchImageBuffer(url) {
    const res = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(res.data, 'binary')
}

/**
 * Draw text that auto-shrinks to fit maxWidth.
 * Returns the final font size used.
 */
function fitText(ctx, text, x, y, maxWidth, startSize, minSize, fontStyle) {
    let size = startSize
    while (size >= minSize) {
        ctx.font = `${fontStyle} ${size}px sans-serif`
        if (ctx.measureText(text).width <= maxWidth) break
        size -= 1
    }
    ctx.fillText(text, x, y)
    return size
}

// ─────────────────────────────────────────
//  Theme
// ─────────────────────────────────────────

function getWeatherTheme(condition) {
    const c = (condition || '').toLowerCase()

    if (c.includes('clear') || c.includes('sunny'))
        return {
            bg: ['#12122a', '#1a1e45', '#c47b0a'],
            accent: '#F5C842',
            accentSoft: 'rgba(245,200,66,0.15)',
            glow: 'rgba(245,200,66,0.32)',
            orb: 'rgba(245,200,66,0.10)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.68)',
            label: 'rgba(255,255,255,0.50)',
        }
    if (c.includes('cloud'))
        return {
            bg: ['#1c2331', '#273346', '#3d5a7a'],
            accent: '#90AFC5',
            accentSoft: 'rgba(144,175,197,0.15)',
            glow: 'rgba(144,175,197,0.28)',
            orb: 'rgba(144,175,197,0.09)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.65)',
            label: 'rgba(255,255,255,0.48)',
        }
    if (c.includes('rain') || c.includes('drizzle'))
        return {
            bg: ['#0f0c29', '#1a1a4e', '#1e5d9f'],
            accent: '#4FC3F7',
            accentSoft: 'rgba(79,195,247,0.15)',
            glow: 'rgba(79,195,247,0.32)',
            orb: 'rgba(79,195,247,0.09)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.65)',
            label: 'rgba(255,255,255,0.48)',
        }
    if (c.includes('thunderstorm') || c.includes('storm'))
        return {
            bg: ['#0d0d0d', '#1a0533', '#3a0a7a'],
            accent: '#CE93D8',
            accentSoft: 'rgba(206,147,216,0.15)',
            glow: 'rgba(206,147,216,0.38)',
            orb: 'rgba(206,147,216,0.09)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.65)',
            label: 'rgba(255,255,255,0.48)',
        }
    if (c.includes('snow'))
        return {
            bg: ['#1a2a4a', '#2c4a7c', '#5a8fcc'],
            accent: '#cce8fd',
            accentSoft: 'rgba(200,230,255,0.18)',
            glow: 'rgba(200,230,255,0.32)',
            orb: 'rgba(200,230,255,0.11)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.72)',
            label: 'rgba(255,255,255,0.52)',
        }
    // mist / fog / haze / default
    return {
        bg: ['#1a1a2e', '#2d3436', '#4a5568'],
        accent: '#B2BEC3',
        accentSoft: 'rgba(178,190,195,0.15)',
        glow: 'rgba(178,190,195,0.28)',
        orb: 'rgba(178,190,195,0.09)',
        text: '#FFFFFF',
        subtext: 'rgba(255,255,255,0.65)',
        label: 'rgba(255,255,255,0.48)',
    }
}

// ─────────────────────────────────────────
//  Background layers
// ─────────────────────────────────────────

function drawBackground(ctx, W, H, theme) {
    // Base gradient
    const grd = ctx.createLinearGradient(0, 0, W * 0.55, H)
    grd.addColorStop(0,    theme.bg[0])
    grd.addColorStop(0.55, theme.bg[1])
    grd.addColorStop(1,    theme.bg[2])
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, W, H)

    // Atmospheric glow upper-right
    const rad = ctx.createRadialGradient(W * 0.84, H * 0.10, 0, W * 0.84, H * 0.10, W * 0.62)
    rad.addColorStop(0, theme.glow)
    rad.addColorStop(1, 'transparent')
    ctx.fillStyle = rad
    ctx.fillRect(0, 0, W, H)

    // Subtle film grain
    const img = ctx.getImageData(0, 0, W, H)
    const d   = img.data
    for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 16
        d[i]   = Math.min(255, Math.max(0, d[i]   + n))
        d[i+1] = Math.min(255, Math.max(0, d[i+1] + n))
        d[i+2] = Math.min(255, Math.max(0, d[i+2] + n))
    }
    ctx.putImageData(img, 0, 0)
}

function drawOrbs(ctx, W, H, theme) {
    const o1 = ctx.createRadialGradient(W*0.1, H*0.9, 0, W*0.1, H*0.9, W*0.4)
    o1.addColorStop(0, theme.orb); o1.addColorStop(1, 'transparent')
    ctx.fillStyle = o1; ctx.fillRect(0, 0, W, H)

    const o2 = ctx.createRadialGradient(W*0.77, H*0.36, 0, W*0.77, H*0.36, W*0.26)
    o2.addColorStop(0, theme.accentSoft); o2.addColorStop(1, 'transparent')
    ctx.fillStyle = o2; ctx.fillRect(0, 0, W, H)
}

// ─────────────────────────────────────────
//  Decorative elements
// ─────────────────────────────────────────

function drawAccentLines(ctx, W, H, accent) {
    const mkGrad = (y) => {
        const g = ctx.createLinearGradient(0, y, W, y)
        g.addColorStop(0,    'transparent')
        g.addColorStop(0.25, accent)
        g.addColorStop(0.75, accent)
        g.addColorStop(1,    'transparent')
        return g
    }
    ctx.save()
    ctx.globalAlpha = 0.65; ctx.lineWidth = 2.5
    ctx.strokeStyle = mkGrad(3); ctx.beginPath(); ctx.moveTo(0,3); ctx.lineTo(W,3); ctx.stroke()
    ctx.globalAlpha = 0.45; ctx.lineWidth = 2
    ctx.strokeStyle = mkGrad(H-3); ctx.beginPath(); ctx.moveTo(0,H-3); ctx.lineTo(W,H-3); ctx.stroke()
    ctx.restore()
}

function drawCornerBracket(ctx, x, y, size, color) {
    ctx.save()
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'
    // top-left
    ctx.beginPath(); ctx.moveTo(x+size, y); ctx.lineTo(x, y); ctx.lineTo(x, y+size); ctx.stroke()
    ctx.restore()
}

function drawDottedLine(ctx, x1, y, x2, color) {
    ctx.save()
    ctx.setLineDash([3, 7]); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.3
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    ctx.restore()
}

// ─────────────────────────────────────────
//  Badge (condition pill)
// ─────────────────────────────────────────

function drawBadge(ctx, x, y, text, theme) {
    ctx.save()
    ctx.font = 'bold 14px sans-serif'
    const tw   = ctx.measureText(text).width
    const padX = 14, padY = 8
    const bw   = tw + padX * 2
    const bh   = 14 + padY * 2

    roundRectPath(ctx, x, y, bw, bh, 8)
    ctx.fillStyle   = theme.accentSoft; ctx.fill()
    ctx.strokeStyle = theme.accent; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.stroke()
    ctx.globalAlpha = 1

    ctx.fillStyle    = theme.subtext
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(text, x + padX, y + bh / 2)
    ctx.restore()
}

// ─────────────────────────────────────────
//  Weather icon circle
// ─────────────────────────────────────────

async function drawIconCircle(ctx, cx, cy, R, iconCode, theme) {
    // Glow halo
    ctx.save()
    ctx.shadowColor = theme.accent; ctx.shadowBlur = 40
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = theme.accentSoft; ctx.fill()
    ctx.strokeStyle = theme.accent; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.globalAlpha = 1; ctx.restore()

    // Inner sheen
    ctx.save()
    const sh = ctx.createRadialGradient(cx - R*0.2, cy - R*0.2, 0, cx, cy, R*0.92)
    sh.addColorStop(0, 'rgba(255,255,255,0.13)'); sh.addColorStop(1, 'transparent')
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = sh; ctx.fill(); ctx.restore()

    // Icon image
    if (iconCode) {
        try {
            const buf = await fetchImageBuffer(`http://openweathermap.org/img/wn/${iconCode}@4x.png`)
            const img = await loadImage(buf)
            const sz  = R * 1.6
            ctx.drawImage(img, cx - sz/2, cy - sz/2, sz, sz)
        } catch (e) { console.error('Icon load failed', e) }
    }
}

// ─────────────────────────────────────────
//  Stat block — text auto-fits
// ─────────────────────────────────────────

function drawStatBlock(ctx, x, y, bw, bh, symbol, value, label, theme) {
    // Glass card
    ctx.save()
    roundRectPath(ctx, x, y, bw, bh, 12)
    ctx.fillStyle   = 'rgba(255,255,255,0.07)'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.11)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.restore()

    const innerW = bw - 24   // usable text width
    const lx     = x + 12

    // Symbol (small ascii, no emoji)
    ctx.save()
    ctx.fillStyle    = theme.accent
    ctx.font         = 'bold 13px sans-serif'
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'left'
    ctx.fillText(symbol, lx, y + 11)
    ctx.restore()

    // Value — auto-shrink from 20px down to 12px
    ctx.save()
    ctx.fillStyle    = theme.text
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'left'
    fitText(ctx, value, lx, y + bh - 24, innerW, 20, 12, 'bold')
    ctx.restore()

    // Label — auto-shrink from 12px down to 10px
    ctx.save()
    ctx.fillStyle    = theme.label
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'left'
    fitText(ctx, label, lx, y + bh - 10, innerW, 12, 10, 'normal')
    ctx.restore()
}

// ─────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────

async function generateCuacaCard(data) {
    const W = 860
    const H = 480

    const canvas = createCanvas(W, H)
    const ctx    = canvas.getContext('2d')

    // ── extract data ──────────────────────────
    const condition   = data.weather?.[0]?.main        || 'Unknown'
    const description = data.weather?.[0]?.description || ''
    const iconCode    = data.weather?.[0]?.icon        || null
    const temp        = Math.round(data.main.temp)
    const feelsLike   = Math.round(data.main.feels_like)
    const humidity    = data.main.humidity
    const windSpeed   = data.wind?.speed ?? 0
    const pressure    = data.main.pressure
    const visibility  = data.visibility != null
                        ? (data.visibility / 1000).toFixed(1) + ' km'
                        : 'N/A'
    const cityName    = data.name + (data.sys?.country ? `, ${data.sys.country}` : '')

    const dtMs   = (data.dt ?? Math.floor(Date.now() / 1000)) * 1000
    const dateStr = new Date(dtMs).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const timeStr = new Date(dtMs).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
    })

    const theme = getWeatherTheme(condition)

    // ── background ────────────────────────────
    drawBackground(ctx, W, H, theme)
    drawOrbs(ctx, W, H, theme)

    // ── accent lines ──────────────────────────
    drawAccentLines(ctx, W, H, theme.accent)

    // ── corner bracket ────────────────────────
    drawCornerBracket(ctx, 36, 30, 20, theme.accent + '88')

    // ── condition badge ───────────────────────
    const descCap = description ? description.charAt(0).toUpperCase() + description.slice(1) : condition
    drawBadge(ctx, 36, 54, `* ${descCap}`, theme)

    // ── city name (auto-shrink for long names) ─
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 12
    ctx.fillStyle    = theme.text
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    fitText(ctx, cityName, 36, 152, 480, 42, 24, 'bold')
    ctx.restore()

    // ── date + time ───────────────────────────
    ctx.save()
    ctx.fillStyle = theme.subtext; ctx.font = '17px sans-serif'
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    // Auto-shrink date if too wide
    fitText(ctx, `${dateStr}  ·  ${timeStr} WIB`, 36, 182, 520, 17, 12, 'normal')
    ctx.restore()

    // ── hero temperature ──────────────────────
    // Measure temp text to position "C" correctly
    ctx.font = 'bold 122px sans-serif'
    const tempStr   = `${temp}\u00B0`
    const tempWidth = ctx.measureText(tempStr).width

    ctx.save()
    ctx.shadowColor = theme.accent; ctx.shadowBlur = 28
    ctx.fillStyle    = theme.text
    ctx.font         = 'bold 122px sans-serif'
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.fillText(tempStr, 20, 325)
    ctx.restore()

    // "C" unit label
    ctx.save()
    ctx.fillStyle    = theme.accent
    ctx.font         = 'bold 28px sans-serif'
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.fillText('C', 20 + tempWidth + 4, 268)
    ctx.restore()

    // ── feels like ────────────────────────────
    ctx.save()
    ctx.fillStyle = theme.label; ctx.font = '16px sans-serif'
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.fillText(`Terasa seperti ${feelsLike}\u00B0C`, 36, 356)
    ctx.restore()

    // ── separator ─────────────────────────────
    drawDottedLine(ctx, 36, 380, W - 36, theme.accent)

    // ── stats ─────────────────────────────────
    // 5 cards distributed evenly in left 2/3 of canvas
    // Icon circle occupies right side (cx=705)
    // Available width for stats: 36 to ~650 → 614px
    const STATS = [
        { sym: '~',  val: `${humidity}%`,       lbl: 'Kelembaban'  },
        { sym: '>>',  val: `${windSpeed} m/s`,   lbl: 'Angin'       },
        { sym: 'P',  val: `${pressure} hPa`,     lbl: 'Tekanan'     },
        { sym: '@',  val: visibility,             lbl: 'Visibilitas' },
        { sym: 'T',  val: `${feelsLike}\u00B0C`, lbl: 'Feels Like'  },
    ]

    const statsAreaW = 614
    const statGap    = 8
    const statBH     = 76
    const statBW     = Math.floor((statsAreaW - statGap * (STATS.length - 1)) / STATS.length)
    const statsY     = H - statBH - 18

    STATS.forEach((s, i) => {
        const sx = 36 + i * (statBW + statGap)
        drawStatBlock(ctx, sx, statsY, statBW, statBH, s.sym, s.val, s.lbl, theme)
    })

    // ── icon circle ───────────────────────────
    const iconCX = 718
    const iconCY = 215
    const iconR  = 108
    await drawIconCircle(ctx, iconCX, iconCY, iconR, iconCode, theme)

    // Condition text under icon
    ctx.save()
    ctx.fillStyle    = theme.subtext
    ctx.font         = 'bold 18px sans-serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(condition, iconCX, iconCY + iconR + 26)
    ctx.restore()

    // ── watermark ─────────────────────────────
    ctx.save()
    ctx.fillStyle    = 'rgba(255,255,255,0.16)'
    ctx.font         = '12px sans-serif'
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('OpenWeatherMap', W - 36, H - 14)
    ctx.restore()

    return canvas.toBuffer('image/jpeg', { quality: 0.95 })
}

module.exports = { generateCuacaCard }