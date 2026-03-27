import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/i18n';

interface PurchaseBillDetailScreenProps {
  onBack: () => void;
  bill?: any; // In a real app, pass the bill object
}

const PurchaseBillDetailScreen = ({ onBack, bill }: PurchaseBillDetailScreenProps) => {
  const { t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-white pb-40" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-gray-50">
        <TouchableOpacity onPress={onBack} className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-gray-900 flex-1 text-center mr-10">Purchase bill</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Summary Box */}
        <View className="bg-white border border-gray-100 rounded-2xl p-5 mb-8 shadow-sm">
          <View className="flex-row justify-between mb-5">
            <View className="flex-1">
              <Text className="text-[14px] text-gray-400 mb-1">Seller :</Text>
              <Text className="text-[18px] font-bold text-gray-900">Shivanya Sharma</Text>
              <Text className="text-[14px] text-gray-500">+919619348869</Text>
            </View>
            <View className="w-[1px] bg-gray-100 mx-4" />
            <View className="flex-1 items-end">
              <Text className="text-[14px] text-gray-400 mb-1">Created by :</Text>
              <Text className="text-[18px] font-bold text-gray-900">Rajesh Kumar</Text>
              <Text className="text-[14px] text-gray-500 text-right">30 Aug 2025, 12:19 PM</Text>
            </View>
          </View>
          <View className="h-[1px] bg-gray-50 mb-4" />
          <View className="items-center">
            <Text className="text-[14px] text-gray-400">Bill id: 6</Text>
          </View>
        </View>

        {/* Items Section */}
        <Text className="text-[16px] font-bold text-gray-500 mb-4">Items</Text>
        <View className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-8 shadow-sm">
          {/* Steel Item */}
          <View className="p-5 border-b border-gray-50">
            <Text className="text-[18px] font-bold text-gray-700 mb-2">Steel</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-[16px] text-gray-900">
                <Text className="font-bold">4</Text> kg X <Text className="font-bold">₹40</Text>/kg
              </Text>
              <Text className="text-[18px] font-bold text-gray-900">₹160.00</Text>
            </View>
          </View>

          {/* Record Paper Item */}
          <View className="p-5 border-b border-gray-50">
            <Text className="text-[18px] font-bold text-gray-700 mb-2">Record Paper</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-[16px] text-gray-900">
                <Text className="font-bold">5</Text> kg X <Text className="font-bold">₹8</Text>/kg
              </Text>
              <Text className="text-[18px] font-bold text-gray-900">₹40.00</Text>
            </View>
          </View>

          {/* Sub Totals */}
          <View className="p-5 bg-gray-50/30">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[18px] font-bold text-gray-700">Sub Total:</Text>
              <Text className="text-[20px] font-extrabold text-gray-900">₹200.00</Text>
            </View>
            
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[16px] text-gray-500">Platform Charge:</Text>
              <Text className="text-[16px] text-gray-400">-₹10.00</Text>
            </View>
            
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[16px] text-gray-500">Handling Charge:</Text>
              <Text className="text-[16px] text-gray-400">-₹10.00</Text>
            </View>

            <View className="h-[1px] bg-gray-100 mb-5" />

            <View className="flex-row justify-between items-center">
              <Text className="text-[20px] font-bold text-gray-900">Total:</Text>
              <View className="flex-row items-center">
                <Text className="text-[16px] font-bold text-gray-900 mr-4">9 <Text className="text-gray-400 font-normal text-[14px]">kg</Text></Text>
                <Text className="text-[22px] font-black text-gray-900">₹180.00</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payments Section */}
        <Text className="text-[16px] font-bold text-gray-500 mb-4">Payments</Text>
        <View className="bg-[#E8F8EA] rounded-xl p-5 flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-[#1B7332] items-center justify-center mr-3">
              <MaterialIcons name="currency-rupee" size={18} color="white" />
            </View>
            <Text className="text-[18px] font-bold text-[#1B7332]">Paid Successfully</Text>
          </View>
          <Text className="text-[20px] font-extrabold text-gray-900">₹180.00</Text>
        </View>

        {/* Status Timeline */}
        <View className="px-2 pb-10">
          <View className="flex-row items-start">
            <View className="items-center mr-4">
              <View className="w-6 h-6 rounded-full bg-[#1B7332] items-center justify-center z-10">
                <MaterialIcons name="check" size={14} color="white" />
              </View>
              <View className="w-[2px] h-24 bg-[#1B7332] -mt-1" />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-[16px] font-bold text-[#1B7332]">Payment successful</Text>
                <Text className="text-[12px] text-gray-400">12:47 PM, 30 Aug 2025</Text>
              </View>
              
              <View className="bg-white border border-gray-100 rounded-2xl p-4 flex-row items-center shadow-sm">
                <View className="w-12 h-12 bg-[#FFF4E5] rounded-full items-center justify-center mr-4">
                  <MaterialIcons name="account-balance-wallet" size={24} color="#FF9800" />
                </View>
                <View className="flex-1">
                   <Text className="text-[18px] font-bold text-gray-800">Cash</Text>
                </View>
                <Text className="text-[18px] font-bold text-gray-900">₹180.00</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PurchaseBillDetailScreen;
