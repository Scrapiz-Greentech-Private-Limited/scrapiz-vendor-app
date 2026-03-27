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

interface Request {
  id: string;
  status: 'Completed' | 'Cancelled';
  time: string;
  customerName: string;
  customerId: string;
  address: string;
  paymentStatus?: string;
  paymentTime?: string;
  type: 'Handled' | 'Cancelled' | 'Paid' | 'Unpaid';
}

const DUMMY_DATA: Request[] = [
  {
    id: '1',
    status: 'Completed',
    time: '09:24 PM, 30 Jan',
    customerName: 'Shivanya Sharma',
    customerId: '98860',
    address: 'Gulraj Tower, Wing C, 21st Floor, 2122',
    type: 'Handled',
  },
  {
    id: '2',
    status: 'Completed',
    time: '12:54 PM, 28 Dec',
    customerName: 'Rashmi Todankar',
    customerId: '94762',
    address: '202, Fourteen Star Building, Shastri Nagar, Goregaon West, Mumbai-400104, Maharashtra',
    type: 'Handled',
  },
  {
    id: '3',
    status: 'Completed',
    time: '11:05 AM, 22 Dec',
    customerName: 'Renu srivastava',
    customerId: '93971',
    address: '202, Fourteen Star Building, Shastri Nagar, Goregaon West, Mumbai-400104, Maharashtra',
    type: 'Handled',
  },
  {
    id: '4',
    status: 'Cancelled',
    time: '01:22 AM, 20 Feb',
    customerName: 'Diksha Mishra',
    customerId: '101618',
    address: 'A 104 Versova Mangela chs Juhu Versova Link Road Mumbai 400053',
    type: 'Cancelled',
  },
  {
    id: '5',
    status: 'Cancelled',
    time: '05:02 PM, 17 Feb',
    customerName: 'Diksha Mishra',
    customerId: '101289',
    address: 'A 104 Versova Mangela chs Juhu Versova Link Road Mumbai 400053',
    type: 'Cancelled',
  },
  {
    id: '6',
    status: 'Cancelled',
    time: '05:56 PM, 15 Feb',
    customerName: 'Muaaz Merchant',
    customerId: '101035',
    address: 'A 104 Versova Mangela chs Juhu Versova Link Road Mumbai 400053',
    type: 'Cancelled',
  },
  {
    id: '7',
    status: 'Completed',
    time: '09:24 PM, 30 Jan',
    customerName: 'Shivanya Sharma',
    customerId: '98860',
    address: 'Gulraj Tower, Wing C, 21st Floor, 2122',
    paymentStatus: 'Payment successful',
    paymentTime: '12:17 PM 31 Jan',
    type: 'Paid',
  },
  {
    id: '8',
    status: 'Completed',
    time: '12:54 PM, 28 Dec',
    customerName: 'Rashmi Todankar',
    customerId: '94762',
    address: '202, Fourteen Star Building, Shastri Nagar, Goregaon West, Mumbai-400104, Maharashtra',
    paymentStatus: 'Payment successful',
    paymentTime: '04:56 PM 28 Dec',
    type: 'Paid',
  },
  {
    id: '9',
    status: 'Completed',
    time: '11:05 AM, 22 Dec',
    customerName: 'Renu srivastava',
    customerId: '93971',
    address: '202, Fourteen Star Building, Shastri Nagar, Goregaon West, Mumbai-400104, Maharashtra',
    type: 'Unpaid',
  },
];

interface RequestsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string, params?: any) => void;
}

const TABS: Request['type'][] = ['Handled', 'Cancelled', 'Paid', 'Unpaid'];

export default function RequestsScreen({ onBack, onNavigate }: RequestsScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Request['type']>('Handled');

  const filtered = DUMMY_DATA.filter(
    (r) =>
      r.type === activeTab &&
      (r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        r.customerId.includes(search) ||
        r.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView className="flex-1 bg-white pb-40" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="px-4 pt-4">
        <TouchableOpacity onPress={onBack} className="mb-4">
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text className="text-[35px] font-bold text-gray-900 mb-4">Requests</Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-6">
        <View className="flex-row items-center bg-white rounded-2xl px-4 border border-gray-200 h-[45px] shadow-sm">
          <Ionicons name="search" size={24} color="#666" className="mr-3" />
          <TextInput
            className="flex-1 text-[16px] text-gray-800"
            placeholder="Search"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="mb-6">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4"
          contentContainerStyle={{ paddingRight: 32 }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full mr-3 border ${
                activeTab === tab
                  ? 'bg-[#288A57] border-[#288A57]'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`text-[16px] font-medium ${
                  activeTab === tab ? 'text-white' : 'text-gray-500'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Date Filter Row (Dummy for now to match Screenshot) */}
      <View className="flex-row items-center justify-center px-4 mb-6 gap-x-6">
        <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
           <Ionicons name="chevron-back" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center bg-white px-6 py-2 rounded-full border border-gray-100">
          <Text className="text-gray-900 font-medium mr-2">Lifetime</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
           <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {filtered.map((item) => {
          const isCompleted = item.status === 'Completed';

          return (
            <TouchableOpacity
              key={item.id}
              className="bg-white rounded-[24px] p-5 mb-4 border border-gray-100 shadow-sm"
              activeOpacity={0.7}
              onPress={() => onNavigate('request-details', { request: item })}
            >
              {/* Status Row */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <MaterialIcons
                    name={isCompleted ? 'check-circle' : 'cancel'}
                    size={24}
                    color={isCompleted ? '#288A57' : '#dc2626'}
                  />
                  <Text
                    className={`text-[16px] font-bold ml-2 ${
                      isCompleted ? 'text-[#288A57]' : 'text-[#dc2626]'
                    }`}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text className="text-[13px] text-gray-500">{item.time}</Text>
              </View>

              {/* Customer Row */}
              <View className="flex-row items-center mb-4">
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                    isCompleted ? 'bg-[#E5F7E0]' : 'bg-[#FFECEC]'
                  }`}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={isCompleted ? '#288A57' : '#dc2626'}
                  />
                </View>
                <View>
                  <Text className="text-[18px] font-bold text-gray-900">
                    {item.customerName}
                  </Text>
                  <Text className="text-[13px] text-gray-400">
                    ID: {item.customerId}
                  </Text>
                </View>
              </View>

              {/* Address Row */}
              <View className="flex-row items-start mb-2">
                <View className="w-12 h-12 rounded-full bg-gray-50 items-center justify-center mr-4">
                   <Ionicons name="location" size={24} color="#333" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-bold text-gray-800">
                    Pickup Address
                  </Text>
                  <Text className="text-[14px] text-gray-400 leading-5" numberOfLines={2}>
                    {item.address}
                  </Text>
                </View>
              </View>

              {/* Payment Success Row (for Paid tab) */}
              {item.paymentStatus && (
                <View className="mt-4 pt-4 border-t border-gray-50 flex-row items-center">
                  <Text className="text-[14px] text-[#288A57] font-bold">
                    {item.paymentStatus}{' '}
                    <Text className="text-gray-400 font-normal">
                      at {item.paymentTime}
                    </Text>
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View className="items-center justify-center mt-20">
             <Text className="text-gray-400 text-[16px]">No requests found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
