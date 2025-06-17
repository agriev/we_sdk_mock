module.exports = {
  apps: [
    {
      name: 'app',
      script: '/app/build/server.js',
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES,
    },
  ],
};
