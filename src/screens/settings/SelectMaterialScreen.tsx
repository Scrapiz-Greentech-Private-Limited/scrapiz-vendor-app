import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image, TextInput, FlatList } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Material {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  category: string;
}

const ALL_MATERIALS: Material[] = [
  { id: '101', name: 'Inverter Battery', price: 90.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/3103/3103306.png', category: 'Metal' },
  { id: '102', name: 'Casting Aluminium', price: 95.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2919/2919931.png', category: 'Metal' },
  { id: '103', name: 'Television (LCD/LED)', price: 10.0, unit: 'pcs', image: 'https://cdn-icons-png.flaticon.com/512/3421/3421035.png', category: 'E-waste' },
  { id: '104', name: 'Laptop', price: 50.0, unit: 'pcs', image: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png', category: 'E-waste' },
  { id: '105', name: 'Cardboard Box', price: 8.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/685/685388.png', category: 'Paper' },
  { id: '106', name: 'PET Bottles', price: 15.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2666/2666631.png', category: 'Plastic' },
  { id: '107', name: 'Copper Wire', price: 550.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2919/2919931.png', category: 'Metal' },
  { id: '108', name: 'Old Newspaper', price: 12.0, unit: 'kg', image: 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png', category: 'Paper' },
];

const CATEGORIES = ['All', 'Paper', 'Plastic', 'Metal', 'E-waste'];

interface SelectMaterialScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function SelectMaterialScreen({ onBack, onNavigate }: SelectMaterialScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredMaterials = useMemo(() => {
    return ALL_MATERIALS.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <SafeAreaView className="flex-1 bg-white pb-40" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="p-2 -ml-2 mr-2">
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text className="text-[28px] font-bold text-gray-900">Select material</Text>
      </View>

      <View className="px-5 mb-6">
        <Text className="text-[18px] text-gray-500 font-medium">
          You want to collect from the customer.
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="bg-white border border-gray-200 rounded-2xl flex-row items-center px-4 py-3 shadow-sm">
          <TextInput 
            className="flex-1 text-[16px] text-gray-900"
            placeholder="Search Materials"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search" size={22} color="#666" />
        </View>
      </View>

      {/* Category Pills */}
      <View className="mb-6">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`mr-3 px-6 py-2.5 rounded-full border ${selectedCategory === cat ? 'bg-[#1B7332] border-[#1B7332]' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-[15px] font-bold ${selectedCategory === cat ? 'text-white' : 'text-gray-500'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Material List */}
      <FlatList 
        data={filteredMaterials}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => toggleSelection(item.id)}
            className="bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-gray-100 shadow-sm mb-4"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-16 h-16 bg-gray-50 rounded-2xl items-center justify-center mr-4 overflow-hidden border border-gray-100">
                <Image 
                  source={{ uri: item.image }} 
                  className="w-12 h-12"
                  resizeMode="contain"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[18px] font-bold text-gray-900 mb-1 leading-tight">{item.name}</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-[18px] font-bold text-gray-800">₹{item.price.toFixed(1)}</Text>
                  <Text className="text-gray-400 text-[14px] ml-1">per {item.unit}</Text>
                </View>
              </View>
            </View>
            <View className={`w-8 h-8 rounded-full border-2 items-center justify-center ${selectedIds.has(item.id) ? 'bg-[#1B7332] border-[#1B7332]' : 'border-gray-300'}`}>
              {selectedIds.has(item.id) && <Ionicons name="checkmark" size={18} color="white" />}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Bottom Floating Action */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white/95 border-t border-gray-100 shadow-2xl">
        <View className="bg-gray-100 rounded-full py-2 px-4 self-center mb-4">
          <Text className="text-gray-500 text-[14px] font-bold">
            {selectedIds.size > 0 ? `${selectedIds.size} material${selectedIds.size > 1 ? 's' : ''} selected` : 'No material selected'}
          </Text>
        </View>
        <TouchableOpacity 
          disabled={selectedIds.size === 0}
          className={`w-full py-5 rounded-[20px] items-center justify-center ${selectedIds.size > 0 ? 'bg-[#1B7332]' : 'bg-gray-300'}`}
          onPress={() => onBack()}
        >
          <Text className="text-white text-[18px] font-bold">Add materials</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
