const { createCanvas, loadImage } = require('canvas')
const axios = require('axios')

/**
 * Utility: Draw rounded rectangle path
 */
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

/**
 * Utility: Fetch image buffer from URL
 */
async function fetchImageBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(response.data, 'binary')
}

/**
 * Weather palette — rich, dark, atmospheric per condition
 */
function getWeatherTheme(condition) {
    const c = (condition || '').toLowerCase()

    if (c.includes('clear') || c.includes('sunny')) {
        return {
            bg: ['#1a1a2e', '#16213e', '#e8a838'],
            accent: '#F5C842',
            accentSoft: 'rgba(245,200,66,0.18)',
            label: 'rgba(255,255,255,0.55)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.7)',
            glow: 'rgba(245,200,66,0.35)',
            orb: 'rgba(245,200,66,0.12)',
        }
    }
    if (c.includes('cloud')) {
        return {
            bg: ['#1c2331', '#273346', '#3d5a7a'],
            accent: '#90AFC5',
            accentSoft: 'rgba(144,175,197,0.18)',
            label: 'rgba(255,255,255,0.5)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.65)',
            glow: 'rgba(144,175,197,0.3)',
            orb: 'rgba(144,175,197,0.1)',
        }
    }
    if (c.includes('rain') || c.includes('drizzle')) {
        return {
            bg: ['#0f0c29', '#1a1a4e', '#2d6a9f'],
            accent: '#4FC3F7',
            accentSoft: 'rgba(79,195,247,0.18)',
            label: 'rgba(255,255,255,0.5)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.65)',
            glow: 'rgba(79,195,247,0.35)',
            orb: 'rgba(79,195,247,0.1)',
        }
    }
    if (c.includes('thunderstorm') || c.includes('storm')) {
        return {
            bg: ['#0d0d0d', '#1a0533', '#4a0e8f'],
            accent: '#CE93D8',
            accentSoft: 'rgba(206,147,216,0.18)',
            label: 'rgba(255,255,255,0.5)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.65)',
            glow: 'rgba(206,147,216,0.4)',
            orb: 'rgba(206,147,216,0.1)',
        }
    }
    if (c.includes('snow')) {
        return {
            bg: ['#1a2a4a', '#2c4a7c', '#6fa8dc'],
            accent: '#E8F4FD',
            accentSoft: 'rgba(232,244,253,0.2)',
            label: 'rgba(255,255,255,0.55)',
            text: '#FFFFFF',
            subtext: 'rgba(255,255,255,0.75)',
            glow: 'rgba(200,230,255,0.35)',
            orb: 'rgba(200,230,255,0.12)',
        }
    }
    return {
        bg: ['#1a1a2e', '#2d3436', '#636e72'],
        accent: '#B2BEC3',
        accentSoft: 'rgba(178,190,195,0.18)',
        label: 'rgba(255,255,255,0.5)',
        text: '#FFFFFF',
        subtext: 'rgba(255,255,255,0.65)',
        glow: 'rgba(178,190,195,0.3)',
        orb: 'rgba(178,190,195,0.1)',
    }
}

function drawBackground(ctx, width, height, theme) {
    const grd = ctx.createLinearGradient(0, 0, width * 0.6, height)
    grd.addColorStop(0, theme.bg[0])
    grd.addColorStop(0.55, theme.bg[1])
    grd.addColorStop(1, theme.bg[2])
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, width, height)

    const radial = ctx.createRadialGradient(width * 0.85, height * 0.1, 0, width * 0.85, height * 0.1, width * 0.65)
    radial.addColorStop(0, theme.glow)
    radial.addColorStop(1, 'transparent')
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, width, height)

    const imageData = ctx.getImageData(0, 0, width, height)
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 18
        d[i]     = Math.min(255, Math.max(0, d[i]     + noise))
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise))
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise))
    }
    ctx.putImageData(imageData, 0, 0)
}

function drawDecorativeOrbs(ctx, width, height, theme) {
    const g1 = ctx.createRadialGradient(width*0.12, height*0.88, 0, width*0.12, height*0.88, width*0.42)
    g1.addColorStop(0, theme.orb)
    g1.addColorStop(1, 'transparent')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, width, height)

    const g2 = ctx.createRadialGradient(width*0.78, height*0.38, 0, width*0.78, height*0.38, width*0.28)
    g2.addColorStop(0, theme.accentSoft)
    g2.addColorStop(1, 'transparent')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, width, height)
}

function drawCornerBracket(ctx, x, y, size, color) {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + size, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + size*5.5, y + size*3.5)
    ctx.lineTo(x + size*6.5, y + size*3.5)
    ctx.lineTo(x + size*6.5, y + size*2.5)
    ctx.stroke()
}

function drawGlassBadge(ctx, x, y, w, h, r, text, textColor, theme) {
    ctx.save()
    roundRectPath(ctx, x, y, w, h, r)
    ctx.fillStyle = theme.accentSoft
    ctx.fill()
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = textColor
    ctx.font = 'bold 16px Georgia'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + w / 2, y + h / 2)
    ctx.restore()
}

async function drawIconCircle(ctx, cx, cy, radius, iconCode, theme) {
    ctx.save()
    ctx.shadowColor = theme.accent
    ctx.shadowBlur = 35
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = theme.accentSoft
    ctx.fill()
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()

    ctx.save()
    const innerGrad = ctx.createRadialGradient(cx - radius*0.2, cy - radius*0.2, 0, cx, cy, radius*0.9)
    innerGrad.addColorStop(0, 'rgba(255,255,255,0.12)')
    innerGrad.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = innerGrad
    ctx.fill()
    ctx.restore()

    if (iconCode) {
        try {
            const iconUrl = `http://openweathermap.org/img/wn/${iconCode}@4x.png`
            const iconBuffer = await fetchImageBuffer(iconUrl)
            const iconImg = await loadImage(iconBuffer)
            const iconSize = radius * 1.55
            ctx.drawImage(iconImg, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize)
        } catch (e) {
            console.error('Failed to load weather icon', e)
        }
    }
}

