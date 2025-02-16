import { Image, View } from "react-native";

export default function Logo() {
    return (
        <View className="mb-6">
        <Image source={require("../../assets/adaptive-icon.png")} className="w-24 h-24" resizeMode="contain" />
        </View>
    );
}
