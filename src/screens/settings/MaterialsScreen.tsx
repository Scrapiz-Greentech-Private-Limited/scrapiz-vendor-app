import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Material {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
}

const MATERIALS_DATA: Material[] = [
  { id: '1', name: 'CPU', price: 100.0, unit: 'pcs', image: 'https://cdn-icons-png.flaticon.com/512/900/900834.png' },
  { id: '2', name: 'Iron', price: 22.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/6662/6662760.png' },
  { id: '3', name: 'Hard Plastic', price: 5.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2666/2666631.png' },
  { id: '4', name: 'Steel', price: 30.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2919/2919931.png' },
  { id: '5', name: 'Copper', price: 500.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2919/2919931.png' },
  { id: '6', name: 'Carton', price: 7.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/685/685388.png' },
  { id: '7', name: 'Newspaper', price: 10.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png' },
  { id: '8', name: 'Brass', price: 400.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2919/2919931.png' },
  { id: '9', name: 'Aluminium', price: 100.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2919/2919931.png' },
  { id: '10', name: 'AC (1 ton)', price: 3000.0, unit: 'pcs', image: 'https://cdn-icons-png.flaticon.com/512/911/911409.png' },
  { id: '11', name: 'Magazines', price: 0.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png' },
  { id: '12', name: 'Copy', price: 12.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png' },
  { id: '13', name: 'E-waste', price: 15.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/900/900834.png' },
];

interface MaterialsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function MaterialsScreen({ onBack, onNavigate }: MaterialsScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={onBack} className="p-2 -ml-2">
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onNavigate('select-material')}
          className="bg-gray-50 w-10 h-10 rounded-full items-center justify-center border border-gray-100 shadow-sm"
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mb-6">
          <Text className="text-[42px] font-bold text-gray-900 leading-tight">Materials</Text>
          <Text className="text-[18px] text-[#1B7332] font-semibold mt-1">27 Materials</Text>
        </View>

        <View className="gap-y-4">
          {MATERIALS_DATA.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MaterialCard = ({ material }: { material: Material }) => (
  <View className="bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-gray-100 shadow-sm">
    <View className="flex-row items-center flex-1">
      <View className="w-16 h-16 bg-gray-50 rounded-2xl items-center justify-center mr-4 overflow-hidden border border-gray-100">
        <Image 
          source={{ uri: material.image }} 
          className="w-12 h-12"
          resizeMode="contain"
        />
      </View>
      <View className="flex-1">
        <Text className="text-[18px] font-bold text-gray-900 mb-1">{material.name}</Text>
        <View className="flex-row items-baseline">
          <Text className="text-[18px] font-bold text-gray-800">₹{material.price.toFixed(1)}</Text>
          <Text className="text-gray-400 text-[14px] ml-1">per {material.unit}</Text>
        </View>
      </View>
    </View>
    <TouchableOpacity className="p-2">
      <Ionicons name="trash-outline" size={22} color="#999" />
    </TouchableOpacity>
  </View>
);
