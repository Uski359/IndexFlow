module.exports = {
  'frontend/**/*.{ts,tsx,js,jsx}': (files) => {
    if (files.length === 0) {
      return [];
    }

    return 'npm run lint --workspace frontend -- --fix';
  },
  'backend/**/*.{ts,tsx,js,jsx}': (files) => {
    if (files.length === 0) {
      return [];
    }

    return 'npm run lint --workspace backend -- --fix';
  },
  'contracts/**/*.{ts,tsx,js,jsx}': (files) => {
    if (files.length === 0) {
      return [];
    }

    return 'npm run lint --workspace contracts';
  }
};
