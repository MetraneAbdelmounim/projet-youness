const Modem = require('./modem');
const deviceController = require('../shared/deviceController');

module.exports = deviceController({
  Model: Modem,
  param: 'idModem',
  sheetName: 'modems',
  filename: 'modems.xlsx',
  labels: { singular: 'modem', Singular: 'Modem', plural: 'modem(s)', key: 'modem' },
});
