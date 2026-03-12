const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');

router.post('/events', eventController.ingestEvent);
router.get('/persona/:userId', eventController.getPersona);

module.exports = router;
