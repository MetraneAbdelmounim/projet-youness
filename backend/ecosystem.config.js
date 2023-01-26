module.exports = {
    apps : [
        {
            name: "backend",
            script: "./app.js",
            watch: true,
            env: {
                "PORT": 5000,
                "NODE_ENV": "development"
            },
            env_production: {
                "PORT": 5000,
                "NODE_ENV": "production",
            }
        }
    ]
}