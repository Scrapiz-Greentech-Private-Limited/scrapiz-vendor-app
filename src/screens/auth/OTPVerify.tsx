import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';

const { height } = Dimensions.get('window');

export default function OTPVerify({ phone, onBack, onSuccess }: any) {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = () => {
        if (otp.length < 6) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onSuccess();
        }, 1500);
    };

    return (
        // flex-1 replaces { flex: 1 }
        <View className="flex-1">
            <ImageBackground 
                source={require('../../../assets/images/auth.png')} 
                className="flex-1 w-full h-full"
            >
                <SafeAreaView className="flex-1">
                    <KeyboardAvoidingView
                        className="flex-1 bg-black/25"
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        {/* Header Section */}
                        <View className="pt-8 px-2">
                            <TouchableOpacity className="p-4" onPress={onBack}>
                                <MaterialIcons name="arrow-back" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Brand Title with Custom Logic */}
                        <View style={{ height: height * 0.15 }} className="items-center justify-center">
                            <Text className="text-6xl font-robotoBold text-green-500 text-center tracking-widest shadow-lg">
                                Scrapiz
                            </Text>
                        </View>

                        {/* OTP Card */}
                        <View 
                            style={{ height: height * 0.65 }} 
                            className="bg-white rounded-t-[40px] p-8 mt-auto"
                        >
                            <Text className="text-3xl font-black text-slate-900 mb-2">Verification</Text>
                            <Text className="text-slate-500 text-lg mb-6 leading-6">
                                Enter the code sent to{"\n"}+91 {phone || '98XXXXXX'}
                            </Text>

                            <TextInput
                                className="bg-slate-50 h-16 rounded-2xl text-center text-3xl font-bold text-green-800 mb-6 border border-slate-100 tracking-[15px]"
                                placeholder="000000"
                                keyboardType="number-pad"
                                maxLength={6}
                                onChangeText={setOtp}
                            />

                            {/* Dynamic Button States */}
                            <TouchableOpacity
                                onPress={handleVerify}
                                disabled={otp.length < 6 || loading}
                                className={`h-14 rounded-full justify-center items-center ${
                                    (otp.length < 6 || loading) ? 'bg-green-800/60' : 'bg-green-800'
                                }`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white text-lg font-bold">Verify & Proceed</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity className="mt-5 items-center">
                                <Text className="text-slate-500 text-lg">
                                    Didn't receive code? <Text className="text-green-800 font-bold">Resend</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
}