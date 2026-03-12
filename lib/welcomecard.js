const { createCanvas, loadImage, CanvasRenderingContext2D } = require('canvas')

// Polyfill for roundRect in older canvas versions
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    }
}

// Helper: hex to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

// Helper: draw a glowing circle
function drawGlow(ctx, x, y, radius, color, blur = 40, alpha = 0.35) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius)
    grd.addColorStop(0, hexToRgba(color, alpha))
    grd.addColorStop(1, hexToRgba(color, 0))
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()
}

// Helper: dot grid pattern
function drawDotGrid(ctx, width, height, color, spacing = 28, dotRadius = 1.2) {
    ctx.fillStyle = color
    for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
            ctx.beginPath()
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
            ctx.fill()
        }
    }
}

// Helper: thin diagonal lines
function drawDiagonalLines(ctx, width, height, color, gap = 40) {
    ctx.strokeStyle = color
    ctx.lineWidth = 0.5
    for (let i = -height; i < width + height; i += gap) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + height, height)
        ctx.stroke()
    }
}

/**
 * Draw background: custom image or default dark gradient.
 * backgroundUrl  - URL / path to image (optional)
 * backgroundBlur - blur radius in px, default 6 (only when image is provided)
 * backgroundDim  - 0–1 darkness overlay on top of image, default 0.55
 * backgroundFit  - 'cover' | 'stretch' | 'center', default 'cover'
 */
async function drawBackground(ctx, W, H, opts) {
    const {
        backgroundUrl,
        backgroundBlur = 6,
        backgroundDim = 0.55,
        backgroundFit = 'cover',
        colorMain,
        colorAccent
    } = opts

    if (backgroundUrl) {
        // ── CUSTOM IMAGE BACKGROUND ─────────────────────────────────────────────
        let bgImage
        try {
            bgImage = await loadImage(backgroundUrl)
        } catch (e) {
            bgImage = null
        }

        if (bgImage) {
            ctx.save()

            // Apply blur filter before drawing
            if (backgroundBlur > 0) {
                ctx.filter = `blur(${backgroundBlur}px)`
            }

            // Draw image with chosen fit mode
            if (backgroundFit === 'stretch') {
                ctx.drawImage(bgImage, 0, 0, W, H)
            } else if (backgroundFit === 'center') {
                // Draw centered, no scaling
                const x = (W - bgImage.width) / 2
                const y = (H - bgImage.height) / 2
                ctx.drawImage(bgImage, x, y)
            } else {
                // 'cover' — scale to fill, crop excess (like CSS background-size: cover)
                const scale = Math.max(W / bgImage.width, H / bgImage.height)
                const sw = bgImage.width * scale
                const sh = bgImage.height * scale
                const sx = (W - sw) / 2
                const sy = (H - sh) / 2
                // Expand slightly to avoid blur edge artifacts
                ctx.drawImage(bgImage, sx - backgroundBlur * 2, sy - backgroundBlur * 2,
                    sw + backgroundBlur * 4, sh + backgroundBlur * 4)
            }

            ctx.filter = 'none'
            ctx.restore()

            // Dark vignette / dim overlay so text stays readable
            const dimOverlay = ctx.createLinearGradient(0, 0, W, H)
            dimOverlay.addColorStop(0, `rgba(0,0,0,${Math.min(backgroundDim + 0.1, 1)})`)
            dimOverlay.addColorStop(0.5, `rgba(0,0,0,${backgroundDim})`)
            dimOverlay.addColorStop(1, `rgba(0,0,0,${Math.min(backgroundDim + 0.1, 1)})`)
            ctx.fillStyle = dimOverlay
            ctx.fillRect(0, 0, W, H)

            // Subtle color tint from colorMain over the image
            const tintGrd = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.7)
            tintGrd.addColorStop(0, hexToRgba(colorMain, 0.08))
            tintGrd.addColorStop(1, hexToRgba(colorAccent || colorMain, 0.04))
            ctx.fillStyle = tintGrd
            ctx.fillRect(0, 0, W, H)

            // Keep dot grid on top of image for texture cohesion
            drawDotGrid(ctx, W, H, 'rgba(255,255,255,0.04)', 30, 1)
            return
        }
    }

    // ── DEFAULT DARK GRADIENT BACKGROUND ────────────────────────────────────────
    const bgGrd = ctx.createLinearGradient(0, 0, W, H)
    bgGrd.addColorStop(0, '#07080d')
    bgGrd.addColorStop(0.5, '#0c0e17')
    bgGrd.addColorStop(1, '#08090e')
    ctx.fillStyle = bgGrd
    ctx.fillRect(0, 0, W, H)

    drawDiagonalLines(ctx, W, H, 'rgba(255,255,255,0.018)', 36)
    drawDotGrid(ctx, W, H, 'rgba(255,255,255,0.06)', 30, 1)
}

