import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator, Dimensions, ImageBackground,
  KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';

const { height } = Dimensions.get('window');

interface SignupProps {
  onNavigateLogin: () => void;
  onNavigateOTP: (phone: string, details?: { name?: string }) => void;
  onBack: () => void;
}

export default function SignupScreen({ onNavigateLogin, onNavigateOTP, onBack }: SignupProps) {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await ApiService.sendPhoneOtp(`+91${phone}`);
      onNavigateOTP(phone, { name });
    } catch (error: any) {
      Alert.alert('OTP Failed', error?.message || 'Unable to send OTP right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../../../assets/images/login.png')} className="flex-1 w-full h-full">
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView 
            className="flex-1 bg-black/25"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View className="px-3 pt-8">
              <TouchableOpacity className="p-4" onPress={onBack}>
                <MaterialIcons name="arrow-back-ios" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ height: height * 0.15 }} className="items-center justify-center">
              <Text style={styles.brandShadow} className="text-6xl font-robotoBold text-green-500 tracking-widest">
                Scrapiz
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-t-[40px] px-6">
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 30, paddingBottom: 50 }}>
                <Text className="text-3xl font-extrabold text-slate-900 mb-8">Create Partner Account</Text>

                <View className="mb-4">
                  <Text className="text-lg font-semibold text-slate-500 mb-1 ml-1">Full Name</Text>
                  <TextInput className="bg-slate-50 border border-slate-100 rounded-2xl h-12 px-4 text-base" placeholder="Enter name" value={name} onChangeText={setName} />
                </View>

                <View className="mb-4">
                  <Text className="text-lg font-semibold text-slate-500 mb-1 ml-1">Business Name</Text>
                  <TextInput className="bg-slate-50 border border-slate-100 rounded-2xl h-12 px-4 text-base" placeholder="e.g. Metro Scrap" value={businessName} onChangeText={setBusinessName} />
                </View>

                <View className="mb-4">
                  <Text className="text-lg font-semibold text-slate-500 mb-1 ml-1">Phone Number</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-100 rounded-2xl h-12 px-4">
                    <Text className="font-bold mr-2 text-slate-900">+91</Text>
                    <TextInput className="flex-1" placeholder="00000 00000" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />
                  </View>
                </View>

                {error ? <Text className="text-red-500 text-lg mb-2">{error}</Text> : null}

                <TouchableOpacity 
                  className={`h-14 rounded-full justify-center items-center mt-2 ${isLoading ? 'bg-green-800/70' : 'bg-green-800'}`} 
                  onPress={handleSendOtp}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-lg font-bold">Get OTP</Text>}
                </TouchableOpacity>

                <View className="flex-row justify-center mt-6">
                  <Text className="text-slate-500">Already a partner? </Text>
                  <TouchableOpacity onPress={onNavigateLogin}>
                    <Text className="text-green-700 font-bold">Login</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  brandShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  }
});