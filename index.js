/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App'; // This will now grab your new App.js
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);