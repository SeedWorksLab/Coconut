const { expo } = require('./app.json');

module.exports = {
  expo: process.env.EXPO_PUBLIC_COCONUT_HOSTED_WEB === '1'
    ? {
        ...expo,
        experiments: { ...expo.experiments, baseUrl: '/apps/coconut/web' },
      }
    : expo,
};
