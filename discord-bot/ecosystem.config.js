module.exports = {
  apps: [{
    name: "newhopeggn-bot",
    script: "bot.js",
    watch: false,
    restart_delay: 3000,
    max_restarts: 50,
    autorestart: true,
    env_file: ".env",
  }],
};
