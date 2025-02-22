
import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from "react-native";

// icons
const getEmojiForIcon = (icon) => {
switch (icon) {
case "user":
    return "👤";
case "envelope":
    return "✉️";
case "lock":
    return "🔒";
case "phone":
    return "📱";
default:
    return "";
}
};

export default function InputField({
icon,
placeholder,
value,
onChangeText,
secureTextEntry = false,
}) {
const [hidePassword, setHidePassword] = useState(secureTextEntry);

return (
<View style={styles.container}>
    {/* Left Icon */}
    <Text  style={styles.icon}>{getEmojiForIcon(icon)}</Text>

    {/* Text Input */}
    <TextInput
    style={styles.input}
    placeholder={placeholder}
    placeholderTextColor="#999"
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={hidePassword}
    />

    {/* Right Icon */}
    {secureTextEntry && (
    <TouchableOpacity onPress={() => setHidePassword(!hidePassword)}>
        <Text style={styles.icon}>
        {hidePassword ? "🙈" : "👁️"}
        </Text>
    </TouchableOpacity>
    )}
</View>
);
}

const styles = StyleSheet.create({
container: {
backgroundColor: "#3C374680",
flexDirection: "row",
alignItems: "center",
borderRadius: 8,
marginBottom: 12,
paddingHorizontal: 12,
paddingVertical: 10,
},
input: {
flex: 1,
color: "#fff",
fontSize: 15,
},
icon: {
fontSize: 18,
marginRight: 8,
color: "#ccc",
},
});
