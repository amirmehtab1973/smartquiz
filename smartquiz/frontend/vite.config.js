export default {
  root: "./frontend",
  server: {
    proxy: {
      "/upload": "http://localhost:3000",
      "/admin": "http://localhost:3000",
      "/quiz": "http://localhost:3000",
    },
  },
};
