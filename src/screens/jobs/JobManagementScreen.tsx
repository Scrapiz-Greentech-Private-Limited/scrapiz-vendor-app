import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  StatusBar,
  Animated
} from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import { bookingStateService, AcceptedBooking } from '../../services/bookingStateService';

import { useLanguage } from '../../utils/i18n';

interface JobManagementScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const JobManagementScreen = ({ onBack, onNavigate }: JobManagementScreenProps) => {
  const { t } = useLanguage();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toDateString());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [fromDate, setFromDate] = useState('21/02/2026');
  const [toDate, setToDate] = useState('21/02/2026');
  const [showFakeDatePicker, setShowFakeDatePicker] = useState<'from' | 'to' | null>(null);
  
  // Get accepted (upcoming) or in-progress bookings from service
  const [acceptedBookings, setAcceptedBookings] = useState<AcceptedBooking[]>([]);

  useEffect(() => {
    const loadBookings = () => {
      const bookings = bookingStateService.getAcceptedBookings();
      setAcceptedBookings(bookings);
    };

    loadBookings();
    const unsubscribe = bookingStateService.subscribe(loadBookings);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();

    return unsubscribe;
  }, []);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowCalendar(false);
    // Logic to navigate or filter by date could go here
    onNavigate?.('history'); // Navigate to history tab screen
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      {/* Dynamic Header */}
      <View className="px-6 pt-16 pb-4">
        <Text className="text-[36px] font-bold text-gray-900 tracking-tight">
          {t('duty_sessions')}
        </Text>
      </View>

      <ScrollView 
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {acceptedBookings.length === 0 ? (
            /* Empty State - Matches Screenshot Exactly */
            <View className="items-center justify-center py-16">
              <View className="w-56 h-56 rounded-full bg-[#E8F1FC] justify-center items-center mb-8 relative">
                <View className="w-36 h-36 rounded-full bg-[#CCE1FA] justify-center items-center overflow-hidden">
                  <MaterialIcons name="person" size={110} color="#85B7F2" />
                </View>
                <View className="absolute bottom-6 right-6 bg-white rounded-full p-2.5 shadow-md border border-[#D9E9FD]">
                  <MaterialIcons name="schedule" size={36} color="#2575E6" />
                </View>
              </View>
              <Text className="text-[26px] font-bold text-[#333] mb-2 text-center">
                {t('no_duty_session')}
              </Text>
              <Text className="text-[16px] text-gray-400 text-center font-medium">
                {t('no_session_to_show')}
              </Text>
            </View>
          ) : (
            /* Upcoming / In Progress Sessions List */
            <View className="mb-8">
              <Text className="text-[18px] font-bold text-gray-800 mb-4">{t('active_sessions')}</Text>
              {acceptedBookings.map((booking) => (
                <View 
                  key={booking.id} 
                  className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm"
                >
                  <View className="flex-row justify-between mb-3">
                    <View>
                      <Text className="text-[14px] font-bold text-[#1B7332] mb-1">{booking.scrapType}</Text>
                      <Text className="text-[18px] font-bold text-gray-900">{booking.customerName}</Text>
                    </View>
                    <Text className="text-[18px] font-bold text-gray-900">₹{booking.estimatedAmount}</Text>
                  </View>
                  <View className="flex-row items-center border-t border-gray-50 pt-3">
                    <MaterialIcons name="location-on" size={14} color="#666" />
                    <Text className="text-[13px] text-gray-500 ml-1 flex-1" numberOfLines={1}>
                      {booking.address}
                    </Text>
                    <TouchableOpacity 
                      className="bg-[#1B7332] px-4 py-2 rounded-xl"
                      onPress={() => onNavigate('JobDetails')}
                    >
                      <Text className="text-white font-bold text-[12px]">{t('view_details')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Past Duty Sessions Card */}
          <View className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-4 flex-row items-center justify-between mt-4">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-full bg-[#F5F5F5] border border-gray-100 justify-center items-center mr-2">
                <View className="bg-[#E8F5E8] rounded-2xl relative">
                   <MaterialIcons name="history" size={26} color="#1B7332" />
              
                </View>
              </View>
              <Text className="text-[20px] font-bold text-[#333]">
                {t('past_duty_sessions')}
              </Text>
            </View>
            <TouchableOpacity 
              className="px-4 py-1 rounded-full border-2 border-[#1B7332] justify-center items-center"
              onPress={() => setShowCalendar(true)}
            >
              <Text className="text-[14px] font-bold text-[#1B7332]">{t('view_details')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
              <Text className="text-[14px] text-gray-600">Today, 21 Feb</Text>
            </View>
            
            <View className="border-b border-gray-100 mb-6" />

            {/* Filter Pills */}
            <View className="flex-row flex-wrap gap-y-3 gap-x-2 mb-6">
              {[
                { label: 'Today', key: 'today' },
                { label: 'Yesterday', key: 'yesterday' },
                { label: 'Last 7 Days', key: 'last_7_days' },
                { label: 'This month', key: 'this_month' },
                { label: 'Last Month', key: 'last_month' },
                { label: 'Past 6 months', key: 'past_6_months' },
                { label: 'This year', key: 'this_year' },
                { label: 'Lifetime', key: 'lifetime' }
              ].map((option) => {
                const isSelected = selectedDate === option.label;
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setSelectedDate(option.label)}
                    className={`px-4 py-2.5 rounded-full border ${
                      isSelected 
                        ? 'bg-[#1B7332] border-[#1B7332]' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-[14px] font-medium ${
                      isSelected ? 'text-white' : 'text-gray-700'
                    }`}>
                      {t(option.key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Or Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-[13px]">Or</Text>
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

            <TouchableOpacity 
              onPress={() => handleDateSelect(selectedDate)}
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

    </View>
  );
};

export default JobManagementScreen;