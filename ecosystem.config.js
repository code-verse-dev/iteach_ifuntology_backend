module.exports = {
  apps: [
    {
      name: "iteach_ifuntology_backend",
      script: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "customdev",
      },
    },
  ],
};