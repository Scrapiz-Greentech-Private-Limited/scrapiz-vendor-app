import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StatusBar, Modal } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-modern-datepicker';
import { useLanguage } from '../../utils/i18n';

interface JobHistoryScreenProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

interface PastSession {
  id: string;
  driverName: string;
  driverImage: string;
  vehicleType: string;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
}

const dummySessions: PastSession[] = [
  {
    id: '1',
    driverName: 'Rahul Kumar',
    driverImage: 'https://i.pravatar.cc/150?img=11',
    vehicleType: 'Access',
    vehicleNumber: 'MH01DM8286',
    startTime: '28 Jan, 12:15 PM',
    endTime: '21 Feb, 8:06 PM',
  },
  {
    id: '2',
    driverName: 'Amit Singh',
    driverImage: 'https://i.pravatar.cc/150?img=12',
    vehicleType: 'Access',
    vehicleNumber: 'MH01DM8286',
    startTime: '8 Jan, 10:40 AM',
    endTime: '13 Jan, 12:00 PM',
  },
  {
    id: '3',
    driverName: 'Rahul Kumar',
    driverImage: 'https://i.pravatar.cc/150?img=11',
    vehicleType: 'Access',
    vehicleNumber: 'MH01DM8286',
    startTime: '31 Dec, 8:04 PM',
    endTime: '6 Jan, 10:17 AM',
  },
];

const JobHistoryScreen = ({ onBack, onNavigate }: JobHistoryScreenProps) => {
  const { t } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState(t('last_month'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromDate, setFromDate] = useState('21/02/2026');
  const [toDate, setToDate] = useState('21/02/2026');
  const [showFakeDatePicker, setShowFakeDatePicker] = useState<'from' | 'to' | null>(null);

  const handleDateSelect = (date: string) => {
    setSelectedFilter(date);
    setShowCalendar(false);
  };

  const renderSessionCard = (session: PastSession) => (
    <TouchableOpacity 
      key={session.id} 
      className="bg-white rounded-xl mb-4 p-4 border border-gray-100 shadow-sm"
      onPress={() => onNavigate?.('duty-session-details')}
    >
      <View className="flex-row items-center border-b border-gray-100 pb-3 mb-3">
        <Image 
          source={{ uri: session.driverImage }} 
          className="w-12 h-12 rounded-full mr-3 grayscale opacity-80"
        />
        <Text className="text-[16px] font-bold text-gray-800">{session.driverName}</Text>
      </View>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100 mr-3">
            <MaterialIcons name="two-wheeler" size={20} color="#9ca3af" />
          </View>
          <View>
            <Text className="text-[14px] font-bold text-gray-800">{session.vehicleType}</Text>
            <Text className="text-[12px] text-gray-500">{session.vehicleNumber}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[12px] text-gray-500 mb-1">
            {t('started')} : <Text className="text-gray-700">{session.startTime}</Text>
          </Text>
          <Text className="text-[12px] text-gray-500">
            {t('ended')} : <Text className="text-gray-700">{session.endTime}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="p-2 mr-2">
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-[28px] font-bold text-gray-900 tracking-tight flex-1">
          {t('past_duty_sessions')}
        </Text>
      </View>

      {/* Filter Selector */}
      <View className="flex-row items-center justify-center py-4">
        <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm">
          <Ionicons name="arrow-back" size={18} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowCalendar(true)}
          className="mx-3 px-5 py-2.5 bg-white rounded-full border border-gray-200 shadow-sm flex-row items-center"
        >
          <Text className="text-[15px] font-medium text-gray-800 mr-2">{selectedFilter}</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm opacity-50">
          <Ionicons name="arrow-forward" size={18} color="#666" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView 
        className="flex-1 px-5 pt-2"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {dummySessions.map(renderSessionCard)}
        {dummySessions.map(session => renderSessionCard({...session, id: session.id + '_dup'}))}
      </ScrollView>

      {/* Date Selection Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          {/* Dismiss overlay */}
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowCalendar(false)} 
          />
          
          <View className="bg-white rounded-t-3xl p-6 pt-8 pb-10 shadow-2xl mt-auto">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-bold text-gray-900">{t('select_date')}</Text>
              <Text className="text-[14px] text-gray-600">{t('today')}, 21 Feb</Text>
            </View>
            
            <View className="border-b border-gray-100 mb-6" />

            {/* Filter Pills */}
            <View className="flex-row flex-wrap gap-y-3 gap-x-2 mb-6">
              {['today', 'yesterday', 'last_7_days', 'this_month', 'last_month', 'past_6_months', 'this_year', 'lifetime'].map((key) => {
                const option = t(key);
                const isSelected = selectedFilter === option; // Treating selectedDate as string filter
                return (
                  <TouchableOpacity
                    key={key}
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

            {/* Or Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-[13px]">{t('or')}</Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {/* Date Pickers */}
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
                  <Text className="text-[15px] text-gray-800 flex-1">{toDate}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Done Button */}
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
                {t('select_date')} {showFakeDatePicker === 'from' ? t('from') : t('to')}
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
                // format YYYY/MM/DD to DD/MM/YYYY for dummy consistency
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

export default JobHistoryScreen;