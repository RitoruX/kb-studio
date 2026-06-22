// pm2 process definition — keeps KB Studio running and restarts it on crash/reboot.
//   npm run serve     (start + persist)
//   pm2 startup       (once, to relaunch on boot — pm2 prints a command to run)
module.exports = {
  apps: [
    {
      name: 'kb-studio',
      script: 'server/index.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      // server/index.js loads .env itself, so no extra args are needed
    },
  ],
};
