// Commit messages must follow Conventional Commits: they drive automatic release versions (see releaserc.toml).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 150],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
