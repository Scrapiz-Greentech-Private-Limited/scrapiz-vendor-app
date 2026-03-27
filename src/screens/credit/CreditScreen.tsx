import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-modern-datepicker';
import { useLanguage } from '../../utils/i18n';

interface CreditScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigate: (screen: string) => void;
}

export default function CreditScreen({ onBack, onShowToast, onNavigate }: CreditScreenProps) {
  const { t } = useLanguage();
  const [balance, setBalance] = useState<number>(-20);
  const [selectedPeriod, setSelectedPeriod] = useState('lifetime');
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromDate, setFromDate] = useState('21/02/2026');
  const [toDate, setToDate] = useState('21/02/2026');
  const [showFakeDatePicker, setShowFakeDatePicker] = useState<'from' | 'to' | null>(null);

  const transactions = [
    { id: '1', date: '31 Jan 2026', type: 'expense', title: 'Bill Charges', time: '12:17 PM', amount: -20, icon: 'receipt' },
    { id: '2', date: '28 Jan 2026', type: 'expense', title: 'Plan Purchased', time: '12:15 PM', amount: -499, icon: 'history' },
    { id: '3', date: '28 Jan 2026', type: 'income', title: 'Money Added', time: '12:15 PM', amount: 559, icon: 'add' },
    { id: '4', date: '29 Dec 2025', type: 'income', title: 'Reverted Bill Charges', time: '11:10 AM', amount: 20, icon: 'keyboard-return' },
    { id: '5', date: '29 Dec 2025', type: 'expense', title: 'Bill Charges', time: '11:10 AM', amount: -20, icon: 'receipt' },
  ];

  const handleDateSelect = (date: string) => {
    setSelectedPeriod(date);
    setShowCalendar(false);
  };

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: typeof transactions } = {};
    transactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups);
  }, [transactions]);

  const getPeriodLabel = (period: string) => {
    const labels: { [key: string]: string } = {
       today: 'Today',
       yesterday: 'Yesterday',
       last_7_days: 'Last 7 Days',
       this_month: 'This month',
       last_month: 'Last Month',
       past_6_months: 'Past 6 months',
       this_year: 'This year',
       lifetime: 'Lifetime'
    };
    return labels[period] || period;
  };

  return (
    <SafeAreaView className="flex-1 bg-white pb-20" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={onBack} className="p-2">
          <MaterialIcons name="chevron-left" size={32} color="#000" />
        </TouchableOpacity>
        <Text className="text-[22px] font-bold text-gray-900">Wallet</Text>
        <TouchableOpacity className="p-2">
          <MaterialIcons name="help-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View className="m-5 rounded-[32px] overflow-hidden bg-[#800F1B]">
           <View className="p-8 items-center">
              <View className="bg-white/10 w-16 h-16 rounded-2xl items-center justify-center mb-4">
                 <MaterialIcons name="account-balance-wallet" size={36} color="#fff" />
              </View>
              <Text className="text-white/80 text-[16px] font-medium mb-1">Available Balance</Text>
              <Text className="text-white text-[48px] font-bold mb-1">-₹{Math.abs(balance)}</Text>
              <Text className="text-white/60 text-[14px]">Pickup unit</Text>
              
              <Text className="text-white/80 text-center text-[13px] mt-6 leading-5 px-4">
                Wallet money can be used to pay for purchases and subscription plans within the app.
              </Text>

              {/* Warning Alert */}
              <View className="bg-black/20 rounded-2xl p-4 mt-8 flex-row items-center border border-white/10">
                 <MaterialIcons name="warning-amber" size={24} color="#FBBF24" />
                 <Text className="text-white text-[13px] font-medium flex-1 ml-3 leading-4">
                    Please add funds to your wallet to avoid suspension of your account.
                 </Text>
              </View>

              {/* Add Money Button */}
              <TouchableOpacity 
                className="bg-[#4CAF50] w-full mt-6 py-4 rounded-2xl items-center shadow-lg"
                onPress={() => onNavigate('add-money')}
              >
                 <Text className="text-white text-[18px] font-bold">+ Add Money</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Transactions Section */}
        <View className="px-5 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-[20px] font-bold text-gray-900">Transactions</Text>
            
            <View className="flex-row items-center">
              <TouchableOpacity className="p-2 mr-2">
                 <MaterialIcons name="chevron-left" size={28} color="#eee" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowCalendar(true)}
                className="bg-white border border-gray-100 px-4 py-2 rounded-2xl flex-row items-center shadow-sm"
              >
                <Text className="text-gray-700 text-[14px] font-bold mr-2">{getPeriodLabel(selectedPeriod)}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color="#333" />
              </TouchableOpacity>

              <TouchableOpacity className="p-2 ml-2">
                 <MaterialIcons name="chevron-right" size={28} color="#eee" />
              </TouchableOpacity>
            </View>
          </View>

          {groupedTransactions.map(([date, items]) => (
            <View key={date} className="mb-8">
              <View className="flex-row items-center mb-4">
                <View className="flex-1 h-[1px] bg-gray-100" />
                <Text className="mx-4 text-gray-400 text-[14px] font-medium">{date}</Text>
                <View className="flex-1 h-[1px] bg-gray-100" />
              </View>

              {items.map((tx) => (
                <View key={tx.id} className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-gray-50 items-center justify-center mr-4">
                      <MaterialIcons name={tx.icon as any} size={24} color="#666" />
                    </View>
                    <View>
                      <Text className="text-gray-900 text-[16px] font-bold">{tx.title}</Text>
                      <Text className="text-gray-400 text-[12px]">{tx.time}</Text>
                    </View>
                  </View>
                  <Text className={`text-[18px] font-bold ${tx.amount < 0 ? 'text-[#DC2626]' : 'text-[#4CAF50]'}`}>
                    {tx.amount < 0 ? `-₹${Math.abs(tx.amount)}` : `+₹${tx.amount}`}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Date Selection Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowCalendar(false)} />
          <View className="bg-white rounded-t-3xl p-6 pt-8 pb-10 shadow-2xl mt-auto">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-bold text-gray-900">{t('select_date')}</Text>
              <Text className="text-[14px] text-gray-600">Today, 21 Feb</Text>
            </View>
            <View className="border-b border-gray-100 mb-6" />
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
                const isSelected = selectedPeriod === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setSelectedPeriod(option.key)}
                    className={`px-4 py-2.5 rounded-full border ${
                      isSelected ? 'bg-[#1B7332] border-[#1B7332]' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-[14px] font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {t(option.key)}
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
                <TouchableOpacity onPress={() => setShowFakeDatePicker('from')} className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between">
                  <Text className="text-[15px] text-gray-800 flex-1">{fromDate}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[13px] text-gray-600 mb-2">{t('to')}</Text>
                <TouchableOpacity onPress={() => setShowFakeDatePicker('to')} className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between">
                  <Text className="text-[15px] text-gray-800 flex-1">{toDate}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDateSelect(selectedPeriod)} className="bg-[#1B7332] py-4 rounded-xl items-center mb-6">
              <Text className="text-white text-[16px] font-bold">{t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fake Date Picker Modal */}
      <Modal visible={showFakeDatePicker !== null} transparent={true} animationType="slide" onRequestClose={() => setShowFakeDatePicker(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowFakeDatePicker(null)} />
          <View className="bg-white px-5 pb-8 pt-5 rounded-t-3xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[18px] font-bold text-gray-900">Select {showFakeDatePicker === 'from' ? 'From' : 'To'} Date</Text>
              <TouchableOpacity onPress={() => setShowFakeDatePicker(null)} className="p-2 bg-gray-100 rounded-full">
                <MaterialIcons name="close" size={20} color="#444" />
              </TouchableOpacity>
            </View>
            <DatePicker
              options={{ backgroundColor: '#ffffff', textHeaderColor: '#1B7332', textDefaultColor: '#333333', selectedTextColor: '#ffffff', mainColor: '#1B7332', textSecondaryColor: '#999999', borderColor: 'rgba(122, 146, 165, 0.1)' }}
              isGregorian={true} mode="calendar"
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
}