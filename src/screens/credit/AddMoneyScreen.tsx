import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AddMoneyScreenProps {
  onBack: () => void;
  onSuccess: (amount: number) => void;
  currentBalance: number;
}

export default function AddMoneyScreen({ onBack, onSuccess, currentBalance }: AddMoneyScreenProps) {
  const [step, setStep] = useState<'amount' | 'initiating'>('amount');
  const [amount, setAmount] = useState<number>(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    if (step === 'initiating') {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      setTimestamp(`${now.toLocaleDateString('en-US', options)} • ${now.toLocaleTimeString('en-US', timeOptions)}`);
    }
  }, [step]);

  const handleAddPress = () => {
    if (amount > 0) {
      setStep('initiating');
    }
  };

  const handleCancelPayment = () => {
    setShowCancelDialog(false);
    setStep('amount');
  };

  if (step === 'initiating') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Initiating Header */}
        <View className="flex-row justify-end px-4 py-3">
           <TouchableOpacity className="p-2">
              <MaterialIcons name="help-outline" size={28} color="#000" />
           </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center -mt-20">
           <View className="w-32 h-32 rounded-full bg-[#FBBF24]/10 items-center justify-center mb-8">
              <View className="w-24 h-24 rounded-full bg-[#FBBF24] items-center justify-center">
                 <MaterialIcons name="access-time" size={64} color="#fff" />
              </View>
           </View>

           <Text className="text-[42px] font-bold text-gray-900 mb-2">₹{amount}</Text>
           <Text className="text-[18px] text-gray-400 font-medium mb-1">Payment initiating...</Text>
           <Text className="text-[14px] text-gray-400">{timestamp}</Text>
        </View>

        {/* Back button triggers cancel dialog in this state */}
        <TouchableOpacity 
          onPress={() => setShowCancelDialog(true)}
          className="absolute top-12 left-4 p-2"
        >
          <MaterialIcons name="chevron-left" size={32} color="#000" />
        </TouchableOpacity>

        {/* Cancel Modal */}
        <Modal
          visible={showCancelDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCancelDialog(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-8">
             <View className="bg-white rounded-xl p-6 w-full max-w-sm">
                <Text className="text-[18px] font-medium text-gray-900 mb-8 leading-6">
                   Do you want to cancel the ongoing payment?
                </Text>
                
                <View className="items-end gap-y-4">
                   <TouchableOpacity onPress={() => setShowCancelDialog(false)}>
                      <Text className="text-[#3B82F6] text-[16px] font-bold">CONTINUE PAYMENT</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={handleCancelPayment}>
                      <Text className="text-[#3B82F6] text-[16px] font-bold">CANCEL PAYMENT</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#00529B]">
      <StatusBar barStyle="light-content" backgroundColor="#00529B" />
      
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={onBack} className="p-2">
          <MaterialIcons name="chevron-left" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center mt-10">
           {/* Money Icon */}
           <View className="w-28 h-28 rounded-full bg-[#ffffff10] items-center justify-center mb-6">
              <View className="bg-white/10 p-4 rounded-full">
                 <MaterialIcons name="account-balance-wallet" size={60} color="#AED581" />
              </View>
           </View>
           
           <Text className="text-white text-[18px] font-medium mb-4">Add amount to wallet</Text>
           <View className="flex-row items-center justify-center mb-2">
              <Text className="text-white text-[32px] font-bold mr-2">₹</Text>
              <Text className="text-white text-[64px] font-bold">{amount}</Text>
           </View>
           <View className="w-24 h-[1px] bg-white/30" />

           {/* Quick Select Buttons */}
           <View className="flex-row flex-wrap justify-center gap-2 mt-20 px-4">
              {[100, 200, 500, 1000].map((val) => (
                <TouchableOpacity 
                   key={val}
                   onPress={() => setAmount(val)}
                   className={`px-6 py-2.5 rounded-full border ${amount === val ? 'bg-[#4CAF50] border-[#4CAF50]' : 'border-white/30'}`}
                >
                   <Text className={`text-[18px] font-bold ${amount === val ? 'text-white' : 'text-white/80'}`}>₹{val}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>

        {/* Current Balance Bar */}
        <View className="bg-[#D9E9F7] mt-10 py-3 items-center">
           <Text className="text-gray-700 text-[18px] font-medium">
              Current Balance: <Text className="font-bold">₹{currentBalance}</Text>
           </Text>
        </View>

        {/* Filler to push content but not hide button */}
        <View className="h-40 bg-white" />
      </ScrollView>

      {/* Primary Action Button - Sticky at bottom */}
      <View className="bg-white p-5 border-t border-gray-100">
         <TouchableOpacity 
           onPress={handleAddPress}
           disabled={amount <= 0}
           className={`py-4 rounded-xl items-center shadow-lg ${amount > 0 ? 'bg-[#4CAF50]' : 'bg-[#DCFCE7]'}`}
         >
            <Text className={`text-[18px] font-bold ${amount > 0 ? 'text-white' : 'text-[#4CAF50]'}`}>
               Add ₹{amount}
            </Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
