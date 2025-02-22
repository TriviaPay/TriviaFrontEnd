// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { initializeAuth, getReactNativePersistence } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "AIzaSyA3HhchIDpUUVOuuLi6T60Jabdr_8D2gM4",
//   authDomain: "triviapay-cc5d7.firebaseapp.com", 
//   projectId: "triviapay-cc5d7",
//   storageBucket: "triviapay-cc5d7.appspot.com",
//   messagingSenderId: "684574930754",
//   appId: "1:684574930754:android:10a68c04f5b90cda7bfadb",
// };

// let app;
// if (!getApps().length) {
//   app = initializeApp(firebaseConfig);
// } else {
//   app = getApp(); 
// }

// const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(AsyncStorage),
// });

// export { app, auth };



import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAp_S7xHgbG0hi9FAWEW0srvQdHnh7ooZg",
  authDomain: "triviapay-cc5d7.firebaseapp.com",
  projectId: "inspired-bazaar-451605-s8",
  storageBucket: "triviapay-cc5d7.appspot.com",
  messagingSenderId: "181823867662",
  appId: "1:181823867662:ios:dbd4685bcadbf08926a55f",
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
