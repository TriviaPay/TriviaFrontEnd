import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { logoutWithAuth0 } from "../services/auth";
import { setUnauthenticated } from "../store/authSlice";
import { useNavigation } from "@react-navigation/native";

export default function HomeScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const navigation = useNavigation();
  const handleLogout = async () => {
    try {
      await logoutWithAuth0();
      navigation.replace("SignIn");
      dispatch(setUnauthenticated());
      
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 30,
            }}
          >
            <View>
              <Text style={{ color: "black", fontSize: 24, fontWeight: "bold" }}>
                Welcome back,
              </Text>
              <Text style={{ color: "black", fontSize: 18 }}>
                {user?.name || "User"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: 10,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "black" }}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 15,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: "black",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 15,
              }}
            >
              Quick Stats
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ color: "black", fontSize: 24, fontWeight: "bold" }}
                >
                  12
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>Games</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ color: "black", fontSize: 24, fontWeight: "bold" }}
                >
                  324
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>Points</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ color: "black", fontSize: 24, fontWeight: "bold" }}
                >
                  8
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>Rank</Text>
              </View>
            </View>
          </View>

          <Text
            style={{
              color: "black",
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 15,
            }}
          >
            Recent Activity
          </Text>
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: 15,
                borderRadius: 10,
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 20,
                  marginRight: 15,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "black", fontWeight: "bold" }}>
                  Game #{item}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                  2 hours ago
                </Text>
              </View>
              <Text style={{ color: "black", fontWeight: "bold" }}>
                +25 pts
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
