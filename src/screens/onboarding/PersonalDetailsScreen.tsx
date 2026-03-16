import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';

interface PersonalDetailsScreenProps {
  onNext: (data: any) => void;
}

export default function PersonalDetailsScreen({ onNext }: PersonalDetailsScreenProps) {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Male');
  const [hasVehicle, setHasVehicle] = useState('Yes');

  const handleNext = () => {
    if (!fullName || !age || !address) {
      alert('Please fill all fields');
      return;
    }
    onNext({ 
      fullName, 
      age, 
      address, 
      gender, 
      hasVehicle: hasVehicle === 'Yes' 
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingTop: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-8 mt-6">
            <Text className="text-3xl font-bold text-slate-900 mb-2">Personal Details</Text>
            <Text className="text-base text-gray-500">Please provide your information to get started</Text>
          </View>

          {/* Form Container - flex-1 here ensures the button pushes to the bottom if there's space */}
          <View className="flex-1">
            {/* Full Name */}
            <View className="mb-5">
              <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Full Name</Text>
              <TextInput
                className="bg-gray-100 rounded-xl p-4 text-base text-slate-900"
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Age */}
            <View className="mb-5">
              <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Age</Text>
              <TextInput
                className="bg-gray-100 rounded-xl p-4 text-base text-slate-900"
                placeholder="Enter your age"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            {/* Address */}
            <View className="mb-5">
              <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Address</Text>
              <TextInput
                className="bg-gray-100 rounded-xl p-4 text-base text-slate-900 h-[80px]"
                placeholder="Enter your full address"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Gender Selection */}
            <View className="mb-5">
              <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Gender</Text>
              <View className="flex-row gap-3">
                {['Male', 'Female', 'Other'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setGender(item)}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      gender === item ? 'bg-green-50 border-green-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-lg font-medium ${gender === item ? 'text-green-800 font-bold' : 'text-gray-500'}`}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Toggle */}
            <View className="mb-5">
              <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Do you have a vehicle?</Text>
              <View className="flex-row gap-3">
                {['Yes', 'No'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setHasVehicle(item)}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      hasVehicle === item ? 'bg-green-50 border-green-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-lg font-medium ${hasVehicle === item ? 'text-green-800 font-bold' : 'text-gray-500'}`}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            className="bg-green-800 py-4 rounded-xl items-center mt-6 shadow-lg" 
            onPress={handleNext}
          >
            <Text className="text-white text-lg font-bold">Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}