import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Arrival Verification State Service
 * 
 * Persists the arrival face verification state across app restarts and 
 * navigation between screens. This ensures that once a vendor's face is
 * verified for a specific order, they don't need to re-verify even if
 * they exit the app or navigate away.
 */

const STORAGE_KEY = '@scrapiz_arrival_verification_state';

export interface ArrivalVerificationRecord {
  orderId: string;
  bookingId?: string;
  verifiedAt: string; // ISO timestamp
  // Optional metadata for audit/debugging
  vendorLat?: number;
  vendorLng?: number;
  faceMatchingUncertain?: boolean; // If verification was uncertain but accepted
}

export interface ArrivalVerificationState {
  verifiedOrders: ArrivalVerificationRecord[];
  lastUpdated: string; // ISO timestamp
}

/**
 * Arrival Verification State Service
 * 
 * Manages persistent storage of face verification records for arrival
 * verification flow. Once verified, a vendor won't need to repeat
 * face verification for that specific order/booking.
 */
class ArrivalVerificationStateService {
  private cachedState: ArrivalVerificationState | null = null;
  private listeners: Array<() => void> = [];

  /**
   * Get the entire verification state from storage
   */
  private async getState(): Promise<ArrivalVerificationState> {
    if (this.cachedState) {
      return this.cachedState;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this.cachedState = { verifiedOrders: [], lastUpdated: new Date().toISOString() };
        return this.cachedState;
      }

      const parsed = JSON.parse(stored) as ArrivalVerificationState;
      this.cachedState = {
        verifiedOrders: Array.isArray(parsed.verifiedOrders) ? parsed.verifiedOrders : [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
      return this.cachedState;
    } catch (error) {
      console.error('[ArrivalVerificationState] Failed to read state:', error);
      this.cachedState = { verifiedOrders: [], lastUpdated: new Date().toISOString() };
      return this.cachedState;
    }
  }

  /**
   * Persist state to storage
   */
  private async persistState(state: ArrivalVerificationState): Promise<void> {
    try {
      state.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.cachedState = state;
      this.notifyListeners();
    } catch (error) {
      console.error('[ArrivalVerificationState] Failed to persist state:', error);
      throw error;
    }
  }

  /**
   * Check if an order/booking has been face-verified
   */
  async isVerified(orderId: string, bookingId?: string): Promise<boolean> {
    const state = await this.getState();
    return state.verifiedOrders.some(record => 
      record.orderId === orderId || (bookingId && record.bookingId === bookingId)
    );
  }

  /**
   * Get the verification record for an order/booking
   */
  async getVerificationRecord(orderId: string, bookingId?: string): Promise<ArrivalVerificationRecord | null> {
    const state = await this.getState();
    return state.verifiedOrders.find(record => 
      record.orderId === orderId || (bookingId && record.bookingId === bookingId)
    ) || null;
  }

  /**
   * Mark an order/booking as face-verified
   */
  async markVerified(record: Omit<ArrivalVerificationRecord, 'verifiedAt'>): Promise<void> {
    const state = await this.getState();

    // Check if already exists
    const existingIndex = state.verifiedOrders.findIndex(r => 
      r.orderId === record.orderId || (record.bookingId && r.bookingId === record.bookingId)
    );

    const newRecord: ArrivalVerificationRecord = {
      ...record,
      verifiedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing record
      state.verifiedOrders[existingIndex] = newRecord;
    } else {
      // Add new record
      state.verifiedOrders.push(newRecord);
    }

    await this.persistState(state);
    console.log('[ArrivalVerificationState] Marked as verified:', record.orderId, record.bookingId);
  }

  /**
   * Remove verification record (e.g., after order completion/cancellation)
   */
  async removeVerification(orderId: string, bookingId?: string): Promise<void> {
    const state = await this.getState();
    const initialLength = state.verifiedOrders.length;

    state.verifiedOrders = state.verifiedOrders.filter(record => 
      !(record.orderId === orderId || (bookingId && record.bookingId === bookingId))
    );

    if (state.verifiedOrders.length < initialLength) {
      await this.persistState(state);
      console.log('[ArrivalVerificationState] Removed verification:', orderId, bookingId);
    }
  }

  /**
   * Clear all verification records (for logout or cleanup)
   */
  async clearAll(): Promise<void> {
    const state: ArrivalVerificationState = { verifiedOrders: [], lastUpdated: new Date().toISOString() };
    await this.persistState(state);
    console.log('[ArrivalVerificationState] Cleared all verification records');
  }

  /**
   * Clean up old verification records (older than maxAgeDays)
   * Useful to prevent indefinite growth of stored data
   */
  async cleanupOldData(maxAgeDays: number = 7): Promise<number> {
    const state = await this.getState();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const initialLength = state.verifiedOrders.length;
    state.verifiedOrders = state.verifiedOrders.filter(record => {
      const verifiedDate = new Date(record.verifiedAt);
      return verifiedDate >= cutoffDate;
    });

    if (state.verifiedOrders.length < initialLength) {
      await this.persistState(state);
      console.log(`[ArrivalVerificationState] Cleaned up ${initialLength - state.verifiedOrders.length} old records`);
    }

    return initialLength - state.verifiedOrders.length;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[ArrivalVerificationState] Listener error:', error);
      }
    });
  }

  /**
   * Get all verified orders (for debugging)
   */
  async getAllVerified(): Promise<ArrivalVerificationRecord[]> {
    const state = await this.getState();
    return [...state.verifiedOrders];
  }
}

// Export singleton instance
export const arrivalVerificationState = new ArrivalVerificationStateService();