const express = require('express');
const bodyParser = require('body-parser');
const eventRoutes = require('./routes/event.routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Routes
app.use('/api/v1', eventRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

module.exports = app; // For testing
