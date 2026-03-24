import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
// @ts-ignore - The module is in the same directory but the IDE TS server occasionally fails to resolve it without an explicit tsconfig path map.
import { headlessNotificationListener } from './headlessTask';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);

// Register the Headless JS task for background notification listening
AppRegistry.registerHeadlessTask(
  'RNAndroidNotificationListenerHeadlessJs',
  () => headlessNotificationListener
);
