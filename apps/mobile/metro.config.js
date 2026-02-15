const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Deduplicate packages that must be singletons in pnpm hoisted monorepo.
// Without this, Metro resolves two copies (root + app node_modules),
// causing "property is not writable" during React Native initialization.
const appModules = path.resolve(__dirname, 'node_modules');
const rootModules = path.resolve(__dirname, '..', '..', 'node_modules');
const singletons = ['react', 'react-native', 'react-dom', 'expo'];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For singleton packages, always resolve from the app's node_modules
  for (const pkg of singletons) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      const newContext = {
        ...context,
        nodeModulesPaths: [appModules],
      };
      if (originalResolveRequest) {
        return originalResolveRequest(newContext, moduleName, platform);
      }
      return context.resolveRequest(newContext, moduleName, platform);
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
