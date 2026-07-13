module.exports = {
  apps: [
    {
      name: "bailian-kb-manager",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        COOKIE_SECURE: "false",  // HTTP 环境设为 false，HTTPS 设为 true
        // 其他环境变量...
        // ALIBABA_CLOUD_ACCESS_KEY_ID: "your-key",
        // ALIBABA_CLOUD_ACCESS_KEY_SECRET: "your-secret",
        // BAILIAN_WORKSPACE_ID: "your-workspace",
        // AUTH_JWT_SECRET: "your-secret",
        // ADMIN_USERNAME: "admin",
        // ADMIN_PASSWORD: "admin123456",
      },
    },
  ],
};

