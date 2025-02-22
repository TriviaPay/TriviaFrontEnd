'use client';

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {auth} from '../firebase'; // We can check auth.currentUser
import {useSelector} from 'react-redux';

export default function EmailVerificationScreen() {
  const [checkMessage, setCheckMessage] = useState('');
  const navigation = useNavigation();
  const {user} = useSelector(state => state.auth);

  const handleCheckVerification = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setCheckMessage('Email is verified! Proceeding...');
        navigation.navigate('PhoneVerification');
      } else {
        setCheckMessage('Email not verified yet. Please check your inbox.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1, backgroundColor: '#f3f3f3'}}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{flex: 1, width: '100%', height: '100%'}}
        resizeMode="cover">
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
          }}
        />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 24,
          }}>
          <View
            style={{
              // backgroundColor: '#fff',
              padding: 16,
              borderRadius: 8,
              elevation: 2,
            }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 16,
                textAlign: 'center',
                color: '#fff'
                }}>
              Verify Your Email
            </Text>
            <Text style={{color: '#fff' ,marginBottom: 16, textAlign: 'center'}}>
              A verification link has been sent to: {user?.email}
            </Text>
            <Text style={{ color: '#fff', marginBottom: 16, textAlign: 'center'}}>
              Please check your email and click on the verification link.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: 'blue',
                padding: 12,
                borderRadius: 4,
                marginBottom: 8,
              }}
              onPress={handleCheckVerification}>
              <Text
                style={{color: '#fff', textAlign: 'center', fontWeight: '600'}}>
                Check Verification Status
              </Text>
            </TouchableOpacity>

            {checkMessage ? (
              <Text style={{color: '#fff', marginTop: 8, textAlign: 'center'}}>
                {checkMessage}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

// "use client";

// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   Image,
//   ImageBackground,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
// } from "react-native";
// import { useNavigation } from "@react-navigation/native";
// import { auth } from "../firebase";
// import { useSelector } from "react-redux";

// import Button from "../components/Button";

// export default function EmailVerificationScreen() {
//   const [checkMessage, setCheckMessage] = useState("");
//   const navigation = useNavigation();
//   const { user } = useSelector((state) => state.auth);

//   const handleCheckVerification = async () => {
//     if (auth.currentUser) {
//       await auth.currentUser.reload();
//       if (auth.currentUser.emailVerified) {
//         setCheckMessage("Email is verified! Proceeding to Home...");
//         navigation.navigate("Home");
//       } else {
//         setCheckMessage("Email not verified yet. Please check your inbox.");
//       }
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.OS === "ios" ? "padding" : undefined}
//     >
//       <ImageBackground
//         source={require("../assets/background.png")}
//         resizeMode="cover"
//         style={{ flex: 1, width: "100%", height: "100%" }}
//       >
//         <View className="bg-black/70 flex-1 p-6 justify-center">
//           <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
//             <View className="bg-transparent p-4 rounded-2xl">
//               {/* Logo */}
//               <Image
//                 source={require("../assets/trivia.png")}
//                 style={{ width: 80, height: 80, alignSelf: "center", marginBottom: 16 }}
//                 resizeMode="contain"
//               />
//               <Text className="text-white text-2xl font-bold text-center mb-4">
//                 TriviaPay
//               </Text>

//               <Text className="text-white text-center mb-2">
//                 A verification link has been sent to: {user?.email}
//               </Text>
//               <Text className="text-white text-center mb-6">
//                 Please check your email and click on the verification link.
//               </Text>

//               <Button title="Check Verification Status" onPress={handleCheckVerification} />

//               {checkMessage ? (
//                 <Text className="text-white mt-4 text-center">{checkMessage}</Text>
//               ) : null}
//             </View>
//           </ScrollView>
//         </View>
//       </ImageBackground>
//     </KeyboardAvoidingView>
//   );
// }
