import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface SubscriptionScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function SubscriptionScreen({ onBack, onNavigate }: SubscriptionScreenProps) {
  const features = [
    'Increase your income by getting more orders',
    'Access to Corporate & Bulk Orders',
    'Full Tracking of Pickups and Earnings',
    'Work Only in Your Preferred Locations',
    'Work Anytime - Morning, Evening, or Weekends',
    'Dedicated Support from Partner Team',
  ];

  const PlanCard = ({ 
    days, 
    price, 
    originalPrice, 
    validTill, 
    colors, 
    isBestValue 
  }: { 
    days: string, 
    price: string, 
    originalPrice?: string, 
    validTill: string, 
    colors: string[], 
    isBestValue?: boolean 
  }) => (
    <TouchableOpacity activeOpacity={0.9} className="mb-4">
      <View
        style={{ backgroundColor: colors[0] }}
        className="rounded-[24px] p-5 flex-row items-center justify-between"
      >
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-white text-[20px] font-bold mr-2">{days}</Text>
            {isBestValue && (
              <View
                style={{ backgroundColor: '#F97316' }}
                className="px-3 py-1 rounded-full"
              >
                <Text className="text-white text-[10px] font-bold">Best Value</Text>
              </View>
            )}
          </View>
          <Text className="text-white/70 text-[12px]">Valid till {validTill}</Text>
        </View>

        <View className="bg-white/20 px-4 py-3 rounded-2xl items-center min-w-[100px]">
          {originalPrice && (
            <Text className="text-white/60 text-[12px] line-through">₹{originalPrice}</Text>
          )}
          <Text className="text-white text-[22px] font-bold">₹{price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-[#00104B]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Radial Rays Background Effect - Disabled for debug */}
      {/* <View className="absolute inset-0 items-center justify-center opacity-30">
        {[...Array(12)].map((_, i) => (
          <View 
            key={i}
            style={{
              position: 'absolute',
              width: 1,
              height: width * 2,
              backgroundColor: '#3B82F6',
              transform: [{ rotate: `${i * 15}deg` }]
            }}
          />
        ))}
      </View> */}

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 py-3">
          <TouchableOpacity onPress={onBack} className="w-10 h-10 items-center justify-center rounded-full bg-white/10">
            <MaterialIcons name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Crown Hexagon */}
          <View className="items-center mt-4 mb-6">
            <View className="w-32 h-32 items-center justify-center">
               <View className="bg-[#FFC107] w-24 h-24 rounded-[20px] items-center justify-center rotate-45 shadow-2xl">
                  <View className="-rotate-45">
                    <FontAwesome5 name="crown" size={42} color="#fff" />
                  </View>
               </View>
            </View>
            
            <Text className="text-white text-[28px] font-bold text-center mt-4 leading-9">
              Get Your Business to{"\n"}Next Level
            </Text>
          </View>

          {/* Features List */}
          <View className="mb-8">
            {features.map((feature, index) => (
              <View key={index} className="flex-row items-center mb-4">
                <View className="w-6 h-6 rounded-full bg-white/10 items-center justify-center mr-4 border border-green-500">
                  <MaterialIcons name="check" size={16} color="#4ADE80" />
                </View>
                <Text className="text-white/90 text-[15px] flex-1">{feature}</Text>
              </View>
            ))}
          </View>

          {/* Current Validity Card */}
          <View
            style={{ backgroundColor: '#6366F1' }}
            className="rounded-[28px] p-6 mb-8"
          >
            <View className="flex-row justify-between items-baseline mb-2">
              <Text className="text-white/80 text-[14px]">Validity Left</Text>
              <Text className="text-white/60 text-[12px]">Valid till</Text>
            </View>
            <View className="flex-row justify-between items-baseline">
              <Text className="text-white text-[32px] font-bold">6 Days</Text>
              <Text className="text-white font-bold text-[16px]">27 Feb 2026</Text>
            </View>
          </View>

          {/* Upgrade Plan Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-[1px] bg-white/20" />
            <Text className="px-4 text-white text-[18px] font-bold">Upgrade Plan</Text>
            <View className="flex-1 h-[1px] bg-white/20" />
          </View>

          {/* Plan Cards */}
          <PlanCard 
            days="90 Days" 
            price="1399" 
            originalPrice="1499" 
            validTill="22 May 2026" 
            colors={['#1E40AF', '#3B82F6']}
            isBestValue
          />
          <PlanCard 
            days="60 Days" 
            price="949" 
            originalPrice="999" 
            validTill="22 April 2026" 
            colors={['#7C162E', '#BE185D']}
          />
          <PlanCard 
            days="30 Days" 
            price="499" 
            validTill="23 March 2026" 
            colors={['#1D1D35', '#4338CA']}
          />

          {/* Need Help Footer */}
          <TouchableOpacity className="py-8 items-center">
            <Text className="text-white/80 text-[16px] font-bold underline">Need Help?</Text>
          </TouchableOpacity>
          
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
