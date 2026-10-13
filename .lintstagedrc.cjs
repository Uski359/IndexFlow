const quoteFile = (file) => `"${file.replace(/"/gu, '\\"')}"`;

const eslintTask = (files) =>
  `pnpm exec eslint --fix ${files.map(quoteFile).join(' ')}`;

const solhintTask = (files) =>
  `pnpm --dir contracts exec solhint ${files.map(quoteFile).join(' ')}`;

module.exports = {
  'apps/**/*.{ts,tsx,js,jsx}': eslintTask,
  'packages/**/*.{ts,tsx,js,jsx}': eslintTask,
  'scripts/**/*.{ts,tsx,js,jsx}': eslintTask,
  'contracts/**/*.{ts,tsx,js,jsx}': eslintTask,
  'contracts/**/*.sol': solhintTask
};