function drawStatBlock(ctx, x, y, glyph, value, label, theme) {
    const blockW = 145
    const blockH = 78

    ctx.save()
    roundRectPath(ctx, x, y, blockW, blockH, 14)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = theme.accent
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(glyph, x + 14, y + 12)

    ctx.fillStyle = theme.text
    ctx.font = 'bold 22px Georgia'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(value, x + 14, y + 50)

    ctx.fillStyle = theme.label
    ctx.font = '13px sans-serif'
    ctx.fillText(label, x + 14, y + 67)
}

function drawDottedLine(ctx, x1, y, x2, color) {
    ctx.save()
    ctx.setLineDash([3, 7])
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()
    ctx.restore()
}

async function generateCuacaCard(data) {
    const width  = 860
    const height = 480

    const canvas = createCanvas(width, height)
    const ctx    = canvas.getContext('2d')

    const condition   = data.weather?.[0]?.main        || 'Unknown'
    const description = data.weather?.[0]?.description || ''
    const iconCode    = data.weather?.[0]?.icon        || null
    const temp        = Math.round(data.main.temp)
    const feelsLike   = Math.round(data.main.feels_like)
    const humidity    = data.main.humidity
    const windSpeed   = data.wind.speed
    const pressure    = data.main.pressure
    const visibility  = data.visibility ? (data.visibility / 1000).toFixed(1) + ' km' : 'N/A'
    const cityName    = data.name + (data.sys?.country ? `, ${data.sys.country}` : '')

    const dateStr = new Date(data.dt * 1000).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const timeStr = new Date(data.dt * 1000).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
    })

    const theme = getWeatherTheme(condition)

    drawBackground(ctx, width, height, theme)
    drawDecorativeOrbs(ctx, width, height, theme)

    // Top accent line
    ctx.save()
    const topLine = ctx.createLinearGradient(0, 0, width, 0)
    topLine.addColorStop(0, 'transparent')
    topLine.addColorStop(0.3, theme.accent)
    topLine.addColorStop(0.7, theme.accent)
    topLine.addColorStop(1, 'transparent')
    ctx.strokeStyle = topLine
    ctx.lineWidth = 2.5
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(0, 3)
    ctx.lineTo(width, 3)
    ctx.stroke()
    ctx.restore()

    drawCornerBracket(ctx, 36, 30, 22, `${theme.accent}99`)

    const descCap = description.charAt(0).toUpperCase() + description.slice(1)
    drawGlassBadge(ctx, 36, 58, 175, 30, 8, `● ${descCap}`, theme.subtext, theme)

    // City name
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 12
    ctx.fillStyle = theme.text
    ctx.font = 'bold 44px Georgia'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(cityName, 36, 155)
    ctx.restore()

    // Date + time
    ctx.fillStyle = theme.subtext
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${dateStr}  ·  ${timeStr} WIB`, 36, 184)

    // Hero temperature
    ctx.save()
    ctx.shadowColor = theme.accent
    ctx.shadowBlur = 30
    ctx.fillStyle = theme.text
    ctx.font = 'bold 130px Georgia'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillText(`${temp}°`, 20, 330)
    ctx.restore()

    // "C" unit
    ctx.font = 'bold 130px Georgia'
    const tempWidth = ctx.measureText(`${temp}°`).width
    ctx.font = 'bold 30px Georgia'
    ctx.fillStyle = theme.accent
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('C', 20 + tempWidth + 4, 270)

    // Feels like
    ctx.fillStyle = theme.label
    ctx.font = '17px sans-serif'
    ctx.fillText(`Terasa seperti ${feelsLike}°C`, 36, 360)

    drawDottedLine(ctx, 36, 385, width - 36, theme.accent)

    // Stats row
    const statsY    = 400
    const statGap   = 158
    const statStart = 32

    drawStatBlock(ctx, statStart + statGap*0, statsY, '💧', `${humidity}%`,      'Kelembaban',  theme)
    drawStatBlock(ctx, statStart + statGap*1, statsY, '🌬️', `${windSpeed} m/s`, 'Angin',       theme)
    drawStatBlock(ctx, statStart + statGap*2, statsY, '🌡️', `${pressure} hPa`,  'Tekanan',     theme)
    drawStatBlock(ctx, statStart + statGap*3, statsY, '👁️', `${visibility}`,    'Visibilitas', theme)
    drawStatBlock(ctx, statStart + statGap*4, statsY, '🌡️', `${feelsLike}°C`,  'Feels Like',  theme)

    // Right-side icon circle
    await drawIconCircle(ctx, 695, 230, 115, iconCode, theme)

    // Condition label under icon
    ctx.save()
    ctx.fillStyle = theme.subtext
    ctx.font = 'bold 20px Georgia'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(condition, 695, 375)
    ctx.restore()

    // Watermark
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('OpenWeatherMap', width - 36, height - 14)
    ctx.restore()

    // Bottom accent line
    ctx.save()
    const botLine = ctx.createLinearGradient(0, 0, width, 0)
    botLine.addColorStop(0, 'transparent')
    botLine.addColorStop(0.3, theme.accent)
    botLine.addColorStop(0.7, theme.accent)
    botLine.addColorStop(1, 'transparent')
    ctx.strokeStyle = botLine
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(0, height - 3)
    ctx.lineTo(width, height - 3)
    ctx.stroke()
    ctx.restore()

    return canvas.toBuffer('image/jpeg', { quality: 0.95 })
}

module.exports = { generateCuacaCard }  