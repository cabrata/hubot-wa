const { createCanvas, loadImage, registerFont } = require('canvas')
const axios = require('axios')

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
 * Get Gradient Based on Weather Condition
 */
function applyWeatherBackground(ctx, width, height, condition) {
    const grd = ctx.createLinearGradient(0, 0, width, height)
    
    // Fallback/Default: Cloudy/Neutral
    let colors = ['#bdc3c7', '#2c3e50'];

    if (condition) {
        let textCondition = condition.toLowerCase();
        if (textCondition.includes('clear')) {
            colors = ['#56CCF2', '#2F80ED']; // Sunny / Clear
        } else if (textCondition.includes('cloud')) {
            colors = ['#7F8C8D', '#34495E']; // Cloudy
        } else if (textCondition.includes('rain') || textCondition.includes('drizzle')) {
            colors = ['#3a7bd5', '#3a6073']; // Rainy
        } else if (textCondition.includes('thunderstorm') || textCondition.includes('storm')) {
            colors = ['#141E30', '#243B55']; // Storm
        } else if (textCondition.includes('snow')) {
            colors = ['#E0EAFC', '#CFDEF3']; // Snow
        } else if (['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'].includes(textCondition)) {
            colors = ['#BBD2C5', '#536976']; // Atmosphere
        }
    }

    grd.addColorStop(0, colors[0]);
    grd.addColorStop(1, colors[1]);
    
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
}

/**
 * Generate Cuaca Card
 */
async function generateCuacaCard(data) {
    const width = 800
    const height = 450 // Shorter than gempa since no map is needed

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Weather condition main text
    const condition = data.weather && data.weather.length > 0 ? data.weather[0].main : 'Unknown';
    const description = data.weather && data.weather.length > 0 ? data.weather[0].description : '';
    const iconCode = data.weather && data.weather.length > 0 ? data.weather[0].icon : null;

    // Apply Background
    applyWeatherBackground(ctx, width, height, condition);

    // Main Card overlay with slight transparency for a glassmorphism look
    const margin = 30
    const cardX = margin
    const cardY = margin
    const cardWidth = width - margin * 2
    const cardHeight = height - margin * 2

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 5
    drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 20, true, false)

    ctx.shadowColor = 'transparent' // Reset shadow for rest of elements

    // Fetch and Draw Weather Icon
    if (iconCode) {
        try {
            const iconUrl = `http://openweathermap.org/img/wn/${iconCode}@4x.png`;
            const iconBuffer = await fetchImageBuffer(iconUrl);
            const iconImg = await loadImage(iconBuffer);
            // Draw icon at the top right
            ctx.drawImage(iconImg, cardX + cardWidth - 180, cardY + 20, 150, 150);
        } catch (e) {
            console.error('Failed to load weather icon', e);
        }
    }

    // Texts Formatting
    // City Name
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 50px Arial'
    ctx.textAlign = 'left'
    let cityName = data.name;
    if (data.sys && data.sys.country) cityName += `, ${data.sys.country}`;
    ctx.fillText(cityName, cardX + 40, cardY + 80)

    // Current Date/Time
    ctx.font = '22px Arial'
    ctx.fillStyle = '#7F8C8D'
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date(data.dt * 1000).toLocaleDateString('id-ID', dateOpts);
    ctx.fillText(dateStr, cardX + 40, cardY + 115)

    // Temperature line
    ctx.fillStyle = '#E67E22'
    ctx.font = 'bold 70px Arial'
    const tempText = `${Math.round(data.main.temp)}°C`
    ctx.fillText(tempText, cardX + 40, cardY + 210)

    // Condition
    ctx.fillStyle = '#34495E'
    ctx.font = 'bold 30px Arial'
    // Capitalize first letter of description
    const descText = description.charAt(0).toUpperCase() + description.slice(1);
    ctx.fillText(descText, cardX + 40, cardY + 255)

    // Divider Line
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cardX + 40, cardY + 285)
    ctx.lineTo(cardX + cardWidth - 40, cardY + 285)
    ctx.stroke()

    // Bottom Stats
    const statsY = cardY + 330
    ctx.fillStyle = '#2C3E50'
    
    // Feels Like
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`${Math.round(data.main.feels_like)}°C`, cardX + 40, statsY)
    ctx.font = '18px Arial'
    ctx.fillStyle = '#7F8C8D'
    ctx.fillText('Terasa spt', cardX + 40, statsY + 30)

    // Humidity
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`${data.main.humidity}%`, cardX + 180, statsY)
    ctx.font = '18px Arial'
    ctx.fillStyle = '#7F8C8D'
    ctx.fillText('Kelembaban', cardX + 180, statsY + 30)

    // Wind Speed
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`${data.wind.speed} m/s`, cardX + 340, statsY)
    ctx.font = '18px Arial'
    ctx.fillStyle = '#7F8C8D'
    ctx.fillText('Angin', cardX + 340, statsY + 30)

    // Pressure
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`${data.main.pressure} hPa`, cardX + 480, statsY)
    ctx.font = '18px Arial'
    ctx.fillStyle = '#7F8C8D'
    ctx.fillText('Tekanan', cardX + 480, statsY + 30)

    return canvas.toBuffer('image/jpeg', { quality: 0.9 })
}

module.exports = {
    generateCuacaCard
}
