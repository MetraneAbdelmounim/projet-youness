
module.exports = {

  HOST: process.env.HOST || 'localhost',
  PORT: process.env.PORT || 5000,
  bdUrl : (process.env.NODE_ENV=="production")?"mongodb://mongo:27017/mppt":"mongodb://127.0.0.1:27017/mppt",
  secret_token_key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ",
  token_expiration :"24h",
  PORT_PY:8000,
  HOST_PY: (process.env.NODE_ENV=="production")?"flask-service":"127.0.0.1",
  DATE_Licence : new Date('2025-02-15')

}
