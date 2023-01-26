
module.exports = {

  HOST: process.env.HOST || 'localhost',
  PORT: process.env.PORT || 5000,
  bdUrl : process.env.NODE_ENV=='production' ?"mongodb://mongo:27017/mppt": "mongodb://127.0.0.1:27017/mppt",
  secret_token_key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ",
  token_expiration :"24h",
  mppt_api:process.env.NODE_ENV=='production' ? "http://mppt-service:8000/mppt/" :"http://127.0.0.1:8000/mppt/"
}
