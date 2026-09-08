module.exports = {
  apps: [
    {
      name: "VrudhiTabEnroll",
      script: "serve",
      args: ["-s", "build", "-l", "8035"], // -s = serve static, build folder, port 3000
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};


