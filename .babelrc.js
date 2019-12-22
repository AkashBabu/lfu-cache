
module.exports = {
  presets: [
    '@babel/typescript',
    [
      '@babel/env',
      {
        modules: false,
        loose: true,
        target: {
          browsers: ['ie >= 11'],
          exclude: ['transform-async-to-generator', 'transform-regenerator'],
        }
      }
    ]
  ],
  plugins: [
      '@babel/plugin-transform-runtime'
  ],
}