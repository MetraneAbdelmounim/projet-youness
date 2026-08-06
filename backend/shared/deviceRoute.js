const express = require('express');
const licenceGuard = require('../middlewares/licenceGuard');
const { uploadSpreadsheet } = require('../middlewares/upload');
const { authenticate, requireAdmin, requireProjectAccess } = require('../middlewares/auth');

/** Standard route table for a device controller built by `deviceController`. */
module.exports = function deviceRoute(controller, param) {
  const router = express.Router();

  router.use(licenceGuard, authenticate);

  // Declared before '/:param' so a literal path is never taken as an id — the
  // previous ordering made GET /export resolve to "fetch the site with id
  // 'export'" instead of the export handler.
  router.get('/export', requireAdmin, controller.exportAll);
  router.get('/status/:ip', controller.getStatus);
  router.get('/projects/:idProject', requireProjectAccess(), controller.getByProject);

  router.post('', requireAdmin, controller.add);
  router.post('/file', requireAdmin, uploadSpreadsheet, controller.addFromFile);
  router.get('', controller.getAll);

  router.delete(`/:${param}`, requireAdmin, controller.remove);
  router.put(`/:${param}`, requireAdmin, controller.update);

  return router;
};
