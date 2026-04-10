const lintStagedConfig = {
  "*.{js,jsx,ts,tsx}": ["oxlint --fix", "oxfmt --write"],
  "*.{json,css,md,html}": ["oxfmt --write"],
};

export default lintStagedConfig;
