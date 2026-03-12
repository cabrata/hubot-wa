const { createCanvas, loadImage } = require('canvas')
const QRCode = require('qrcode')

// ─── Hu Tao Color Palette ───────────────────────────────────────────────────
const HT = {
    deepBlack:   '#0d0508',
    darkRed:     '#1a0508',
    crimson:     '#8B1A1A',
    red:         '#C0392B',
    brightRed:   '#E74C3C',
    fireOrange:  '#E8622A',
    amber:       '#F0A500',
    gold:        '#D4AF37',
    palePink:    '#FFBDC3',
    ghost:       'rgba(255, 200, 210, 0.15)',
    ghostBright: 'rgba(255, 220, 230, 0.35)',
    white:       '#FFF5F5',
    dimWhite:    'rgba(255, 245, 245, 0.65)',
}

// ─── Utility: Rounded Rect ──────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r }
    ctx.beginPath()
    ctx.moveTo(x + r.tl, y)
    ctx.lineTo(x + w - r.tr, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr)
    ctx.lineTo(x + w, y + h - r.br)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h)
    ctx.lineTo(x + r.bl, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl)
    ctx.lineTo(x, y + r.tl)
    ctx.quadraticCurveTo(x, y, x + r.tl, y)
    ctx.closePath()
    if (fill) ctx.fill()
    if (stroke) ctx.stroke()
}

// ─── Draw Plum Blossom ──────────────────────────────────────────────────────
function drawPlumBlossom(ctx, cx, cy, size, color = HT.gold, alpha = 0.5) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    for (let i = 0; i < 5; i++) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate((i * Math.PI * 2) / 5)
        ctx.beginPath()
        ctx.ellipse(0, -size * 0.6, size * 0.3, size * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
    ctx.fillStyle = HT.amber
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

// ─── Draw Ghost Butterfly ───────────────────────────────────────────────────
function drawButterfly(ctx, cx, cy, size, alpha = 0.35) {
    ctx.save()
    ctx.globalAlpha = alpha
    // upper wings
    const wg = ctx.createRadialGradient(cx - size * 0.4, cy - size * 0.2, 0, cx - size * 0.4, cy - size * 0.2, size * 0.6)
    wg.addColorStop(0, 'rgba(255, 200, 220, 0.9)')
    wg.addColorStop(1, 'rgba(180, 60, 90, 0.1)')
    ctx.fillStyle = wg
    ctx.beginPath()
    ctx.ellipse(cx - size * 0.4, cy - size * 0.15, size * 0.42, size * 0.28, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + size * 0.4, cy - size * 0.15, size * 0.42, size * 0.28, 0.5, 0, Math.PI * 2)
    ctx.fill()
    // lower wings
    ctx.globalAlpha = alpha * 0.7
    ctx.beginPath()
    ctx.ellipse(cx - size * 0.32, cy + size * 0.2, size * 0.28, size * 0.18, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + size * 0.32, cy + size * 0.2, size * 0.28, size * 0.18, 0.3, 0, Math.PI * 2)
    ctx.fill()
    // body
    ctx.globalAlpha = alpha + 0.2
    ctx.fillStyle = HT.gold
    ctx.beginPath()
    ctx.ellipse(cx, cy, size * 0.06, size * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

// ─── Draw Flame ─────────────────────────────────────────────────────────────
function drawFlame(ctx, cx, cy, w, h, alpha = 0.6) {
    ctx.save()
    ctx.globalAlpha = alpha
    const grad = ctx.createRadialGradient(cx, cy + h * 0.3, 0, cx, cy, h * 0.9)
    grad.addColorStop(0,   'rgba(255, 240, 80, 0.95)')
    grad.addColorStop(0.3, 'rgba(240, 130, 40, 0.85)')
    grad.addColorStop(0.7, 'rgba(180, 30,  20, 0.6)')
    grad.addColorStop(1,   'rgba(100, 0,   10, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(cx, cy - h)
    ctx.bezierCurveTo(cx + w * 0.6, cy - h * 0.6, cx + w * 0.8, cy - h * 0.2, cx + w * 0.5, cy + h * 0.3)
    ctx.bezierCurveTo(cx + w * 0.3, cy + h * 0.5, cx - w * 0.3, cy + h * 0.5, cx - w * 0.5, cy + h * 0.3)
    ctx.bezierCurveTo(cx - w * 0.8, cy - h * 0.2, cx - w * 0.6, cy - h * 0.6, cx, cy - h)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
}

// ─── Draw Gold Corner Ornament ───────────────────────────────────────────────
function drawCornerOrnament(ctx, x, y, size, flipX = false, flipY = false) {
    ctx.save()
    ctx.translate(x, y)
    if (flipX) ctx.scale(-1, 1)
    if (flipY) ctx.scale(1, -1)
    ctx.strokeStyle = HT.gold
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(size, 0)
    ctx.moveTo(0, 0)
    ctx.lineTo(0, size)
    ctx.stroke()
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 0.5)
    ctx.stroke()
    ctx.restore()
}

// ─── Draw Decorative Divider ────────────────────────────────────────────────
function drawDivider(ctx, cx, y, halfLen) {
    ctx.save()
    ctx.globalAlpha = 0.55
    const g = ctx.createLinearGradient(cx - halfLen, y, cx + halfLen, y)
    g.addColorStop(0,   'rgba(212, 175, 55, 0)')
    g.addColorStop(0.4, 'rgba(212, 175, 55, 1)')
    g.addColorStop(0.6, 'rgba(212, 175, 55, 1)')
    g.addColorStop(1,   'rgba(212, 175, 55, 0)')
    ctx.strokeStyle = g
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - halfLen, y)
    ctx.lineTo(cx + halfLen, y)
    ctx.stroke()
    // diamond center
    ctx.fillStyle = HT.gold
    ctx.globalAlpha = 0.75
    ctx.save()
    ctx.translate(cx, y)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-4, -4, 8, 8)
    ctx.restore()
    ctx.restore()
}

// ─── Background Hu Tao Scene ─────────────────────────────────────────────────
function drawHuTaoBackground(ctx, width, height) {
    // Deep dark bg
    const bg = ctx.createLinearGradient(0, 0, width * 0.6, height)
    bg.addColorStop(0,   '#0d0508')
    bg.addColorStop(0.4, '#1a0508')
    bg.addColorStop(0.8, '#1f0c0c')
    bg.addColorStop(1,   '#120308')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Subtle red vignette edges
    const vign = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, height * 0.85)
    vign.addColorStop(0, 'rgba(0,0,0,0)')
    vign.addColorStop(1, 'rgba(80,0,10,0.45)')
    ctx.fillStyle = vign
    ctx.fillRect(0, 0, width, height)

    // Scattered ghost dots (firefly-like)
    const dots = [
        [80, 120, 2.5], [520, 200, 1.8], [55, 400, 2], [540, 500, 2.2],
        [160, 700, 1.5], [440, 680, 1.8], [30, 600, 1.2], [570, 350, 1.5],
        [310, 50,  1.8], [490, 750, 1.2],
    ]
    dots.forEach(([dx, dy, dr]) => {
        ctx.save()
        ctx.globalAlpha = 0.3 + Math.random() * 0.2
        const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr * 4)
        dg.addColorStop(0, 'rgba(255,200,210,0.9)')
        dg.addColorStop(1, 'rgba(255,100,120,0)')
        ctx.fillStyle = dg
        ctx.beginPath()
        ctx.arc(dx, dy, dr * 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    })
}

