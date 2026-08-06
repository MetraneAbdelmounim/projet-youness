const Panneau = require('./panneau');
const deviceController = require('../shared/deviceController');

module.exports = deviceController({
  Model: Panneau,
  param: 'idPanneau',
  sheetName: 'panneaux',
  filename: 'panneaux.xlsx',
  labels: { singular: 'panneau', Singular: 'Panneau', plural: 'panneau(x)', key: 'panneau' },
});