async function drawCard(opts) {
    const {
        username,
        groupname,
        avatarUrl,
        memberCount,
        titleText,
        colorMain,
        colorAccent
    } = opts

    const W = 1100
    const H = 480
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    // ── BACKGROUND ──────────────────────────────────────────────────────────────
    await drawBackground(ctx, W, H, opts)

    // ── AMBIENT GLOW BLOBS ───────────────────────────────────────────────────────
    drawGlow(ctx, W * 0.12, H * 0.3, 260, colorMain, 60, 0.18)
    drawGlow(ctx, W * 0.82, H * 0.72, 200, colorAccent || colorMain, 60, 0.14)
    drawGlow(ctx, W / 2, H * 0.38, 180, colorMain, 40, 0.12)

    // ── GLASS CARD PANEL ────────────────────────────────────────────────────────
    const cardX = 42
    const cardY = 38
    const cardW = W - 84
    const cardH = H - 76
    const cardR = 28

    // Card drop shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 12
    ctx.fillStyle = 'rgba(0,0,0,0.01)'
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR)
    ctx.fill()
    ctx.restore()

    // Glass fill
    const glassFill = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH)
    glassFill.addColorStop(0, 'rgba(255,255,255,0.055)')
    glassFill.addColorStop(0.5, 'rgba(255,255,255,0.03)')
    glassFill.addColorStop(1, 'rgba(255,255,255,0.05)')
    ctx.fillStyle = glassFill
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR)
    ctx.fill()

    // Card inner glow border
    ctx.save()
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR)
    ctx.clip()

    // Top-left highlight edge
    const edgeGrd = ctx.createLinearGradient(cardX, cardY, cardX + cardW * 0.6, cardY + cardH * 0.5)
    edgeGrd.addColorStop(0, hexToRgba(colorMain, 0.3))
    edgeGrd.addColorStop(0.4, hexToRgba(colorMain, 0.07))
    edgeGrd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = edgeGrd
    ctx.lineWidth = 1.5
    ctx.roundRect(cardX + 0.75, cardY + 0.75, cardW - 1.5, cardH - 1.5, cardR)
    ctx.stroke()
    ctx.restore()

    // ── LEFT DECORATIVE STRIPE ───────────────────────────────────────────────────
    const stripeGrd = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
    stripeGrd.addColorStop(0, hexToRgba(colorMain, 0))
    stripeGrd.addColorStop(0.3, hexToRgba(colorMain, 0.8))
    stripeGrd.addColorStop(0.7, hexToRgba(colorMain, 0.8))
    stripeGrd.addColorStop(1, hexToRgba(colorMain, 0))
    ctx.fillStyle = stripeGrd
    ctx.fillRect(cardX, cardY + cardH * 0.25, 3, cardH * 0.5)

    // ── AVATAR SECTION ───────────────────────────────────────────────────────────
    const avatarSize = 168
    const avatarX = W / 2
    const avatarY = 188

    // Outer glow ring
    const ringGrd = ctx.createRadialGradient(avatarX, avatarY, avatarSize / 2 - 4, avatarX, avatarY, avatarSize / 2 + 22)
    ringGrd.addColorStop(0, hexToRgba(colorMain, 0.9))
    ringGrd.addColorStop(0.5, hexToRgba(colorMain, 0.35))
    ringGrd.addColorStop(1, hexToRgba(colorMain, 0))
    ctx.beginPath()
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 22, 0, Math.PI * 2)
    ctx.fillStyle = ringGrd
    ctx.fill()

    // Rotating-style dashed decorative ring (static dashes)
    ctx.save()
    ctx.translate(avatarX, avatarY)
    ctx.rotate(-Math.PI / 6)
    ctx.beginPath()
    ctx.arc(0, 0, avatarSize / 2 + 14, 0, Math.PI * 2)
    ctx.setLineDash([6, 10])
    ctx.lineWidth = 1.5
    ctx.strokeStyle = hexToRgba(colorMain, 0.45)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Solid colored ring
    ctx.beginPath()
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 5, 0, Math.PI * 2)
    ctx.lineWidth = 3
    const ringStroke = ctx.createLinearGradient(
        avatarX - avatarSize / 2, avatarY - avatarSize / 2,
        avatarX + avatarSize / 2, avatarY + avatarSize / 2
    )
    ringStroke.addColorStop(0, colorMain)
    ringStroke.addColorStop(0.5, colorAccent || colorMain)
    ringStroke.addColorStop(1, colorMain)
    ctx.strokeStyle = ringStroke
    ctx.stroke()

    // Dark circle behind avatar
    ctx.beginPath()
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 2, 0, Math.PI * 2)
    ctx.fillStyle = '#0c0e17'
    ctx.fill()

    // Clip and draw avatar image
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    try {
        const avatar = await loadImage(avatarUrl)
        ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize)
    } catch (e) {
        // Fallback placeholder
        const fallbackGrd = ctx.createLinearGradient(
            avatarX - avatarSize / 2, avatarY - avatarSize / 2,
            avatarX + avatarSize / 2, avatarY + avatarSize / 2
        )
        fallbackGrd.addColorStop(0, '#1e2030')
        fallbackGrd.addColorStop(1, '#2a2d3e')
        ctx.fillStyle = fallbackGrd
        ctx.fillRect(avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.font = 'bold 56px Georgia'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', avatarX, avatarY)
    }
    ctx.restore()

    // ── TITLE TEXT ───────────────────────────────────────────────────────────────
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // "WELCOME TO" label with pill background
    const titleW = 260
    const titleH = 34
    const titleLabelX = W / 2 - titleW / 2
    const titleLabelY = 284

    // Pill bg for title
    const pillGrd = ctx.createLinearGradient(titleLabelX, 0, titleLabelX + titleW, 0)
    pillGrd.addColorStop(0, hexToRgba(colorMain, 0))
    pillGrd.addColorStop(0.3, hexToRgba(colorMain, 0.18))
    pillGrd.addColorStop(0.7, hexToRgba(colorMain, 0.18))
    pillGrd.addColorStop(1, hexToRgba(colorMain, 0))
    ctx.fillStyle = pillGrd
    ctx.roundRect(titleLabelX, titleLabelY, titleW, titleH, titleH / 2)
    ctx.fill()

    ctx.font = 'bold 16px "Courier New", monospace'
    ctx.letterSpacing = '4px'
    ctx.fillStyle = hexToRgba(colorMain, 0.9)
    ctx.fillText(titleText.toUpperCase(), W / 2, titleLabelY + 22)
    ctx.letterSpacing = '0px'

    // ── GROUP NAME ───────────────────────────────────────────────────────────────
    let displayGroup = groupname.length > 22 ? groupname.substring(0, 22) + '…' : groupname

    // Group name shadow / glow
    ctx.save()
    ctx.shadowColor = hexToRgba(colorMain, 0.6)
    ctx.shadowBlur = 22
    const groupGrd = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0)
    groupGrd.addColorStop(0, '#ffffff')
    groupGrd.addColorStop(0.4, colorMain)
    groupGrd.addColorStop(0.7, colorAccent || colorMain)
    groupGrd.addColorStop(1, '#ffffff')
    ctx.fillStyle = groupGrd
    ctx.font = 'bold 52px Georgia, serif'
    ctx.fillText(displayGroup.toUpperCase(), W / 2, 350)
    ctx.restore()

    // ── DIVIDER LINE ─────────────────────────────────────────────────────────────
    const divW = 320
    const divY = 370
    const divGrd = ctx.createLinearGradient(W / 2 - divW / 2, 0, W / 2 + divW / 2, 0)
    divGrd.addColorStop(0, 'rgba(255,255,255,0)')
    divGrd.addColorStop(0.3, hexToRgba(colorMain, 0.7))
    divGrd.addColorStop(0.5, '#ffffff')
    divGrd.addColorStop(0.7, hexToRgba(colorMain, 0.7))
    divGrd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = divGrd
    ctx.fillRect(W / 2 - divW / 2, divY, divW, 1)

    // ── USERNAME + MEMBER TAG ────────────────────────────────────────────────────
    let displayUser = username.length > 22 ? username.substring(0, 22) + '…' : username

    ctx.font = '22px "Courier New", monospace'
    ctx.fillStyle = 'rgba(200,210,230,0.75)'

    // Center dot separator
    const memberTag = `✦  ${displayUser}  ·  Member #${memberCount}  ✦`
    ctx.fillText(memberTag, W / 2, 408)

    // ── BOTTOM BADGE ─────────────────────────────────────────────────────────────
    const badgeY = cardY + cardH - 18
    ctx.font = '11px "Courier New", monospace'
    ctx.fillStyle = hexToRgba(colorMain, 0.3)
    ctx.fillText('◆  VERIFIED MEMBER', W / 2, badgeY)

    // ── CORNER DECORATIONS ───────────────────────────────────────────────────────
    // Four corner accent brackets
    const cornerSize = 18
    const cPad = 18
    ctx.strokeStyle = hexToRgba(colorMain, 0.5)
    ctx.lineWidth = 2

    // Top-left
    ctx.beginPath()
    ctx.moveTo(cardX + cPad + cornerSize, cardY + cPad)
    ctx.lineTo(cardX + cPad, cardY + cPad)
    ctx.lineTo(cardX + cPad, cardY + cPad + cornerSize)
    ctx.stroke()

    // Top-right
    ctx.beginPath()
    ctx.moveTo(cardX + cardW - cPad - cornerSize, cardY + cPad)
    ctx.lineTo(cardX + cardW - cPad, cardY + cPad)
    ctx.lineTo(cardX + cardW - cPad, cardY + cPad + cornerSize)
    ctx.stroke()

    // Bottom-left
    ctx.beginPath()
    ctx.moveTo(cardX + cPad + cornerSize, cardY + cardH - cPad)
    ctx.lineTo(cardX + cPad, cardY + cardH - cPad)
    ctx.lineTo(cardX + cPad, cardY + cardH - cPad - cornerSize)
    ctx.stroke()

    // Bottom-right
    ctx.beginPath()
    ctx.moveTo(cardX + cardW - cPad - cornerSize, cardY + cardH - cPad)
    ctx.lineTo(cardX + cardW - cPad, cardY + cardH - cPad)
    ctx.lineTo(cardX + cardW - cPad, cardY + cardH - cPad - cornerSize)
    ctx.stroke()

    return canvas.toBuffer('image/png')
}

