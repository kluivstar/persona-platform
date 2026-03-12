const { VertexAI } = require('@google-cloud/vertexai');

const project = process.env.GOOGLE_CLOUD_PROJECT || 'test-project';
const location = 'us-central1';
const vertexAI = new VertexAI({ project: project, location: location });

const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
});

async function generatePersona(events) {
    const prompt = `
    Analyze the following user events and generate a comprehensive "Marketing Persona" JSON object.
    Include fields for:
    - user_summary: A brief description of the user.
    - interests: A list of inferred interests.
    - risk_of_churn: A value between 0 and 1.
    - marketing_segments: A list of applicable segments.
    - recommended_actions: A list of personalized recommendations.

    User Events:
    ${JSON.stringify(events, null, 2)}

    Return ONLY the JSON object.
  `;

    try {
        const resp = await generativeModel.generateContent(prompt);
        const content = resp.response.candidates[0].content.parts[0].text;

        // Improved JSON parsing (handling potential markdown formatting from LLM)
        const jsonStr = content.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Vertex AI Generation Error:', error);
        throw error;
    }
}

module.exports = { generatePersona };
