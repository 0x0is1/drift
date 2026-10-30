module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
          alias: {
            "@": "./src",
            "@app": "./src/app",
            "@components": "./src/components",
            "@screens": "./src/screens",
            "@contexts": "./src/contexts",
            "@lib": "./src/lib",
            "@constants": "./src/constants",
            "@theme": "./src/theme",
            "@hooks": "./src/hooks",
            "@types": "./src/types",
          },
        },
      ],
    ],
  };
};