/**
 * @param {string} username
 * @param {string} groupname
 * @param {string} avatarUrl
 * @param {number} memberCount
 * @param {object} [options]
 * @param {string} [options.backgroundUrl]   - URL or local path to a background image
 * @param {number} [options.backgroundBlur]  - Blur amount in px (default: 6)
 * @param {number} [options.backgroundDim]   - Darkness overlay 0–1 (default: 0.55)
 * @param {string} [options.backgroundFit]   - 'cover' | 'stretch' | 'center' (default: 'cover')
 * @param {string} [options.colorMain]       - Override main accent color
 * @param {string} [options.colorAccent]     - Override secondary accent color
 */
async function createWelcome(username, groupname, avatarUrl, memberCount, options = {}) {
    return drawCard({
        username,
        groupname,
        avatarUrl,
        memberCount,
        titleText: 'WELCOME TO',
        colorMain: options.colorMain || '#00C8FF',
        colorAccent: options.colorAccent || '#7B61FF',
        ...options
    })
}

/**
 * @param {string} username
 * @param {string} groupname
 * @param {string} avatarUrl
 * @param {number} memberCount
 * @param {object} [options]
 * @param {string} [options.backgroundUrl]   - URL or local path to a background image
 * @param {number} [options.backgroundBlur]  - Blur amount in px (default: 6)
 * @param {number} [options.backgroundDim]   - Darkness overlay 0–1 (default: 0.55)
 * @param {string} [options.backgroundFit]   - 'cover' | 'stretch' | 'center' (default: 'cover')
 * @param {string} [options.colorMain]       - Override main accent color
 * @param {string} [options.colorAccent]     - Override secondary accent color
 */
async function createLeave(username, groupname, avatarUrl, memberCount, options = {}) {
    return drawCard({
        username,
        groupname,
        avatarUrl,
        memberCount,
        titleText: 'GOODBYE FROM',
        colorMain: options.colorMain || '#FF5C40',
        colorAccent: options.colorAccent || '#FF9F40',
        ...options
    })
}

module.exports = {
    createWelcome,
    createLeave,
    drawCard   // export for full custom usage
}