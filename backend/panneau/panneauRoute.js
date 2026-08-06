const deviceRoute = require('../shared/deviceRoute');
const panneauController = require('./panneauController');

module.exports = deviceRoute(panneauController, 'idPanneau');
