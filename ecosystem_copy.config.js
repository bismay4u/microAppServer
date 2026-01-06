module.exports = {
  apps : [{
    name: 'HyperApps',
    script: 'index.js',
    instances : '1',
    watch: ["plugins/*"],
    exec_mode : "cluster",
    max_memory_restart: '1G',
    autorestart: true,
    env: {
        "NODE_ENV": "production",
        "NODE_NO_WARNINGS": 1
    }
  }]
};
