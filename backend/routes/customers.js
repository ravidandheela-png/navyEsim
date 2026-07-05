const { Router } = require('express');
const router = Router();
const customerController = require('../controllers/customerController');

// GET /api/countries → active countries only
router.get('/countries', customerController.getCountries);

// GET /api/packages?countryId=X → active canonical packages
router.get('/packages', customerController.getPackages);

module.exports = router;
