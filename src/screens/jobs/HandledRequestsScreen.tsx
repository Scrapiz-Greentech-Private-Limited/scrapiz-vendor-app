import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import RequestDetailsScreen from './RequestDetailsScreen';

interface HandledRequest {
  id: string;
  status: 'Completed' | 'Cancelled';
  time: string;
  customerName: string;
  customerId: string;
  address: string;
}

const DUMMY_DATA: HandledRequest[] = [
  {
    id: '1',
    status: 'Completed',
    time: '12:54 PM, 28 Dec',
    customerName: 'Rashmi Todankar',
    customerId: '94762',
    address: '202, Fourteen Star Building, Shastri Nagar, Goregaon West, Mumbai-400104, Maharashtra',
  },
  {
    id: '2',
    status: 'Completed',
    time: '10:30 AM, 28 Dec',
    customerName: 'Amit Sharma',
    customerId: '83421',
    address: '45, Green Park Colony, Andheri East, Mumbai-400069, Maharashtra',
  },
];

interface HandledRequestsScreenProps {
  onBack: () => void;
}

export default function HandledRequestsScreen({ onBack }: HandledRequestsScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<HandledRequest | null>(null);

  if (selectedRequest) {
    return (
      <RequestDetailsScreen 
        onBack={() => setSelectedRequest(null)} 
        request={selectedRequest} 
      />
    );
  }

  const filtered = DUMMY_DATA.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerId.includes(search) ||
      r.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="flex-row items-center bg-white px-4 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={onBack} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">Handled Requests</Text>
      </View>

      {/* Search */}
      <View className="flex-row items-center bg-white rounded-xl mx-4 my-4 px-3 border border-gray-300 h-12">
        <Ionicons name="search" size={18} color="#9ca3af" className="mr-2" />
        <TextInput
          className="flex-1 text-base text-gray-800"
          placeholder="Search"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {filtered.map((item) => {
          const isCompleted = item.status === 'Completed';

          return (
            <TouchableOpacity 
              key={item.id} 
              className="bg-white rounded-2xl p-4 mb-4 border border-gray-200 shadow-sm"
              activeOpacity={0.7}
              onPress={() => setSelectedRequest(item)}
            >
              {/* Status row - FIXED: Changed <div> to <View> */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-x-1.5">
                  <MaterialIcons
                    name={isCompleted ? "check-circle" : "cancel"}
                    size={18}
                    color={isCompleted ? "#288A57" : "#dc2626"} 
                  />
                  <Text
                    className={`text-sm font-bold ${
                      isCompleted ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text className="text-xs text-gray-400">{item.time}</Text>
              </View>

              {/* Customer */}
              <View className="flex-row items-start mb-3 gap-x-3">
                <View className={`w-10 h-10 rounded-full justify-center items-center ${
                  isCompleted ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <Ionicons 
                    name="person" 
                    size={18} 
                    color={isCompleted ? "#288A57" : "#dc2626"} 
                  />
                </View>
                <View>
                  <Text className="text-[15px] font-bold text-gray-900">{item.customerName}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">ID: {item.customerId}</Text>
                </View>
              </View>

              {/* Address */}
              <View className="flex-row items-start gap-x-3">
                <View className="w-10 h-10 rounded-full bg-gray-50 justify-center items-center">
                  <Ionicons name="location-outline" size={18} color="#6b7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800 mb-0.5">Pickup Address</Text>
                  <Text className="text-[13px] text-gray-500 leading-5">{item.address}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <Text className="text-center text-gray-400 mt-10 text-base">No requests found</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}