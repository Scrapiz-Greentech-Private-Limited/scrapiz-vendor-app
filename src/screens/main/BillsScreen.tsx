import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-modern-datepicker';
import { useLanguage } from '../../utils/i18n';

interface BillsScreenProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

interface BillItem {
  id: string;
  customerName: string;
  amount: number;
  time: string;
  date: string;
  type: 'purchase' | 'sell';
}

const BillsScreen = ({ onBack, onNavigate }: BillsScreenProps) => {
  const { t } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState('Today');
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromDate, setFromDate] = useState('23/03/2026');
  const [toDate, setFromDate_to] = useState('23/03/2026'); // Wait, I should use separate state for to date
  const [toDateState, setToDate] = useState('23/03/2026');
  const [showFakeDatePicker, setShowFakeDatePicker] = useState<'from' | 'to' | null>(null);
  
  const [activeTab, setActiveTab] = useState<'purchase' | 'sell'>('purchase');
  const [selectedUnit, setSelectedUnit] = useState<'all' | 'pickup'>('pickup');
  
  const [hasData, setHasData] = useState(false); // Toggle this to see states

  const handleDateSelect = (date: string) => {
    setSelectedFilter(date);
    setShowCalendar(false);
    // In a real app, this would trigger a data fetch
    // For now, any selection shows dummy data
    setHasData(true);
  };

  const dummyBills: BillItem[] = [
    {
      id: '1',
      customerName: 'Shivanya Sharma',
      amount: 17,
      time: '12:17 PM',
      date: '31 Jan 2026',
      type: 'purchase',
    }
  ];

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-10">
      <View className="w-48 h-48 rounded-full bg-[#E5F1FF] items-center justify-center mb-6">
        <View className="w-32 h-32 rounded-full bg-[#C2E0FF] items-center justify-center overflow-hidden">
           <Ionicons name="receipt-outline" size={70} color="#4A90E2" />
        </View>
      </View>
      <Text className="text-[22px] font-bold text-[#333] mb-2">{t('no_bills_created') || 'No bills created'}</Text>
      <Text className="text-[16px] text-gray-400 text-center font-medium">
        {t('no_bills_yet') || 'No bills have been created yet.'}
      </Text>
    </View>
  );

  const renderBillsList = () => {
    const totalAmount = dummyBills.reduce((acc, bill) => acc + bill.amount, 0);
    return (
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View className="bg-[#F5F9FF] border border-[#E1EEFF] rounded-2xl p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[16px] font-semibold text-gray-600">Quantity Purchased</Text>
            <Text className="text-[16px] font-bold text-gray-900">45 kg, 2 pcs</Text>
          </View>
          <View className="h-[1px] bg-[#E1EEFF] mb-3" />
          <View className="flex-row justify-between items-center">
            <Text className="text-[16px] font-semibold text-gray-600">Purchase Amount</Text>
            <Text className="text-[18px] font-bold text-gray-900">₹ {totalAmount}</Text>
          </View>
        </View>

        {/* Bill Items */}
        {dummyBills.map((bill) => (
          <TouchableOpacity 
            key={bill.id} 
            onPress={() => onNavigate?.('purchase-bill-detail')}
            className="bg-white border border-gray-100 rounded-3xl p-5 mb-4 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3">
                  <MaterialIcons name="person" size={24} color="#999" />
                </View>
                <View>
                  <Text className="text-[16px] font-bold text-gray-900">{bill.customerName}</Text>
                  <Text className="text-[12px] text-gray-400">{bill.time}, {bill.date}</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                 <Text className="text-[20px] font-bold text-gray-900 mr-1">₹{bill.amount}</Text>
                 <MaterialIcons name="call-received" size={18} color="#1B7332" />
              </View>
            </View>
            <View className="border-t border-gray-50 pt-3 items-center">
              <View className="flex-row items-center">
                 <Text className="text-[15px] font-bold text-gray-600 mr-1">View Purchase Bill</Text>
                 <MaterialIcons name="arrow-forward" size={16} color="#666" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header Container with Light Blue Background */}
      <View className="bg-[#EBF5FF] pb-4">
        {/* Header */}
        <View className="px-5 pt-4 flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={onBack} className="w-10 h-10 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-[22px] font-bold text-gray-900">Bills</Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Ionicons name="search" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Date Filter */}
        <View className="flex-row items-center justify-center mb-2">
          <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
            <Ionicons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowCalendar(true)}
            className="mx-4 px-6 py-3 bg-white rounded-full shadow-sm flex-row items-center"
          >
            <Text className="text-[16px] font-bold text-gray-800 mr-2">{selectedFilter}</Text>
            <Ionicons name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm opacity-50">
            <Ionicons name="arrow-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Units Filter Chips */}
      <View className="flex-row px-5 py-6">
        <TouchableOpacity 
          onPress={() => setSelectedUnit('all')}
          className={`px-6 py-2.5 rounded-full border mr-3 ${selectedUnit === 'all' ? 'bg-[#1B7332] border-[#1B7332]' : 'bg-white border-gray-200'}`}
        >
          <Text className={`text-[15px] font-medium ${selectedUnit === 'all' ? 'text-white' : 'text-gray-600'}`}>All units</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setSelectedUnit('pickup')}
          className={`px-6 py-2.5 rounded-full border ${selectedUnit === 'pickup' ? 'bg-[#1B7332] border-[#1B7332]' : 'bg-white border-gray-200'}`}
        >
          <Text className={`text-[15px] font-medium ${selectedUnit === 'pickup' ? 'text-white' : 'text-gray-600'}`}>Pickup unit</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1">
        {hasData ? renderBillsList() : renderEmptyState()}
      </View>

      {/* Bottom Toggle */}
      <View className="px-5 pb-10">
        <View className="bg-black rounded-full p-1 flex-row relative">
          <TouchableOpacity 
            onPress={() => setActiveTab('purchase')}
            className={`flex-1 py-4 items-center justify-center rounded-full z-10 ${activeTab === 'purchase' ? 'bg-[#404040]' : ''}`}
          >
            <View className="flex-row items-center">
              <MaterialIcons name="receipt-long" size={20} color="white" className="mr-2" style={{marginRight: 8}}/>
              <Text className="text-white font-bold text-[16px]">Purchase</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('sell')}
            className={`flex-1 py-4 items-center justify-center rounded-full z-10 ${activeTab === 'sell' ? 'bg-[#404040]' : ''}`}
          >
            <View className="flex-row items-center">
              <MaterialIcons name="outbox" size={20} color="white" className="mr-2" style={{marginRight: 8}}/>
              <Text className="text-white font-bold text-[16px]">Sell</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selection Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowCalendar(false)} 
          />
          
          <View className="bg-white rounded-t-3xl p-6 pt-8 pb-10 shadow-2xl mt-auto">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-bold text-gray-900">{t('select_date')}</Text>
              <Text className="text-[14px] text-gray-600">Today, 23 Mar</Text>
            </View>
            
            <View className="border-b border-gray-100 mb-6" />

            <View className="flex-row flex-wrap gap-y-3 gap-x-2 mb-6">
              {['Today', 'Yesterday', 'Last 7 Days', 'This month', 'Last Month', 'Past 6 months', 'This year', 'Lifetime'].map((option) => {
                const isSelected = selectedFilter === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setSelectedFilter(option)}
                    className={`px-4 py-2.5 rounded-full border ${
                      isSelected 
                        ? 'bg-[#1B7332] border-[#1B7332]' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-[14px] font-medium ${
                      isSelected ? 'text-white' : 'text-gray-700'
                    }`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-[13px]">Or</Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            <View className="flex-row justify-between mb-8">
              <View className="flex-1 mr-3">
                <Text className="text-[13px] text-gray-600 mb-2">{t('from')}</Text>
                <TouchableOpacity 
                   onPress={() => setShowFakeDatePicker('from')}
                   className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className="text-[15px] text-gray-800 flex-1">{fromDate}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View className="flex-1 ml-3">
                <Text className="text-[13px] text-gray-600 mb-2">{t('to')}</Text>
                <TouchableOpacity 
                   onPress={() => setShowFakeDatePicker('to')}
                   className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className="text-[15px] text-gray-800 flex-1">{toDateState}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => handleDateSelect(selectedFilter)}
              className="bg-[#1B7332] py-4 rounded-xl items-center mb-6"
            >
              <Text className="text-white text-[16px] font-bold">{t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fake Date Picker Modal */}
      <Modal
        visible={showFakeDatePicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFakeDatePicker(null)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowFakeDatePicker(null)} />
          <View className="bg-white px-5 pb-8 pt-5 rounded-t-3xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[18px] font-bold text-gray-900">
                Select {showFakeDatePicker === 'from' ? 'From' : 'To'} Date
              </Text>
              <TouchableOpacity onPress={() => setShowFakeDatePicker(null)} className="p-2 bg-gray-100 rounded-full">
                <MaterialIcons name="close" size={20} color="#444" />
              </TouchableOpacity>
            </View>

            <DatePicker
              options={{
                backgroundColor: '#ffffff',
                textHeaderColor: '#1B7332',
                textDefaultColor: '#333333',
                selectedTextColor: '#ffffff',
                mainColor: '#1B7332',
                textSecondaryColor: '#999999',
                borderColor: 'rgba(122, 146, 165, 0.1)',
              }}
              isGregorian={true}
              mode="calendar"
              onSelectedChange={(date: string) => {
                const [year, month, day] = date.split('/');
                const formattedDate = `${day}/${month}/${year}`;
                if (showFakeDatePicker === 'from') setFromDate(formattedDate);
                if (showFakeDatePicker === 'to') setToDate(formattedDate);
                setShowFakeDatePicker(null);
              }}
              style={{ borderRadius: 10 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BillsScreen;
