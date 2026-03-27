import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RequestDetailsProps {
    onBack: () => void;
    request?: any; // Can be typed later
}

const RequestDetailsScreen = ({ onBack, request }: RequestDetailsProps) => {
    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-gray-50">
                <TouchableOpacity onPress={onBack} className="p-1 mr-4">
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-2xl font-[900] text-gray-900">Request Details</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
                {/* Status Section */}
                <View className="flex-row items-center mb-6">
                    <View className="w-10 h-10 rounded-full bg-green-700 justify-center items-center mr-3">
                        <Ionicons name="checkmark" size={24} color="white" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-base">Request handled</Text>
                        <Text className="text-gray-500 text-sm">Sun, 28 December 2025</Text>
                    </View>
                    <View className="bg-green-100 px-3 py-1.5 rounded-full">
                        <Text className="text-green-700 font-semibold text-xs">Payment Successful</Text>
                    </View>
                </View>

                {/* Customer Section */}
                <Text className="text-gray-500 font-semibold mb-2">Customer Name</Text>
                <View className="bg-white border border-gray-100 rounded-2xl p-4 flex-row items-center mb-6 shadow-sm shadow-gray-200">
                    <View className="w-12 h-12 rounded-full bg-green-50 justify-center items-center mr-3">
                        <Ionicons name="person-outline" size={24} color="#288A57" />
                    </View>
                    <View>
                        <Text className="text-gray-900 font-bold text-lg">Rashmi</Text>
                        <Text className="text-gray-400 text-sm">Request Id: 94762</Text>
                    </View>
                </View>

                {/* Bill Details */}
                <Text className="text-gray-500 font-semibold mb-2">Bill Details</Text>
                <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm shadow-gray-200">
                    <View className="mb-4">
                        <Text className="text-gray-700 font-bold text-base mb-2">AC (1 ton)</Text>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-500 text-sm">1 pcs X ₹3000/pcs</Text>
                            <Text className="text-gray-900 font-bold text-base">₹3000.00</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center mb-4 pt-4 border-t border-gray-50">
                        <Text className="text-gray-900 font-bold text-base">Sub Total:</Text>
                        <Text className="text-gray-900 font-bold text-base">₹3000.00</Text>
                    </View>

                    <View className="space-y-3 mb-4">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-400">Platform Charge</Text>
                            <Text className="text-gray-400">-₹10.00</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-400">Handling Charge</Text>
                            <Text className="text-gray-400">-₹10.00</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-end pt-4 border-t border-gray-100">
                        <View className="flex-row items-baseline">
                            <Text className="text-gray-900 font-extrabold text-2xl">Total:</Text>
                        </View>
                        <View className="flex-row items-baseline">
                            <Text className="text-gray-500 text-sm mr-2">1 pcs</Text>
                            <Text className="text-gray-900 font-extrabold text-2xl">₹2980.00</Text>
                        </View>
                    </View>
                </View>

                {/* Payments Section */}
                <Text className="text-gray-500 font-semibold mb-2">Payments</Text>
                <View className="bg-green-100 p-4 rounded-xl flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <View className="w-7 h-7 bg-green-700 rounded-full justify-center items-center mr-2">
                             <FontAwesome5 name="rupee-sign" size={14} color="white" />
                        </View>
                        <Text className="text-green-800 font-bold text-base">Paid Successfully</Text>
                    </View>
                    <Text className="text-green-800 font-extrabold text-lg">₹2980.00</Text>
                </View>

                <View className="flex-row items-center mb-4">
                    <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
                    <View className="flex-1 flex-row justify-between items-center">
                        <Text className="text-green-700 font-bold text-sm uppercase">Payment successful</Text>
                        <Text className="text-gray-400 text-xs">11:10 AM, 29 Dec 2025</Text>
                    </View>
                </View>

                <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 flex-row items-center shadow-sm shadow-gray-200">
                     <View className="w-12 h-12 bg-orange-50 rounded-full justify-center items-center mr-3 overflow-hidden">
                        <FontAwesome5 name="money-bill-wave" size={20} color="#F97316" />
                     </View>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-lg">Cash</Text>
                    </View>
                    <Text className="text-gray-900 font-extrabold text-lg">₹2980.00</Text>
                </View>

                <View className="bg-white border border-gray-50 rounded-2xl p-4 flex-row justify-between mb-4">
                    <Text className="text-gray-400">Payer Name</Text>
                    <Text className="text-gray-800 font-semibold">Rakesh Singh</Text>
                </View>

                <Text className="text-green-700 text-sm mb-6">You've paid the full amount. No dues left.</Text>

                {/* Assigned to Section */}
{/* Assigned to Section */}
<Text className="text-gray-500 font-semibold mb-2 ml-1">Assigned to</Text>
<View className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm">
    {/* Profile Row */}
    <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-full bg-gray-200 mr-3 overflow-hidden justify-center items-center">
            <Ionicons name="person" size={32} color="#9ca3af" />
        </View>
        <Text className="text-gray-900 font-bold text-lg">Rakesh Singh</Text>
    </View>
    
    {/* Vehicle Row */}
    <View className="border-t border-gray-50 pt-4 flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-gray-50 justify-center items-center mr-3">
            <Ionicons name="bicycle-outline" size={24} color="#6b7280" />
        </View>
        <View>
            <Text className="text-gray-900 font-bold">Access</Text>
            <Text className="text-gray-400 text-xs uppercase tracking-wider">MH01DM8286</Text>
        </View>
    </View>
</View>

{/* Feedback Section */}
<View className="bg-white border border-gray-100 rounded-2xl p-6 mb-10 shadow-sm">
    {/* Icon and Text Side-by-Side */}
    <View className="flex-row items-center mb-6">
        <View className="w-14 h-14 rounded-full bg-green-50 justify-center items-center mr-4">
            <Ionicons name="person-outline" size={30} color="#16a34a" /> 
        </View>
        <View className="flex-1">
            <Text className="text-gray-800 font-bold text-base leading-5">
                How was your experience building with{" "}
                <Text className="text-green-600">Rashmi Todankar</Text>?
            </Text>
        </View>
    </View>

    <Text className="text-gray-900 font-semibold mb-4">Rate your experience</Text>
    
    {/* Stars Row */}
    <View className="flex-row justify-center items-center">
        {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} className="mr-2">
                <Ionicons name="star-outline" size={32} color="#d1d5db" />
            </TouchableOpacity>
        ))}
    </View>
</View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default RequestDetailsScreen;
