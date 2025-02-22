// import { Platform } from 'react-native';
// import firebase from '@react-native-firebase/app';
// import auth from '@react-native-firebase/auth';

// export { auth };
import { Platform } from 'react-native';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

// Ensure Firebase is initialized once
if (!firebase.apps.length) {
  firebase.initializeApp({});
}

export { auth, firebase };
