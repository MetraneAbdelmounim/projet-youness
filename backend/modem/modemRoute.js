const deviceRoute = require('../shared/deviceRoute');
const modemController = require('./modemController');

module.exports = deviceRoute(modemController, 'idModem');
