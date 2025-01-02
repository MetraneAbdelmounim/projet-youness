
module.exports = {

  HOST: process.env.HOST || 'localhost',
  PORT: process.env.PORT || 5000,
  bdUrl : "mongodb://mongo:27017/mppt",
  secret_token_key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ",
  token_expiration :"24h",
  PORT_PY:8000,
  HOST_PY : "flask-service",
  DATE_Licence : new Date('2025-01-10')
}
