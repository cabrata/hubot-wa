const { createCanvas, loadImage, registerFont } = require('canvas')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

/**
 * Draws rounded rectangle
 */
function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') {
        radius = 5
    }
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius }
    } else {
        var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side]
        }
    }
    ctx.beginPath()
    ctx.moveTo(x + radius.tl, y)
    ctx.lineTo(x + width - radius.tr, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
    ctx.lineTo(x + width, y + height - radius.br)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
    ctx.lineTo(x + radius.bl, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
    ctx.lineTo(x, y + radius.tl)
    ctx.quadraticCurveTo(x, y, x + radius.tl, y)
    ctx.closePath()
    if (fill) {
        ctx.fill()
    }
    if (stroke) {
        ctx.stroke()
    }
}

/**
 * Function to fetch image buffer
 */
async function fetchImageBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(response.data, 'binary')
}

/**
 * Generate a single frame
 */
async function generateGempaFrame(data, mapImg, progress) {
    const width = 800
    const height = 600

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = '#F0F2F5'
    ctx.fillRect(0, 0, width, height)

    // Main Card
    const margin = 20
    const cardX = margin
    const cardY = margin
    const cardWidth = width - margin * 2
    const cardHeight = height - margin * 2

    ctx.fillStyle = '#FFFFFF'
    ctx.shadowColor = 'rgba(0,0,0,0.1)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 4
    drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 15, true, false)

    ctx.shadowColor = 'transparent'

    // Header text
    ctx.font = 'bold 36px Arial'
    ctx.fillStyle = '#FF9800'
    ctx.textAlign = 'center'
    ctx.fillText('Gempabumi Dirasakan', width / 2, cardY + 50)

    ctx.font = 'bold 24px Arial'
    ctx.fillStyle = '#2C3E50'
    ctx.fillText(`${data.Tanggal}, ${data.Jam}`, width / 2, cardY + 95)

    const mapWidth = cardWidth
    const mapHeight = 300
    const mapY = cardY + 120

    // Draw Map
    ctx.save()
    ctx.beginPath()
    ctx.rect(cardX, mapY, mapWidth, mapHeight)
    ctx.clip()
    ctx.drawImage(mapImg, cardX, mapY, mapWidth, mapHeight)

    // Animation specific logic
    const pulse = Math.sin(progress * Math.PI)
    const centerX = cardX + mapWidth / 2
    const centerY = mapY + mapHeight / 2

    // Red radius circle (Animated)
    const baseRadius = 40
    const animatedRadius = baseRadius + (pulse * 20)
    const alpha = 0.6 - (pulse * 0.4)

    ctx.beginPath()
    ctx.arc(centerX, centerY, animatedRadius, 0, 2 * Math.PI)
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.4})`
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`
    ctx.stroke()

    // Blue marker pin (Static)
    ctx.beginPath()
    ctx.moveTo(centerX, centerY + 10)
    ctx.bezierCurveTo(centerX + 20, centerY - 20, centerX + 20, centerY - 40, centerX, centerY - 40)
    ctx.bezierCurveTo(centerX - 20, centerY - 40, centerX - 20, centerY - 20, centerX, centerY + 10)
    ctx.fillStyle = '#3498DB'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()

    // pin hole
    ctx.beginPath()
    ctx.arc(centerX, centerY - 25, 6, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.restore()

    // Stats Section Background
    const statsY = mapY + mapHeight
    const statsHeight = cardHeight - (statsY - cardY)

    ctx.fillStyle = '#F8F9F9'
    ctx.beginPath()
    ctx.moveTo(cardX, statsY)
    ctx.lineTo(cardX + cardWidth, statsY)
    ctx.lineTo(cardX + cardWidth, statsY + statsHeight - 15)
    ctx.quadraticCurveTo(cardX + cardWidth, statsY + statsHeight, cardX + cardWidth - 15, statsY + statsHeight)
    ctx.lineTo(cardX + 15, statsY + statsHeight)
    ctx.quadraticCurveTo(cardX, statsY + statsHeight, cardX, statsY + statsHeight - 15)
    ctx.closePath()
    ctx.fill()

    // Borders / dividers
    const thirdW = cardWidth / 3
    ctx.strokeStyle = '#D5DBDB'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cardX + thirdW, statsY + 15)
    ctx.lineTo(cardX + thirdW, statsY + statsHeight - 15)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cardX + thirdW * 2, statsY + 15)
    ctx.lineTo(cardX + thirdW * 2, statsY + statsHeight - 15)
    ctx.stroke()

    // Texts
    ctx.fillStyle = '#2C3E50'

    // Column 1
    ctx.font = 'bold 30px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${data.Magnitude}`, cardX + thirdW / 2, statsY + 50)
    ctx.font = '20px Arial'
    ctx.fillStyle = '#7F8C8D'
    ctx.fillText('Magnitudo', cardX + thirdW / 2, statsY + 80)

    // Column 2
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 30px Arial'
    ctx.fillText(`${data.Kedalaman}`, cardX + thirdW + thirdW / 2, statsY + 50)
    ctx.font = '20px Arial'
    ctx.fillStyle = '#7F8C8D'
    ctx.fillText('Kedalaman', cardX + thirdW + thirdW / 2, statsY + 80)

    // Column 3
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`${data.Lintang}`, cardX + thirdW * 2 + thirdW / 2, statsY + 45)
    ctx.fillText(`${data.Bujur}`, cardX + thirdW * 2 + thirdW / 2, statsY + 75)

    return canvas.toBuffer('image/jpeg', { quality: 0.9 })
}

