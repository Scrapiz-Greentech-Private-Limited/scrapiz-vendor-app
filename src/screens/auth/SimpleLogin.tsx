import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { height } = Dimensions.get('window');

interface SimpleLoginProps {
  onNavigateSignup: () => void;
  onNavigateOTP: (phone: string) => void;
  onGoogleSuccess: () => void;
}

export default function SimpleLogin({ onNavigateSignup, onNavigateOTP, onGoogleSuccess }: SimpleLoginProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = () => {
    if (phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onNavigateOTP(phone);
    }, 1500);
  };

  return (
    <View className="flex-1">
      <ImageBackground 
        source={require('../../../assets/images/auth.png')} 
        className="flex-1 w-full h-full"
      >
        <KeyboardAvoidingView 
          className="flex-1 bg-black/30" 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView className="flex-1">
            
            {/* Header: Using style for precise height calculation */}
            <View 
              style={{ height: height * 0.25 }} 
              className="justify-end items-center"
            >
              <Text className="font-robotoBold text-[58px] text-green-500 text-center shadow-black shadow-offset-[2/2] shadow-radius-8">
                Scrapiz
              </Text>
            </View>

            <View className="flex-1 justify-end">
              {/* Login Card */}
              <View 
                style={{ minHeight: height * 0.65}}
                className="bg-white rounded-t-[40px] px-[30px] pt-[35px] pb-[50px]"
              >
                <Text className="text-3xl font-extrabold text-slate-900 mb-6">Welcome back</Text>

                <View className="mb-5">
                  <Text className="text-lg text-gray-500 mb-2 font-semibold">Phone Number</Text>
                  <View className="bg-gray-100 rounded-[15px] h-[55px] px-4 flex-row items-center">
                    <Text className="font-bold text-slate-800">+91 </Text>
                    <TextInput
                      className="flex-1 text-base h-full"
                      placeholder="Enter 10 digit number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      onChangeText={setPhone}
                      value={phone}
                    />
                  </View>
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity 
                  onPress={handleDemoLogin}
                  disabled={loading}
                  className={`h-[55px] rounded-full justify-center items-center ${
                    phone.length !== 10 ? 'bg-green-800 opacity-70' : 'bg-green-800'
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-lg font-bold">Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center my-5">
                  <View className="flex-1 h-[1px] bg-gray-200" />
                  <Text className="mx-2.5 text-gray-400 text-sm uppercase">or</Text>
                  <View className="flex-1 h-[1px] bg-gray-200" />
                </View>

                {/* Google Sign In */}
                <TouchableOpacity 
                  onPress={onGoogleSuccess}
                  disabled={loading}
                  className="flex-row h-[55px] rounded-full border border-gray-200 justify-center items-center gap-2.5"
                >
                  <Image source={require('../../../assets/images/googleicon.png')} className="w-5 h-5" resizeMode="contain" />
                  <Text className="text-lg font-semibold text-slate-800">Continue with Google</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View className="flex-row justify-center mt-6">
                  <Text className="text-gray-500">No account? </Text>
                  <TouchableOpacity onPress={onNavigateSignup}>
                    <Text className="text-green-800 font-bold">Create one →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </SafeAreaView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}