const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const vertex_ai = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'test-project',
    location: process.env.GCP_LOCATION || 'us-central1'
});

const model = 'gemini-1.5-flash';

async function generatePersona(userEvents) {
    const generativeModel = vertex_ai.getGenerativeModel({
        model: model,
        generationConfig: {
            responseMimeType: 'application/json'
        }
    });

    const prompt = `
    Based on the following user events (most recent first), generate a marketing persona JSON.
    Include:
    - "persona": a short descriptive tag
    - "confidence": a number between 0 and 1
    - "traits": an array of behavioral traits
    - "summary": a one sentence summary of the user's intent

    Events:
    ${JSON.stringify(userEvents, null, 2)}

    Return ONLY JSON.
    `;

    try {
        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const text = response.candidates[0].content.parts[0].text;
        return JSON.parse(text);
    } catch (error) {
        console.error('Error generating persona with Vertex AI:', error);
        throw error;
    }
}

module.exports = {
    generatePersona
};
