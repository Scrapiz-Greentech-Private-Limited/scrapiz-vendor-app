import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";

interface AddVehicleScreenProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const VEHICLE_NUMBER_REQUIRED_TYPES = ["bike", "car", "mini-truck", "truck"];
const VEHICLE_META_REQUIRED_TYPES = ["bike", "car", "mini-truck"];

const VEHICLE_TYPES = [
  { id: "cycle", name: "Cycle", icon: "bicycle" },
  { id: "thela", name: "Thela", icon: "dolly" },
  { id: "bike", name: "Bike", icon: "motorbike" },
  { id: "car", name: "Car", icon: "car" },
  { id: "riksha", name: "Riksha", icon: "moped" },
  { id: "mini-truck", name: "Mini-truck", icon: "truck-delivery" },
  { id: "truck", name: "Truck", icon: "truck" },
];

export default function AddVehicleScreen({
  onComplete,
  onBack,
}: AddVehicleScreenProps) {
  const [selectedType, setSelectedType] = useState("thela");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleModelName, setVehicleModelName] = useState("");
  const [weightEquipment, setWeightEquipment] = useState("Digital Machine");
  const [showSuccess, setShowSuccess] = useState(false);
  const requiresVehicleNumber = VEHICLE_NUMBER_REQUIRED_TYPES.includes(selectedType);
  const requiresVehicleMeta = VEHICLE_META_REQUIRED_TYPES.includes(selectedType);

  const handleContinue = () => {
    if ((requiresVehicleNumber && !vehicleNumber.trim()) || (requiresVehicleMeta && (!vehicleName.trim() || !vehicleModelName.trim()))) {
      alert("Please enter vehicle details");
      return;
    }
    setShowSuccess(true);
  };

  const handleFinalSuccess = () => {
    setShowSuccess(false);
    const selectedVehicle = VEHICLE_TYPES.find((item) => item.id === selectedType);
    onComplete({
      type: selectedType,
      number: requiresVehicleNumber ? vehicleNumber.trim().toUpperCase() : undefined,
      name: requiresVehicleMeta ? vehicleName.trim() : undefined,
      modelName: requiresVehicleMeta ? vehicleModelName.trim() : undefined,
      equipment: weightEquipment,
      label: selectedVehicle?.name || selectedType,
    });
  };

  const renderVehicleItem = ({ item }: { item: (typeof VEHICLE_TYPES)[0] }) => {
    const isSelected = selectedType === item.id;
    return (
      <TouchableOpacity
        onPress={() => setSelectedType(item.id)}
        className={`m-1.5 rounded-2xl border items-center justify-center ${
          isSelected
            ? "bg-green-50 border-green-700"
            : "bg-white border-gray-200"
        }`}
        style={{ width: "30.8%", minHeight: 136, paddingHorizontal: 8, paddingVertical: 12 }}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={isSelected ? "#15803d" : "#9CA3AF"}
        />
        <Text
          className={`text-[12px] mt-2 text-center font-medium ${isSelected ? "text-green-800 font-bold" : "text-gray-500"}`}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };
const Header = (
    <Text className="text-lg font-semibold text-gray-700 my-4">
      Choose your vehicle
    </Text>
  );

  // 2. Move the Footer to a variable to prevent re-mounting on every state change
  const Footer = (
    <View className="mt-4">
      <View className="gap-y-4 mb-6">
        {requiresVehicleNumber ? (
          <View>
            <Text className="text-lg text-gray-500 mb-2 ml-1">Vehicle number</Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 text-lg text-slate-900"
              placeholder="Enter vehicle number"
              placeholderTextColor="#9CA3AF"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
            />
          </View>
        ) : null}

        {requiresVehicleMeta ? (
          <>
            <View>
              <Text className="text-lg text-gray-500 mb-2 ml-1">Vehicle name</Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-4 text-lg text-slate-900"
                placeholder="Enter Vehicle Name"
                placeholderTextColor="#9CA3AF"
                value={vehicleName}
                onChangeText={setVehicleName}
              />
            </View>

            <View>
              <Text className="text-lg text-gray-500 mb-2 ml-1">Vehicle model name</Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-4 text-lg text-slate-900"
                placeholder="Enter Vehicle Model"
                placeholderTextColor="#9CA3AF"
                value={vehicleModelName}
                onChangeText={setVehicleModelName}
              />
            </View>
          </>
        ) : null}
      </View>

      <Text className="text-lg font-semibold text-gray-700 mb-4">
        Select your weight equipment
      </Text>

      {[{ label: "Digital Machine", icon: "calculator" }, { label: "Tarazu", icon: "scale-balance" }].map((eq) => (
        <TouchableOpacity
          key={eq.label}
          onPress={() => setWeightEquipment(eq.label)}
          className="flex-row items-center bg-gray-50 rounded-2xl p-4 mb-3 border border-gray-100"
        >
          <View className="w-11 h-11 rounded-full bg-green-100 items-center justify-center mr-3">
            <MaterialCommunityIcons name={eq.icon as any} size={24} color="#166534" />
          </View>
          <Text className="flex-1 text-lg font-medium text-slate-800">{eq.label}</Text>
          <View className={`w-5 h-5 rounded-full border items-center justify-center ${weightEquipment === eq.label ? "border-green-700" : "border-gray-400"}`}>
            {weightEquipment === eq.label && <View className="w-3 h-3 rounded-full bg-green-700" />}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        className="bg-green-100 py-4 rounded-full items-center mt-6 mb-8 shadow-lg"
        onPress={handleContinue}
      >
        <Text className="text-green-800 text-lg font-bold">Continue</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-row items-center px-6 py-4 border-b mt-10 border-gray-100">
          <TouchableOpacity onPress={onBack} className="p-1 -ml-2">
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold ml-2 text-slate-900">Add Vehicle</Text>
        </View>

        <FlatList
          data={VEHICLE_TYPES}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={Header} // Pass the variable
          ListFooterComponent={Footer} // Pass the variable
        />
          {/* Success Modal */}
        <Modal transparent visible={showSuccess} animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center">
            <View className="w-[85%] bg-white rounded-[32px] p-8 items-center">
              <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-4">
                <View className="w-14 h-14 bg-green-500 rounded-full items-center justify-center shadow-lg shadow-green-200">
                  <Ionicons name="checkmark" size={36} color="white" />
                </View>
              </View>

              <Text className="text-xl font-bold text-slate-900 mb-2">
                Vehicle Added!
              </Text>

              <View className="border border-green-700 rounded-lg px-4 py-1.5 mb-6">
                <Text className="text-green-800 font-bold tracking-widest uppercase">
                  {requiresVehicleNumber ? vehicleNumber || "MH02AB4567" : (VEHICLE_TYPES.find((item) => item.id === selectedType)?.name || "Vehicle")}
                </Text>
              </View>

              <TouchableOpacity
                className="bg-green-800 w-full py-4 rounded-2xl items-center active:bg-green-900"
                onPress={handleFinalSuccess}
              >
                <Text className="text-white font-bold text-lg">Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
