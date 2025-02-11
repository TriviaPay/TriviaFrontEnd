# TriviaFrontEnd
# TriviaPay - React Native App with Auth0 Authentication

TriviaPay is a mobile application built using **React Native, ReduxToolkit, and Auth0** for authentication. This app supports **email/password login, social logins (Google, Facebook, Microsoft), and JWT authentication**.

---

## 📜 Features
-- **User Authentication** with Auth0 (Email/Password, Social Logins)  
-- **Secure JWT-based authorization**  
-- **Redux for state management**  
-- **React Navigation for routing**  
-- **NativeWind & Tailwind CSS for styling**  
-- **Expo support for easy development**

---

## 🚀 Getting Started

### 1. **Clone the Repository**

git clone https://github.com/TriviaPay/TriviaFrontEnd.git
        cd triviapay

2. Install Dependencies
        npm install

3. Set Up Auth0 Configuration
Create a .env file in the root directory and add your Auth0 credentials:

        AUTH0_DOMAIN=dev-82x6ztlibtkrc5bt.us.auth0.com
        AUTH0_CLIENT_ID=ronaEEyOSp290k3Wo8CtVN1WZuTh1q26
        BUNDLE_IDENTIFIER=com.triviapay.app
        SCHEME=triviapay

Also, ensure you have the correct Auth0 URLs in the Auth0 dashboard:

Callback URLs:

         triviapay://dev-82x6ztlibtkrc5bt.us.auth0.com/ios/com.triviapay.app/callback 
         triviapay://dev-82x6ztlibtkrc5bt.us.auth0.com/android/com.triviapay.app/callback

Logout URLs:

        triviapay://dev-82x6ztlibtkrc5bt.us.auth0.com/ios/com.triviapay.app/logout
        triviapay://dev-82x6ztlibtkrc5bt.us.auth0.com/android/com.triviapay.app/logout

Allowed Web Origins:

        triviapay://dev-82x6ztlibtkrc5bt.us.auth0.com

🏗️ Building & Running the App

4️. Prebuilt Android Folder (Important)

📌 If you are running on Android, follow these steps:

        cd android
        ./gradlew clean
        cd ..

Then, build the project with:

        npx react-native run-android

5. Run the App

🟢 For Android

        npx react-native run-android

🍏 For iOS

        cd ios && pod install && cd ..
        npx react-native run-ios


⚡ Authentication Flow

1.Sign Up/Login with Auth0

    - Email/Password Authentication
    - Social Logins (Google, Facebook, Microsoft)
    
2.Retrieve JWT Access Token

    - Store Authenticated User in Redux
    - Navigate to Home Screen
    - Logout & Redirect to Sign-In Screen


🔧 Troubleshooting

1. Social Login Redirect Not Working?

    - Ensure the correct callback URLs are set in Auth0.
      
2. Try re-installing dependencies:

    - rm -rf node_modules && npm install


📌 Tech Stack

-- React Native 0.77
-- Auth0 for Authentication
-- Redux for State Management
-- React Navigation for Routing
-- NativeWind (Tailwind CSS) for Styling
-- Axios for API Calls
