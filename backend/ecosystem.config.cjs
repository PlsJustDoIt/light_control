module.exports = {
  apps: [{
    name: 'light-control-backend',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5002,
      TUYA_ACCESS_ID: "4n8wp4rc4qxuqgfraw3d",
      TUYA_ACCESS_SECRET: "ea470f3a447548ac8e87572d2cca1c29",
      TUYA_DEVICE_ID: "563014713c71bf25e0a9",
      TUYA_DATA_CENTER: "https://openapi.tuyaeu.com"
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};