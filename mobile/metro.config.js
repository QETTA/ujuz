const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const { resolveRequest } = config.resolver;

config.resolver.platforms = ['web', 'native', 'ios', 'android'];
config.resolver.resolveRequest = (context, moduleName, platform, moduleNameRedirects) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/native-stubs/react-native-maps.web.tsx'),
    };
  }

  return resolveRequest(context, moduleName, platform, moduleNameRedirects);
};

module.exports = withNativeWind(config, {
  input: './global.css',
});
