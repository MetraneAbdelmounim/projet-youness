module.exports = {
  darkMode: 'class', // not 'media'
  content: [
    './src/**/*.{html,js,ts}',
    './node_modules/flowbite/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
      'custom-navy': '#011A42'
    }
    },
  },
  plugins: [
    require('flowbite/plugin'),
  ],
  experimental: {
    optimizeUniversalDefaults: true, // réduit les appels aux fonctions modernes comme oklch
  },
};
