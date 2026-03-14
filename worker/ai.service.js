const { generatePersona: vertexGeneratePersona } = require('./ai');

async function generatePersona(userEvents) {
    const count = userEvents ? userEvents.length : 0;
    console.log(`[AI Service] Analyzing ${count} events for persona generation...`);
    
    // Log Vertex request sent
    console.log(`[AI Service] Vertex AI Request sent for ${count} events.`);
    
    let personaData = null;
    try {
        personaData = await vertexGeneratePersona(userEvents);
        
        // Log Vertex response received
        console.log(`[AI Service] Vertex AI Response received:`, JSON.stringify(personaData));

        if (!personaData || !personaData.user_summary) {
             throw new Error("Empty or invalid response from Vertex AI");
        }
        
    } catch (err) {
        console.warn(`[AI Service] Vertex AI failed, using fallback rule-based persona. Error:`, err.message);
        
        personaData = {
            user_summary: "A general user based on fallback rules.",
            interests: ["General Usage"],
            risk_of_churn: 0.5,
            marketing_segments: ["General Audience"],
            recommended_actions: ["Send welcome email"]
        };
    }

    return {
        persona: personaData.user_summary || "Unknown Persona",
        confidence: personaData.risk_of_churn ? (1 - personaData.risk_of_churn) : 0.5,
        traits: personaData.interests || ["Unknown traits"],
        summary: personaData.user_summary || ""
    };
}

module.exports = {
    generatePersona
};
