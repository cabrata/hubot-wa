const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const ai = new GoogleGenAI({ apiKey: "AIzaSyB6nCLk251gcMcVUs3bGkUhBI0jmpRm0g8" });

module.exports = async function generateImage(str, buffer) {
    const base64Image = buffer.toString('base64');

    // Prepare the content parts
    const contents = [
        { text: str },
        {
            inlineData: {
                mimeType: 'image/png',
                data: base64Image
            }
        }
    ];

    try {
        // Set responseModalities to include "Image" so the model can generate an image
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp-image-generation',
            contents: contents,
            config: {
                responseModalities: ['Text', 'Image']
            },
        });
        for (const part of response.candidates[0].content.parts) {
            // Based on the part type, either show the text or save the image
            if (part.text) {
                console.log(part.text);
            } else if (part.inlineData) {
                const imageData = part.inlineData.data;
                const buffer = Buffer.from(imageData, 'base64');
                return buffer
            }
        }
    } catch (error) {
        throw error;
        console.error("Error generating content:", error);
    }
}