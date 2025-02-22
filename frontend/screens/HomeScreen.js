"use client";

import React from "react";
import { View, Text, Image, ImageBackground } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/authSlice";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/Button";

export default function HomeScreen() {
  const { user, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleLogout = async () => {
    const resultAction = await dispatch(logout());
    if (logout.fulfilled.match(resultAction)) {
      navigation.navigate("Login");
    }
  };

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={{ flex: 1, width: "100%", height: "100%" }}
      resizeMode="cover"
    >
      <View style={{ backgroundColor: "rgba(0,0,0,0.5)", flex: 1, padding: 24, justifyContent: "center" }}>
        <View style={{ backgroundColor: "transparent", padding: 16, borderRadius: 8 }}>
          {/* Logo */}
          <Image
            source={require("../assets/trivia.png")}
            style={{ width: 100, height: 100, alignSelf: "center", marginBottom: 16 }}
            resizeMode="contain"
          />
          <View style={{ marginBottom: 16, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
              TriviaPay
            </Text>
          </View>

          <Text style={{ color: "#fff", textAlign: "center", marginBottom: 16 }}>
            {user ? `You are logged in as: ${user.email}` : "No user found"}
          </Text>
          <Button
            title={loading ? "Logging Out..." : "Log Out"}
            onPress={handleLogout}
          />
        </View>
      </View>
    </ImageBackground>
  );
}
