const { Router } = require('express');
const router = Router();

// GET /api/countries → active countries only
router.get('/countries', (req, res, next) => {
  // TODO: implement via customerController.getCountries
  next();
});

// GET /api/packages?countryId=X → active canonical packages
router.get('/packages', (req, res, next) => {
  // TODO: implement via customerController.getPackages
  next();
});

module.exports = router;
