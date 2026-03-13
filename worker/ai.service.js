const mockPersona = {
    persona: "High Intent Buyer",
    confidence: 0.82,
    traits: [
        "Frequently visits pricing page",
        "Adds items to cart"
    ],
    summary: "A user showing strong purchase intent through repeated high-value actions."
};

async function generatePersona(userEvents) {
    console.log('Mocking AI persona generation...');
    return mockPersona;
}

module.exports = {
    generatePersona
};
