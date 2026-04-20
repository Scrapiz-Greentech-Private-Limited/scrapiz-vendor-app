import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface PersonalDetailsFormData {
  fullName: string;
  email: string;
  age: string;
  serviceCity: string;
  serviceArea: string;
  gender: string;
  hasVehicle: boolean;
}

interface PersonalDetailsScreenProps {
  initialValues?: Partial<PersonalDetailsFormData>;
  onNext: (data: PersonalDetailsFormData) => void;
}

export default function PersonalDetailsScreen({ initialValues, onNext }: PersonalDetailsScreenProps) {
  const [fullName, setFullName] = useState(initialValues?.fullName || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [age, setAge] = useState(initialValues?.age || '');
  const [serviceCity, setServiceCity] = useState(initialValues?.serviceCity || '');
  const [serviceArea, setServiceArea] = useState(initialValues?.serviceArea || '');
  const [gender, setGender] = useState(initialValues?.gender || 'Male');
  const [hasVehicle, setHasVehicle] = useState(initialValues?.hasVehicle === false ? 'No' : 'Yes');

  const handleNext = () => {
    if (!fullName.trim() || !email.trim() || !serviceCity.trim() || !serviceArea.trim()) {
      alert('Please fill all required fields');
      return;
    }

    onNext({
      fullName: fullName.trim(),
      email: email.trim(),
      age: age.trim(),
      serviceCity: serviceCity.trim(),
      serviceArea: serviceArea.trim(),
      gender,
      hasVehicle: hasVehicle === 'Yes',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 30 }} showsVerticalScrollIndicator={false}>
          <View className="mb-8 mt-6">
            <Text className="text-3xl font-bold text-slate-900 mb-2">Personal Details</Text>
            <Text className="text-base text-gray-500">Please provide your vendor details to continue onboarding</Text>
          </View>

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

          <View className="mb-5">
            <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Email</Text>
            <TextInput
              className="bg-gray-100 rounded-xl p-4 text-base text-slate-900"
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

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

          <View className="mb-5">
            <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Service City</Text>
            <TextInput
              className="bg-gray-100 rounded-xl p-4 text-base text-slate-900"
              placeholder="City where you operate"
              placeholderTextColor="#9CA3AF"
              value={serviceCity}
              onChangeText={setServiceCity}
            />
          </View>

          <View className="mb-5">
            <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Service Area</Text>
            <TextInput
              className="bg-gray-100 rounded-xl p-4 text-base text-slate-900 h-[80px]"
              placeholder="Area / landmark / locality"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={serviceArea}
              onChangeText={setServiceArea}
            />
          </View>

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

          <View className="mb-5">
            <Text className="text-lg font-semibold text-gray-700 mb-2 ml-1">Do you have a pickup vehicle?</Text>
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
            {hasVehicle === 'No' ? (
              <Text className="text-sm text-gray-500 mt-2 ml-1">
                Choose the vehicle type you will use for pickup in the next step.
              </Text>
            ) : null}
          </View>

          <TouchableOpacity className="bg-green-800 py-4 rounded-xl items-center mt-6 shadow-lg" onPress={handleNext}>
            <Text className="text-white text-lg font-bold">Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