// ════════════════════════════════════════════════════════════════════════════
//  createQrisCanvas  — Hu Tao QRIS Payment
// ════════════════════════════════════════════════════════════════════════════
async function createQrisCanvas(qrString, amount, orderId) {
    const width  = 620
    const height = 860
    const canvas = createCanvas(width, height)
    const ctx    = canvas.getContext('2d')

    // ── Background ──────────────────────────────────────────────────────────
    drawHuTaoBackground(ctx, width, height)

    // ── Decorative butterflies (bg layer) ──────────────────────────────────
    drawButterfly(ctx,  70,  90, 40, 0.18)
    drawButterfly(ctx, 545, 130, 35, 0.15)
    drawButterfly(ctx,  50, 720, 30, 0.13)
    drawButterfly(ctx, 560, 730, 28, 0.13)

    // ── Decorative plum blossoms (corners) ─────────────────────────────────
    drawPlumBlossom(ctx,  38,  38, 18, HT.gold,   0.35)
    drawPlumBlossom(ctx, 582,  38, 14, HT.gold,   0.28)
    drawPlumBlossom(ctx,  38, 822, 14, HT.gold,   0.28)
    drawPlumBlossom(ctx, 582, 822, 18, HT.gold,   0.35)
    drawPlumBlossom(ctx, 100, 145, 10, HT.amber,  0.22)
    drawPlumBlossom(ctx, 520, 145, 10, HT.amber,  0.22)

    // ── Corner ornaments ────────────────────────────────────────────────────
    drawCornerOrnament(ctx,  22,  22, 28)
    drawCornerOrnament(ctx, 598,  22, 28, true,  false)
    drawCornerOrnament(ctx,  22, 838, 28, false, true)
    drawCornerOrnament(ctx, 598, 838, 28, true,  true)

    // ── Outer gold border ───────────────────────────────────────────────────
    ctx.save()
    ctx.strokeStyle = HT.gold
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3
    roundRect(ctx, 12, 12, width - 24, height - 24, 6, false, true)
    ctx.restore()

    // ── Header area ─────────────────────────────────────────────────────────
    // Red panel with gold trim
    ctx.save()
    const headerGrad = ctx.createLinearGradient(0, 18, width, 120)
    headerGrad.addColorStop(0, 'rgba(100, 10, 15, 0.85)')
    headerGrad.addColorStop(1, 'rgba(50, 5, 10, 0.6)')
    ctx.fillStyle = headerGrad
    roundRect(ctx, 18, 18, width - 36, 110, { tl: 4, tr: 4, br: 0, bl: 0 }, true, false)
    ctx.strokeStyle = HT.gold
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(18, 128)
    ctx.lineTo(width - 18, 128)
    ctx.stroke()
    ctx.restore()

    // Header flames (flanking title)
    drawFlame(ctx, 110,  90, 18, 40, 0.65)
    drawFlame(ctx, 510,  90, 18, 40, 0.65)
    drawFlame(ctx,  70,  95, 12, 28, 0.4)
    drawFlame(ctx, 550,  95, 12, 28, 0.4)

    // "胡桃" kanji subtle watermark
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.fillStyle = HT.gold
    ctx.font = 'bold 90px serif'
    ctx.textAlign = 'center'
    ctx.fillText('胡桃', width / 2, 115)
    ctx.restore()

    // Title
    ctx.save()
    ctx.textAlign = 'center'
    ctx.shadowColor = HT.brightRed
    ctx.shadowBlur = 18
    const titleGrad = ctx.createLinearGradient(0, 48, 0, 90)
    titleGrad.addColorStop(0, '#FFE4A0')
    titleGrad.addColorStop(0.5, HT.gold)
    titleGrad.addColorStop(1, '#C8860A')
    ctx.fillStyle = titleGrad
    ctx.font = 'bold 30px serif'
    ctx.fillText('✦ QRIS PAYMENT ✦', width / 2, 78)
    ctx.shadowBlur = 0
    ctx.fillStyle = HT.dimWhite
    ctx.font = 'italic 15px serif'
    ctx.fillText('— Wangsheng Funeral Parlor Donation —', width / 2, 108)
    ctx.restore()

    drawDivider(ctx, width / 2, 140, 220)

    // ── QR Code white card ──────────────────────────────────────────────────
    ctx.save()
    // Outer glow
    ctx.shadowColor = 'rgba(180, 30, 30, 0.5)'
    ctx.shadowBlur   = 30
    ctx.shadowOffsetY = 6
    // Card bg — parchment-ish
    const cardGrad = ctx.createLinearGradient(105, 155, 515, 565)
    cardGrad.addColorStop(0, '#FFF8F0')
    cardGrad.addColorStop(1, '#FDE8D8')
    ctx.fillStyle = cardGrad
    roundRect(ctx, 105, 155, 410, 410, 16, true, false)
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    // Gold border on card
    ctx.strokeStyle = HT.gold
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.7
    roundRect(ctx, 105, 155, 410, 410, 16, false, true)
    ctx.restore()

    // Hu Tao symbol watermark inside QR card (plum blossoms)
    drawPlumBlossom(ctx, 160, 210,  14, '#C0392B', 0.15)
    drawPlumBlossom(ctx, 460, 210,  14, '#C0392B', 0.15)
    drawPlumBlossom(ctx, 160, 510,  14, '#C0392B', 0.15)
    drawPlumBlossom(ctx, 460, 510,  14, '#C0392B', 0.15)

    // QR Code
    const qrDataUrl = await QRCode.toDataURL(qrString, {
        width: 350,
        margin: 1,
        color: { dark: '#1A0508', light: '#FFF8F0' },
        errorCorrectionLevel: 'H',
    })
    const qrImage = await loadImage(qrDataUrl)
    ctx.drawImage(qrImage, 135, 178, 350, 350)

    // QRIS label inside card bottom
    ctx.save()
    ctx.fillStyle = '#8B1A1A'
    ctx.font = 'bold 13px serif'
    ctx.textAlign = 'center'
    ctx.fillText('◈ SCAN DENGAN E-WALLET / M-BANKING ◈', width / 2, 546)
    ctx.restore()

    drawDivider(ctx, width / 2, 590, 200)

    // ── Amount section ──────────────────────────────────────────────────────
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 245, 245, 0.55)'
    ctx.font = 'italic 15px serif'
    ctx.fillText('Total Pembayaran', width / 2, 618)

    // Amount with fire gradient
    const amtGrad = ctx.createLinearGradient(0, 628, 0, 685)
    amtGrad.addColorStop(0,   '#FFE88A')
    amtGrad.addColorStop(0.4, '#F0A500')
    amtGrad.addColorStop(0.8, '#E8622A')
    amtGrad.addColorStop(1,   '#C0392B')
    ctx.fillStyle = amtGrad
    ctx.shadowColor = 'rgba(230, 98, 42, 0.6)'
    ctx.shadowBlur  = 20
    ctx.font = 'bold 46px serif'
    ctx.fillText(`Rp ${amount.toLocaleString('id-ID')}`, width / 2, 674)
    ctx.shadowBlur = 0
    ctx.restore()

    // ── Order ID box ────────────────────────────────────────────────────────
    ctx.save()
    ctx.fillStyle = 'rgba(139, 26, 26, 0.25)'
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)'
    ctx.lineWidth = 1
    roundRect(ctx, 120, 692, width - 240, 38, 6, true, true)
    ctx.fillStyle = 'rgba(255, 245, 245, 0.55)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`ORDER ID : ${orderId}`, width / 2, 715)
    ctx.restore()

    drawDivider(ctx, width / 2, 748, 200)

    // ── Footer butterflies & text ────────────────────────────────────────────
    drawButterfly(ctx, width / 2 - 55, 790, 22, 0.28)
    drawButterfly(ctx, width / 2 + 55, 790, 22, 0.28)

    ctx.save()
    ctx.fillStyle = 'rgba(255, 245, 245, 0.4)'
    ctx.font = 'italic 12px serif'
    ctx.textAlign = 'center'
    ctx.fillText('Status otomatis dicek setiap 10 detik  •  Jangan tutup chat ini', width / 2, 770)
    ctx.fillStyle = 'rgba(212, 175, 55, 0.55)'
    ctx.font = 'italic 11px serif'
    ctx.fillText('✦ Hu Tao menjamin transaksimu sampai ke alam sana ✦', width / 2, 830)
    ctx.restore()

    return canvas.toBuffer('image/png')
}

