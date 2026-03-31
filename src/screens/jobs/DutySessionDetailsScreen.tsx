import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import { MAP_CONFIG } from '../../config/mapConfig';

interface DutySessionDetailsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const DutySessionDetailsScreen = ({ onBack, onNavigate }: DutySessionDetailsScreenProps) => {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View className="px-4 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={onBack} className="p-2 mr-2">
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-gray-900 flex-1 ml-4">
          Duty session details
        </Text>
      </View>

      <ScrollView 
        className="flex-1 bg-[#F8F9FA]" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Live Map Section */}
        <LiveSessionMap 
          location={{ 
            latitude: MAP_CONFIG.DEFAULT_CENTER[1], 
            longitude: MAP_CONFIG.DEFAULT_CENTER[0] 
          }} 
          height={220}
        />

        {/* Top Status Banner */}
        <View className="bg-[#EBEBEB] px-5 py-4 flex-row items-center justify-between">
          <View>
            <Text className="text-[16px] font-bold text-gray-800 mb-1">Offline</Text>
            <Text className="text-[13px] text-gray-600">
              (27 Dec, 11:34 PM - 31 Dec, 5:32 PM)
            </Text>
          </View>
          <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center shadow-sm border border-gray-100">
            <Ionicons name="time-outline" size={14} color="#666" style={{ marginRight: 4 }} />
            <Text className="text-[13px] font-medium text-gray-700">3d 17h</Text>
          </View>
        </View>

        <View className="p-5">
          {/* Vehicle Info Section */}
          <Text className="text-[18px] font-bold text-gray-800 mb-4">Vehicle Info</Text>
          
          <View className="bg-white rounded-2xl p-4 flex-row items-center justify-between mb-8 shadow-sm border border-gray-100">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-gray-50 rounded-xl items-center justify-center mr-4 border border-gray-100">
                <MaterialIcons name="two-wheeler" size={24} color="#666" />
              </View>
              <View>
                <Text className="text-[16px] font-bold text-gray-800 mb-0.5">Bike</Text>
                <Text className="text-[13px] text-gray-400">Vehicle No: MH01DM8286</Text>
              </View>
            </View>
            <TouchableOpacity className="px-4 py-2 rounded-full border border-green-600 ml-2">
              <Text className="text-[13px] font-bold text-green-700">View</Text>
            </TouchableOpacity>
          </View>

          {/* Past Members Section */}
          <Text className="text-[18px] font-bold text-gray-800 mb-4">Past Members</Text>
          
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-8 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=11' }} 
                className="w-14 h-14 rounded-full mr-4 grayscale opacity-80"
              />
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-gray-800 mb-1">Rahul Kumar</Text>
                <Text className="text-[12px] text-gray-400 leading-tight">
                  27 Dec, 11:34 PM - 31 Dec, 5:32 PM
                </Text>
              </View>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center border border-gray-200 ml-2">
              <Ionicons name="time-outline" size={14} color="#666" style={{ marginRight: 4 }} />
              <Text className="text-[13px] font-medium text-gray-600">3d 17h</Text>
            </View>
          </View>

          {/* Session Overview Section */}
          <Text className="text-[18px] font-bold text-gray-800 mb-4">Session Overview</Text>
          
          <View className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-4">
            <View className="flex-row gap-2 mb-2 p-3">
              <TouchableOpacity 
                className="flex-1 bg-[#E8F5E9] rounded-xl p-4 items-center justify-center"
                onPress={() => onNavigate('handled-requests')}
              >
                <Text className="text-[24px] font-bold text-[#2E7D32] mb-1">1</Text>
                <Text className="text-[14px] text-[#4CAF50] font-medium">Handled</Text>
              </TouchableOpacity>
              <View className="flex-1 bg-[#FFEBEE] rounded-xl p-4 items-center justify-center">
                <Text className="text-[24px] font-bold text-[#c62828] mb-1">1</Text>
                <Text className="text-[14px] text-[#ef5350] font-medium">Cancelled</Text>
              </View>
            </View>

            <View className="bg-[#E6F4FB] rounded-xl p-5 mb-2 mx-3 flex-row justify-between items-center">
              <Text className="text-[15px] font-bold text-gray-700">Quantity Purchased</Text>
              <Text className="text-[15px] font-medium text-gray-800">
                <Text className="font-bold">0</Text> kg, <Text className="font-bold">1</Text> pcs
              </Text>
            </View>

            <View className="bg-[#E6F4FB] rounded-xl p-5 mx-3 mb-3 flex-row justify-between items-center">
              <Text className="text-[15px] font-bold text-gray-700">Purchase Amount</Text>
              <Text className="text-[16px] font-bold text-gray-900">₹ 2980</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DutySessionDetailsScreen;
