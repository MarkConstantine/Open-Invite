module.exports = {
  extends: "eslint:recommended",
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  parser: "babel-eslint",
  rules: {
    semi: [2, "always"],
  },
};
