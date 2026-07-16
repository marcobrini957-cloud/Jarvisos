module.exports = {
  apps: [
    {
      name: 'velquor-term',
      script: '/opt/velquor-term/provisioner.js',
      cwd: '/opt/velquor-term',
      max_memory_restart: '200M',
      restart_delay: 2000,
    },
  ],
};