/**
 * Generate Gempa Video MP4 Buffer
 */
async function generateGempaVideo(data) {
    // 1. Fetch map image ONCE
    const lonLat = data.Coordinates.split(',')
    const lat = parseFloat(lonLat[0])
    const lon = parseFloat(lonLat[1])
    const mapUrl = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=600,300&z=6&l=map&lang=id_ID` // Added lang=en_US

    let mapImg;
    try {
        const mapBuffer = await fetchImageBuffer(mapUrl)
        mapImg = await loadImage(mapBuffer)
    } catch (e) {
        console.error('Failed to load static map image', e)
        const dummyCanvas = createCanvas(600, 300)
        const dummyCtx = dummyCanvas.getContext('2d')
        dummyCtx.fillStyle = '#EAEAEA'
        dummyCtx.fillRect(0, 0, 600, 300)
        dummyCtx.fillStyle = '#777'
        dummyCtx.font = '20px Arial'
        dummyCtx.fillText('Maps could not be loaded', 200, 150)
        mapImg = await loadImage(dummyCanvas.toBuffer())
    }

    // 2. Setup tmp dir
    const tmpDir = path.join(__dirname, '..', 'tmp', `gempa_${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    // 3. Generate frames
    const totalFrames = 60 // 2 seconds animation at 30 fps
    for (let i = 0; i < totalFrames; i++) {
        const progress = i / (totalFrames - 1)
        const buffer = await generateGempaFrame(data, mapImg, progress)
        fs.writeFileSync(path.join(tmpDir, `frame_${i.toString().padStart(3, '0')}.jpg`), buffer)
    }

    // 4. Run ffmpeg
    const outputMp4 = path.join(tmpDir, 'output.mp4')
    await execPromise(`ffmpeg -y -framerate 30 -i "${path.join(tmpDir, 'frame_%03d.jpg')}" -c:v libx264 -pix_fmt yuv420p "${outputMp4}"`)

    // 5. Read output
    const videoBuffer = fs.readFileSync(outputMp4)

    // 6. Cleanup
    for (let i = 0; i < totalFrames; i++) {
        fs.unlinkSync(path.join(tmpDir, `frame_${i.toString().padStart(3, '0')}.jpg`))
    }
    fs.unlinkSync(outputMp4)
    fs.rmdirSync(tmpDir)

    return videoBuffer
}

module.exports = {
    generateGempaVideo
}
