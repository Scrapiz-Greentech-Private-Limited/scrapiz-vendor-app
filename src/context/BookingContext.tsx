import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { ApiService } from '../services/api';
import { BookingActiveResponse } from '../types';

export type StepKey = 'en_route' | 'arrived' | 'in_progress' | 'ready' | 'completed' | 'payment_pending';

export interface BookingState {
  activeBooking: BookingActiveResponse | null;
  bookingId: string | null;
  bookingStep: StepKey | null;
  otpSent: boolean;
  otpVerified: boolean;
  isLoading: boolean;
  error: string | null;
}

type BookingAction =
  | { type: 'SET_ACTIVE_ID'; payload: string | null }
  | { type: 'SET_BOOKING'; payload: BookingActiveResponse | null }
  | { type: 'SET_STEP'; payload: StepKey | null }
  | { type: 'SET_OTP_SENT'; payload: boolean }
  | { type: 'SET_OTP_VERIFIED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export interface BookingContextValue {
  activeBooking: BookingActiveResponse | null;
  bookingId: string | null;
  bookingStep: StepKey | null;
  otpSent: boolean;
  otpVerified: boolean;
  isLoading: boolean;
  error: string | null;
  setActiveBookingId: (id: string | null) => void;
  setActiveBooking: (booking: BookingActiveResponse | null) => void;
  setBookingStep: (step: StepKey | null) => void;
  setOtpSent: (sent: boolean) => void;
  setOtpVerified: (verified: boolean) => void;
  refreshBooking: () => Promise<void>;
}

const initialState: BookingState = {
  activeBooking: null,
  bookingId: null,
  bookingStep: null,
  otpSent: false,
  otpVerified: false,
  isLoading: false,
  error: null,
};

export const normalizeStep = (rawStep?: BookingActiveResponse['step'] | string): StepKey => {
  if (!rawStep) return 'en_route';
  if (typeof rawStep === 'number') {
    if (rawStep <= 1) return 'en_route';
    if (rawStep === 2) return 'arrived';
    if (rawStep === 3) return 'in_progress';
    return 'ready';
  }
  const s = String(rawStep).toLowerCase().trim();
  if (s === 'en_route' || s === 'heading_to_pickup' || s === 'started') return 'en_route';
  if (s === 'arrived' || s === 'at_location') return 'arrived';
  if (s === 'in_progress' || s === 'weighing' || s === 'collecting') return 'in_progress';
  if (s === 'ready' || s === 'weighed' || s === 'quote_ready') return 'ready';
  if (s === 'payment_pending' || s === 'awaiting_payment') return 'payment_pending';
  if (s === 'completed' || s === 'done' || s === 'paid') return 'completed';
  return 'en_route';
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_ACTIVE_ID':
      return {
        ...state,
        bookingId: action.payload,
        activeBooking: action.payload === state.bookingId ? state.activeBooking : null,
      };
    case 'SET_BOOKING': {
      const booking = action.payload;
      if (!booking) {
        return {
          ...state,
          activeBooking: null,
          bookingStep: null,
          otpSent: false,
          otpVerified: false,
        };
      }
      const normalized = normalizeStep(booking.step);
      const isContactUnlocked = Boolean(booking.contact_unlocked || !booking.customer?.phone_masked);
      const isPostOtpStep = normalized === 'in_progress' || normalized === 'ready' || normalized === 'completed' || normalized === 'payment_pending';

      return {
        ...state,
        activeBooking: booking,
        bookingId: booking.booking_id || state.bookingId,
        bookingStep: normalized,
        otpVerified: isContactUnlocked || isPostOtpStep || state.otpVerified,
      };
    }
    case 'SET_STEP':
      return { ...state, bookingStep: action.payload };
    case 'SET_OTP_SENT':
      return { ...state, otpSent: action.payload };
    case 'SET_OTP_VERIFIED':
      return {
        ...state,
        otpVerified: action.payload,
        bookingStep: action.payload && state.bookingStep === 'arrived' ? 'in_progress' : state.bookingStep,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshBooking = useCallback(async () => {
    const targetId = stateRef.current.bookingId || stateRef.current.activeBooking?.booking_id;
    if (!targetId) return;

    try {
      const response = await ApiService.getBookingActive(targetId);
      dispatch({ type: 'SET_BOOKING', payload: response });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err?.message || 'Failed to refresh booking' });
    }
  }, []);

  // Poll refreshBooking every 10 seconds when an active booking exists
  useEffect(() => {
    const targetId = state.bookingId || state.activeBooking?.booking_id;
    if (!targetId) return undefined;

    void refreshBooking();

    const interval = setInterval(() => {
      void refreshBooking();
    }, 10000);

    return () => clearInterval(interval);
  }, [state.bookingId, state.activeBooking?.booking_id, refreshBooking]);

  const setActiveBookingId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_ID', payload: id });
  }, []);

  const setActiveBooking = useCallback((booking: BookingActiveResponse | null) => {
    dispatch({ type: 'SET_BOOKING', payload: booking });
  }, []);

  const setBookingStep = useCallback((step: StepKey | null) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const setOtpSent = useCallback((sent: boolean) => {
    dispatch({ type: 'SET_OTP_SENT', payload: sent });
  }, []);

  const setOtpVerified = useCallback((verified: boolean) => {
    dispatch({ type: 'SET_OTP_VERIFIED', payload: verified });
  }, []);

  const contextValue: BookingContextValue = {
    activeBooking: state.activeBooking,
    bookingId: state.bookingId,
    bookingStep: state.bookingStep,
    otpSent: state.otpSent,
    otpVerified: state.otpVerified,
    isLoading: state.isLoading,
    error: state.error,
    setActiveBookingId,
    setActiveBooking,
    setBookingStep,
    setOtpSent,
    setOtpVerified,
    refreshBooking,
  };

  return <BookingContext.Provider value={contextValue}>{children}</BookingContext.Provider>;
};

export const useBooking = (): BookingContextValue => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export default BookingContext;
