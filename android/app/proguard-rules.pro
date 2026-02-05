# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}
-keepclassmembers @com.facebook.common.internal.DoNotStrip class * {
    *;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.UIProp <fields>;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# React Native - Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# React Native - Keep Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Stripe - Keep all Stripe classes
-keep class com.stripe.** { *; }
-dontwarn com.stripe.**

# Stripe Push Provisioning - Suppress warnings for missing classes
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivity$g
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Args
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Error
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider

# SLF4J - Suppress warnings for missing StaticLoggerBinder and other binders
-dontwarn org.slf4j.impl.StaticLoggerBinder
-dontwarn org.slf4j.impl.StaticMDCBinder
-dontwarn org.slf4j.impl.StaticMarkerBinder
-keep class org.slf4j.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Native Fast Image
-keep class com.dylanvann.fastimage.** { *; }
-dontwarn com.dylanvann.fastimage.**

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native MMKV
-keep class com.tencent.mmkv.** { *; }

# React Native Keychain
-keep class com.oblador.keychain.** { *; }

# React Native Image Picker
-keep class com.imagepicker.** { *; }

# React Native FS
-keep class com.rnfs.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Pusher
-keep class com.pusher.** { *; }
-dontwarn com.pusher.**

# OneSignal
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# Pollfish
-keep class com.pollfish.** { *; }
-dontwarn com.pollfish.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelables
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

