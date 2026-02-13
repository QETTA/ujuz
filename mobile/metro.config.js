const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['web', 'native', 'ios', 'android'];

module.exports = withNativeWind(config, {
  input: './global.css',
});
