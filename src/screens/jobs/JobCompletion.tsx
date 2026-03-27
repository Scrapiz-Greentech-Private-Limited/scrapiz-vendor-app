import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrapItem } from '../../types';
import { getFloatingElementMargin } from '../../utils/safeAreaUtils';
import { useLanguage } from '../../utils/i18n';

interface JobCompletionProps {
  onJobComplete: (totalAmount: number) => void;
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const scrapOptions: Omit<ScrapItem, 'weight'>[] = [
    { type: 'Paper', ratePerKg: 12, icon: 'description', color: '#3498db' },
    { type: 'Plastic', ratePerKg: 18, icon: 'inventory', color: '#2ecc71' },
    { type: 'Iron', ratePerKg: 25, icon: 'build', color: '#95a5a6' },
    { type: 'Aluminum', ratePerKg: 120, icon: 'local-drink', color: '#f1c40f' },
    { type: 'Brass', ratePerKg: 280, icon: 'scale', color: '#e67e22' },
    { type: 'Copper', ratePerKg: 450, icon: 'electrical-services', color: '#e74c3c' },
    { type: 'Steel', ratePerKg: 35, icon: 'construction', color: '#bdc3c7' },
    { type: 'Cardboard', ratePerKg: 8, icon: 'inventory-2', color: '#795548' },
];

const JobCompletion = ({ onJobComplete, onBack, onShowToast }: JobCompletionProps) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const floatingMargin = getFloatingElementMargin();
  
  const [scrapItems, setScrapItems] = useState<ScrapItem[]>([
    { ...scrapOptions[0], weight: 0 },
    { ...scrapOptions[1], weight: 0 },
    { ...scrapOptions[2], weight: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const updateWeight = (index: number, weight: number) => {
    try {
      const updatedItems = [...scrapItems];
      updatedItems[index].weight = Math.max(0, weight); // Ensure non-negative weight
      setScrapItems(updatedItems);
    } catch (error) {
      console.error('Error updating weight:', error);
      onShowToast('Error updating weight. Please try again.', 'error');
    }
  };

  const addItem = () => {
    try {
      const unusedItems = scrapOptions.filter(opt => !scrapItems.some(item => item.type === opt.type));
      if (unusedItems.length > 0) {
        setScrapItems([...scrapItems, { ...unusedItems[0], weight: 0 }]);
        onShowToast(`${unusedItems[0].type} added successfully`, 'success');
      } else {
        onShowToast('All scrap types have been added', 'info');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      onShowToast('Error adding item. Please try again.', 'error');
    }
  };

  const removeItem = (index: number) => {
    try {
      if (scrapItems.length <= 1) {
        onShowToast('At least one scrap item is required', 'error');
        return;
      }
      const updatedItems = scrapItems.filter((_, i) => i !== index);
      setScrapItems(updatedItems);
      onShowToast('Item removed successfully', 'success');
    } catch (error) {
      console.error('Error removing item:', error);
      onShowToast('Error removing item. Please try again.', 'error');
    }
  };

  const totalAmount = scrapItems.reduce((sum, item) => sum + ((item.weight || 0) * item.ratePerKg), 0);

  const handleComplete = async () => {
    if (totalAmount <= 0) {
      onShowToast('Please enter scrap weights before completing', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      onJobComplete(totalAmount);
      onShowToast(`Job completed! ₹${totalAmount.toFixed(0)} earned`, 'success');
    } catch (error) {
      console.error('Error completing job:', error);
      onShowToast('Error completing job. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('calculate_final_price')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {scrapItems.map((item, index) => (
          <View key={`${item.type}-${index}`} style={styles.scrapCard}>
            <View style={styles.scrapHeader}>
              <View style={[styles.scrapIcon, { backgroundColor: item.color }]}>
                <MaterialIcons name={item.icon as any} size={24} color="white" />
              </View>
              <View style={styles.scrapInfo}>
                <Text style={styles.scrapType}>{t(item.type.toLowerCase())}</Text>
                <Text style={styles.scrapRate}>₹{item.ratePerKg}/kg</Text>
              </View>
              <TouchableOpacity 
                style={[styles.removeButton, scrapItems.length <= 1 && styles.removeButtonDisabled]}
                onPress={() => removeItem(index)}
                disabled={scrapItems.length <= 1}
              >
                <MaterialIcons name="delete" size={20} color={scrapItems.length <= 1 ? '#ccc' : '#dc3545'} />
              </TouchableOpacity>
            </View>
            <View style={styles.scrapInput}>
              <View style={styles.weightContainer}>
                <Text style={styles.weightLabel}>{t('weight_kg')}</Text>
                <TextInput
                  style={styles.weightInput}
                  value={item.weight?.toString() || ''}
                  onChangeText={(text) => updateWeight(index, parseFloat(text) || 0)}
                  placeholder="0.0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountText}>₹{((item.weight || 0) * item.ratePerKg).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={[styles.addButton, scrapItems.length >= scrapOptions.length && styles.addButtonDisabled]}
          onPress={addItem}
          disabled={scrapItems.length >= scrapOptions.length}
        >
          <MaterialIcons name="add-circle" size={24} color="#1B7332" />
          <Text style={styles.addButtonText}>{t('add_another_scrap')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[
        styles.bottomSection,
        {
          paddingBottom: Math.max(insets.bottom + 16, floatingMargin.bottom),
        }
      ]}>
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <View style={styles.totalIcon}>
              <MaterialIcons name="currency-rupee" size={24} color="white" />
            </View>
            <View style={styles.totalInfo}>
              <Text style={styles.totalTitle}>{t('total_amount_payable')}</Text>
              <Text style={styles.totalSubtitle}>{t('payable_to_customer')}</Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.completeButton, (totalAmount <= 0 || isLoading) && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={totalAmount <= 0 || isLoading}
        >
          <MaterialIcons name="check-circle" size={20} color="white" />
          <Text style={styles.completeButtonText}>
            {isLoading ? t('processing') : t('complete_finalize')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    backgroundColor: '#1B7332',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 200,
  },
  scrapCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scrapIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scrapInfo: {
    flex: 1,
  },
  scrapType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scrapRate: {
    fontSize: 12,
    color: '#6c757d',
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  scrapInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  weightContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  weightInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    minWidth: 80,
  },
  amountContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B7332',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#1B7332',
    borderStyle: 'dashed',
    borderRadius: 16,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
    borderColor: '#ccc',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B7332',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  totalCard: {
    backgroundColor: '#1B7332',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalInfo: {
    flex: 1,
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  totalSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  completeButton: {
    backgroundColor: '#1B7332',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JobCompletion;