/**
 * Connection patch — Custom sendMessage with PTT waveform support
 * 
 * Intercepts audio/PTT messages to auto-generate waveform
 * before passing to the original sendMessage.
 */

const { createReadStream } = require('fs')

/**
 * Convert a readable stream to a Buffer
 */
async function toBuffer(stream) {
    const chunks = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

/**
 * Generate audio waveform data (64 samples) like WhatsApp does.
 * Requires `audio-decode` package.
 * 
 * @param {Buffer|string|import('stream').Readable} buffer - Audio data
 * @param {object} [logger] - Optional logger
 * @returns {Promise<Uint8Array|undefined>}
 */
async function getAudioWaveform(buffer, logger) {
    try {
        const { default: decoder } = await import('audio-decode')

        let audioData
        if (Buffer.isBuffer(buffer)) {
            audioData = buffer
        } else if (typeof buffer === 'string') {
            const rStream = createReadStream(buffer)
            audioData = await toBuffer(rStream)
        } else {
            audioData = await toBuffer(buffer)
        }

        const audioBuffer = await decoder(audioData)
        const rawData = audioBuffer.getChannelData(0)
        const samples = 64
        const blockSize = Math.floor(rawData.length / samples)
        const filteredData = []

        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i
            let sum = 0
            for (let j = 0; j < blockSize; j++) {
                sum = sum + Math.abs(rawData[blockStart + j])
            }
            filteredData.push(sum / blockSize)
        }

        const multiplier = Math.pow(Math.max(...filteredData), -1)
        const normalizedData = filteredData.map(n => n * multiplier)
        const waveform = new Uint8Array(normalizedData.map(n => Math.floor(100 * n)))

        return waveform
    } catch (e) {
        logger?.debug('Failed to generate waveform: ' + e)
    }
}

/**
 * Patch conn.sendMessage to auto-inject waveform for PTT audio messages.
 * 
 * When sending audio with `ptt: true`, if no waveform is provided,
 * this will automatically generate one from the audio buffer.
 * 
 * @param {object} conn - The WASocket connection object
 */
function patchSendMessage(conn) {
    const originalSendMessage = conn.sendMessage.bind(conn)

    conn.sendMessage = async (jid, content, options = {}) => {
        // Intercept PTT audio to inject waveform
        if (
            typeof content === 'object' &&
            content !== null &&
            'audio' in content &&
            content.ptt === true &&
            !content.waveform // Only generate if not already provided
        ) {
            try {
                const audioSource = content.audio
                let audioBuffer

                if (Buffer.isBuffer(audioSource)) {
                    audioBuffer = audioSource
                } else if (typeof audioSource === 'string') {
                    // File path
                    audioBuffer = audioSource
                } else if (audioSource?.url) {
                    // URL object — fetch it
                    const resp = await fetch(audioSource.url)
                    if (resp.ok) {
                        audioBuffer = Buffer.from(await resp.arrayBuffer())
                    }
                }

                if (audioBuffer) {
                    const waveform = await getAudioWaveform(audioBuffer)
                    if (waveform) {
                        content.waveform = waveform
                    }
                }
            } catch (e) {
                // Silently continue — waveform is optional
                console.debug?.('[CONN] Waveform generation failed:', e.message)
            }
        }

        return originalSendMessage(jid, content, options)
    }
}

module.exports = { patchSendMessage, getAudioWaveform }
