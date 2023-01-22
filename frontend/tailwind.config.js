module.exports = {
  purge: [
    './src/**/*.html',
    './src/**/*.js',
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      zIndex: {
        '-1': '-1',
      },
      flexGrow: {
        '5' : '5'
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
