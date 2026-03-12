const fs = require('fs')
const path = require('path')
const { generateGempaVideo } = require('../lib/gempaCanvas')

const sampleData = {
  "Tanggal": "12 Mar 2026",
  "Jam": "16:54:24 WIB",
  "DateTime": "2026-03-12T09:54:24+00:00",
  "Coordinates": "4.91,96.80",
  "Lintang": "4.91 LU",
  "Bujur": "96.80 BT",
  "Magnitude": "2.5",
  "Kedalaman": "10 km",
  "Wilayah": "Pusat gempa berada di darat 21 km Utara Kab. Bener Meriah",
  "Potensi": "Gempa ini dirasakan untuk diteruskan pada masyarakat",
  "Dirasakan": "II Bener Meriah",
  "Shakemap": "20260312165424.mmi.jpg"
}

async function run() {
    try {
        console.log("Generating canvas video...")
        const buffer = await generateGempaVideo(sampleData)
        const outputPath = path.join(__dirname, 'test_video.mp4')
        fs.writeFileSync(outputPath, buffer)
        console.log("Saved canvas image to", outputPath)
    } catch(err) {
        console.error("Error generating canvas:", err)
    }
}

run()
