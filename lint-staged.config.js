const lintStagedConfig = {
  "*.{js,jsx,ts,tsx}": [
    "oxlint --fix --config oxlint.config.ts",
    "oxfmt --write",
  ],
  "*.{json,css,md,html}": ["oxfmt --write"],
};

export default lintStagedConfig;
