const lintStagedConfig = {
    "*.{js,jsx,ts,tsx}": ["eslint --quiet --fix", "prettier --write"],
    "*.{json,css,md,html}": ["prettier --write"],
};

export default lintStagedConfig;