// ════════════════════════════════════════════════════════════════════════════
//  createSuccessCanvas  — Hu Tao Success Screen
// ════════════════════════════════════════════════════════════════════════════
async function createSuccessCanvas(amount, userName) {
    const width  = 620
    const height = 480
    const canvas = createCanvas(width, height)
    const ctx    = canvas.getContext('2d')

    // ── Background ──────────────────────────────────────────────────────────
    drawHuTaoBackground(ctx, width, height)

    // Red triumph aura center glow
    ctx.save()
    const aura = ctx.createRadialGradient(width / 2, height * 0.38, 0, width / 2, height * 0.38, 200)
    aura.addColorStop(0,   'rgba(220, 50, 30, 0.35)')
    aura.addColorStop(0.5, 'rgba(150, 20, 15, 0.15)')
    aura.addColorStop(1,   'rgba(0, 0, 0, 0)')
    ctx.fillStyle = aura
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // ── Corner ornaments ────────────────────────────────────────────────────
    drawCornerOrnament(ctx,  22,  22, 28)
    drawCornerOrnament(ctx, 598,  22, 28, true,  false)
    drawCornerOrnament(ctx,  22, 458, 28, false, true)
    drawCornerOrnament(ctx, 598, 458, 28, true,  true)

    // ── Big flame burst ─────────────────────────────────────────────────────
    drawFlame(ctx, width / 2,     180, 80, 160, 0.7)
    drawFlame(ctx, width / 2 - 70, 200, 40,  80, 0.45)
    drawFlame(ctx, width / 2 + 70, 200, 40,  80, 0.45)
    drawFlame(ctx, width / 2 - 30, 185, 28,  60, 0.35)
    drawFlame(ctx, width / 2 + 30, 185, 28,  60, 0.35)

    // ── Ghost butterflies celebrating ───────────────────────────────────────
    drawButterfly(ctx, 120,  90,  50, 0.35)
    drawButterfly(ctx, 500,  90,  50, 0.35)
    drawButterfly(ctx,  60, 280,  35, 0.22)
    drawButterfly(ctx, 560, 280,  35, 0.22)
    drawButterfly(ctx, 200,  50,  25, 0.20)
    drawButterfly(ctx, 420,  50,  25, 0.20)

    // ── Plum blossoms ───────────────────────────────────────────────────────
    drawPlumBlossom(ctx,  30, 240, 18, HT.gold, 0.4)
    drawPlumBlossom(ctx, 590, 240, 18, HT.gold, 0.4)
    drawPlumBlossom(ctx,  50,  50, 12, HT.amber, 0.3)
    drawPlumBlossom(ctx, 570,  50, 12, HT.amber, 0.3)
    drawPlumBlossom(ctx, 310,  20, 10, HT.gold,  0.25)

    // ── Gold seal circle ─────────────────────────────────────────────────────
    ctx.save()
    // Outer ring
    ctx.strokeStyle = HT.gold
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.8
    ctx.shadowColor = HT.amber
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(width / 2, 140, 58, 0, Math.PI * 2)
    ctx.stroke()
    // Inner ring
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(width / 2, 140, 50, 0, Math.PI * 2)
    ctx.stroke()
    // Fill
    ctx.shadowBlur = 0
    const sealFill = ctx.createRadialGradient(width / 2, 115, 5, width / 2, 140, 50)
    sealFill.addColorStop(0, 'rgba(200, 60, 30, 0.6)')
    sealFill.addColorStop(1, 'rgba(80, 10, 10, 0.7)')
    ctx.fillStyle = sealFill
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(width / 2, 140, 49, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // ── Checkmark ────────────────────────────────────────────────────────────
    ctx.save()
    ctx.strokeStyle = '#FFE88A'
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = HT.amber
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(width / 2 - 22, 142)
    ctx.lineTo(width / 2 - 4,  162)
    ctx.lineTo(width / 2 + 26, 120)
    ctx.stroke()
    ctx.restore()

    drawDivider(ctx, width / 2, 218, 230)

    // ── "DONASI BERHASIL!" ───────────────────────────────────────────────────
    ctx.save()
    ctx.textAlign = 'center'
    const titleGrad = ctx.createLinearGradient(0, 228, 0, 270)
    titleGrad.addColorStop(0,   '#FFE88A')
    titleGrad.addColorStop(0.5, '#D4AF37')
    titleGrad.addColorStop(1,   '#C8860A')
    ctx.fillStyle = titleGrad
    ctx.shadowColor = 'rgba(200, 60, 20, 0.8)'
    ctx.shadowBlur  = 22
    ctx.font = 'bold 34px serif'
    ctx.fillText('✦ DONASI BERHASIL! ✦', width / 2, 260)
    ctx.shadowBlur = 0
    ctx.restore()

    // ── Amount ───────────────────────────────────────────────────────────────
    ctx.save()
    ctx.textAlign = 'center'
    const amtGrad = ctx.createLinearGradient(0, 270, 0, 315)
    amtGrad.addColorStop(0, '#FFE4A0')
    amtGrad.addColorStop(1, '#E8622A')
    ctx.fillStyle = amtGrad
    ctx.shadowColor = 'rgba(230, 98, 42, 0.5)'
    ctx.shadowBlur = 14
    ctx.font = 'bold 30px serif'
    ctx.fillText(`Rp ${amount.toLocaleString('id-ID')}`, width / 2, 310)
    ctx.shadowBlur = 0
    ctx.restore()

    drawDivider(ctx, width / 2, 330, 180)

    // ── Thank you ────────────────────────────────────────────────────────────
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = HT.dimWhite
    ctx.font = '19px serif'
    ctx.fillText(`Terima kasih, ${userName}!`, width / 2, 362)
    ctx.fillStyle = 'rgba(255, 200, 180, 0.55)'
    ctx.font = 'italic 13px serif'
    ctx.fillText('"Bahkan roh yang paling pelit pun tersentuh oleh kebaikanmu."', width / 2, 393)
    ctx.restore()

    drawDivider(ctx, width / 2, 418, 220)

    // ── Footer ───────────────────────────────────────────────────────────────
    drawButterfly(ctx, width / 2 - 60, 448, 20, 0.3)
    drawButterfly(ctx, width / 2 + 60, 448, 20, 0.3)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(212, 175, 55, 0.5)'
    ctx.font = 'italic 12px serif'
    ctx.fillText('— Wangsheng Funeral Parlor —', width / 2, 465)
    ctx.restore()

    return canvas.toBuffer('image/png')
}

// ════════════════════════════════════════════════════════════════════════════
//  Handler
// ════════════════════════════════════════════════════════════════════════════
let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!process.env.PAKASIR_PROJECT || !process.env.PAKASIR_KEY) {
        return m.reply(`❌ Fitur donasi belum dikonfigurasi.\n\n_Note untuk Owner: Silakan isi PAKASIR_PROJECT dan PAKASIR_KEY di file .env,_ \natau gunakan: *${usedPrefix}setenv PAKASIR_PROJECT=...* lalu restart bot.`)
    }

    if (!args[0]) {
        return m.reply(`Masukkan nominal donasi!\nContoh: *${usedPrefix + command} 10000*`)
    }

    let amount = parseInt(args[0].replace(/[^0-9]/g, ''))
    if (isNaN(amount) || amount < 1000) {
        return m.reply('❌ Minimal donasi adalah Rp 1.000')
    }

    let order_id = `DONASI-${m.sender.split('@')[0]}-${Date.now()}`
    await m.reply('⏳ Sedang membuat Invoice Donasi via QRIS...')

    try {
        let res = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: process.env.PAKASIR_PROJECT,
                order_id,
                amount,
                api_key: process.env.PAKASIR_KEY,
            }),
        })

        let json = await res.json()

        if (!res.ok || !json.payment || !json.payment.payment_number) {
            console.error('Pakasir Error:', json)
            return m.reply('❌ Gagal membuat transaksi donasi. Pastikan PAKASIR_PROJECT dan PAKASIR_KEY sudah benar.')
        }

        let qrString      = json.payment.payment_number
        let expiredAt     = new Date(json.payment.expired_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        let totalPayment  = json.payment.total_payment

        let qrisBuffer = await createQrisCanvas(qrString, totalPayment, order_id)

        let caption = `╭─「 *🕯️ INVOICE DONASI* 」
│ 🆔 *Order ID:* ${order_id}
│ 💰 *Nominal:* Rp ${amount.toLocaleString('id-ID')}
│ 💸 *Total:* Rp ${totalPayment.toLocaleString('id-ID')} (termasuk fee)
│ 🏦 *Metode:* QRIS Payment
│ ⏳ *Kadaluarsa:* ${expiredAt}
╰────

💡 _Scan QR di atas menggunakan e-wallet atau m-banking (GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, dll)._

_🕯️ Status otomatis dicek tiap 10 detik. Jangan tutup chat ini._`

        let msg = await conn.sendMessage(m.chat, { image: qrisBuffer, caption }, { quoted: m })

        let maxChecks = 60
        let checks    = 0

        let interval = setInterval(async () => {
            checks++
            if (checks > maxChecks) return clearInterval(interval)

            try {
                let statusRes  = await fetch(`https://app.pakasir.com/api/transactiondetail?project=${process.env.PAKASIR_PROJECT}&amount=${amount}&order_id=${order_id}&api_key=${process.env.PAKASIR_KEY}`)
                let statusJson = await statusRes.json()

                if (statusJson?.transaction?.status === 'completed') {
                    clearInterval(interval)
                    let completeMsg = `🎉 *DONASI BERHASIL!* 🎉\n\nTerima kasih *@${m.sender.split('@')[0]}* atas donasinya sebesar *Rp ${amount.toLocaleString('id-ID')}*!\n\n_"Bahkan roh yang paling pelit pun tersentuh oleh kebaikanmu."_ 🕯️`
                    let successBuffer = await createSuccessCanvas(amount, m.pushName || `@${m.sender.split('@')[0]}`)
                    await conn.sendMessage(m.chat, { image: successBuffer, caption: completeMsg, mentions: [m.sender] }, { quoted: msg })
                } else if (statusJson?.transaction?.status === 'cancelled') {
                    clearInterval(interval)
                }
            } catch (_) { /* ignore temporary errors */ }
        }, 10000)

    } catch (e) {
        console.error('Donasi Error:', e)
        m.reply('❌ Terjadi kesalahan sistem saat memproses permintaan donasi.')
    }
}

handler.help    = ['donasi <nominal>']
handler.tags    = ['main', 'info']
handler.command = /^(donasi|donate)$/i

module.exports = handler