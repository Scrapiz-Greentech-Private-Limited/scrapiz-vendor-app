import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/i18n';

interface MoreMenuScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function MoreMenuScreen({ onBack, onNavigate }: MoreMenuScreenProps) {
  const { t } = useLanguage();

  const AlertCard = ({ title, value, icon, onPress }: { title: string, value: string, icon: string, onPress?: () => void }) => (
    <TouchableOpacity 
      className="bg-[#B68D40] rounded-[24px] p-5 flex-1 mx-1 flex-row items-center"
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View className="mr-3">
        <View className="bg-white/20 p-2 rounded-full">
          <MaterialIcons name="warning-amber" size={24} color="#fff" />
        </View>
      </View>
      <View>
        <Text className="text-white/80 text-[14px] font-medium">{title}</Text>
        <Text className="text-white text-[20px] font-bold">{value}</Text>
      </View>
    </TouchableOpacity>
  );

  const SmallCard = ({ title, value, icon, iconLib: IconLib = MaterialIcons, onPress }: any) => (
    <TouchableOpacity 
      className="bg-white rounded-[20px] p-4 flex-1 mx-1 border border-gray-100 shadow-sm flex-row items-center"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3">
        <IconLib name={icon} size={20} color="#666" />
      </View>
      <View>
        <Text className="text-gray-900 text-[16px] font-bold">{title}</Text>
        <Text className="text-gray-400 text-[12px]">{value}</Text>
      </View>
    </TouchableOpacity>
  );

  const SectionCard = ({ title, description, icon, children, onPress }: any) => (
    <TouchableOpacity 
      className="bg-white rounded-[28px] p-5 mb-4 border border-gray-100 shadow-sm"
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-gray-50 items-center justify-center mr-4">
            <MaterialIcons name={icon} size={24} color="#333" />
          </View>
          <View>
            <Text className="text-gray-900 text-[20px] font-bold">{title}</Text>
            <Text className="text-gray-400 text-[13px]">{description}</Text>
          </View>
        </View>
        <View>
          <MaterialIcons name="chevron-right" size={28} color="#000" />
        </View>
      </View>
      <View className="flex-row justify-between">
        {children}
      </View>
    </TouchableOpacity>
  );

  const SubCard = ({ name, value, trend }: { name: string, value: string, trend?: 'up' | 'down' }) => (
    <View className="bg-[#FFF9F2] rounded-[20px] p-4 flex-1 mx-1 border border-[#FDEBD0]">
      <View className="flex-row items-center mb-2">
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-2 overflow-hidden">
           <Ionicons name="person" size={24} color="#999" />
        </View>
        <Text className="text-gray-700 text-[14px] font-medium flex-1" numberOfLines={1}>{name}</Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-gray-900 text-[18px] font-bold mr-1">{value}</Text>
        {trend && (
           <MaterialIcons 
             name={trend === 'up' ? "trending-up" : "trending-down"} 
             size={16} 
             color={trend === 'up' ? "#288A57" : "#DC2626"} 
           />
        )}
      </View>
    </View>
  );

  const PickupSubCard = ({ name, status }: { name: string, status: string }) => (
    <View className="bg-[#FEFFF2] rounded-[20px] p-4 flex-1 mx-1 border border-[#F9FDC0]">
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-[#E5F7E0] items-center justify-center mr-2">
           <Ionicons name="person-outline" size={20} color="#288A57" />
        </View>
        <Text className="text-gray-700 text-[14px] font-medium flex-1" numberOfLines={1}>{name}</Text>
      </View>
      <View className="bg-[#FFECEC] self-start px-3 py-1 rounded-full">
        <Text className="text-[#DC2626] text-[12px] font-bold">{status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Scrollable Content */}
      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Title */}
        <Text className="text-[42px] font-bold text-gray-900 mt-4 mb-6">More</Text>

        {/* Alert Cards Row */}
        <View className="flex-row mb-4 mx-[-4px]">
          <AlertCard 
            title="Wallet" 
            value="-₹20" 
            icon="account-balance-wallet" 
            onPress={() => onNavigate('credit')}
          />
          <AlertCard 
            title="Plan" 
            value="6 Days" 
            icon="event-note" 
            onPress={() => onNavigate('subscription')}
          />
        </View>

        {/* Info Cards Row */}
        <View className="flex-row mb-6 mx-[-4px]">
          <SmallCard 
            title="Contacts" 
            value="0 contacts" 
            icon="people-outline" 
            iconLib={Ionicons} 
            onPress={() => onNavigate('contacts')}
          />
          <SmallCard 
            title="Materials" 
            value="27 Materials" 
            icon="grid-view" 
            onPress={() => onNavigate('materials')}
          />
        </View>

        {/* Bills Section */}
        <SectionCard 
          title="Bills" 
          description="Manage your sell and purchase bills" 
          icon="description"
          onPress={() => onNavigate('bills')}
        >
          <SubCard name="Shivanya Sh..." value="₹17" trend="down" />
          <SubCard name="Rashmi Toda..." value="₹2980" trend="down" />
        </SectionCard>

        {/* Pickup Requests Section */}
        <SectionCard 
          title="Pickup Requests" 
          description="Manage all the pickup requests" 
          icon="local-shipping"
          onPress={() => onNavigate('requests')}
        >
          <PickupSubCard name="Diksha Mishra" status="Cancelled" />
          <PickupSubCard name="Diksha Mishra" status="Cancelled" />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
