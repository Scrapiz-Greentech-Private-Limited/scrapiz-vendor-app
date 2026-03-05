# Scrapiz Vendor App - Architecture Overview

## Project Structure

This is a React Native Expo application for scrap collection vendors. The app follows a modular architecture with clear separation of concerns.

### Technology Stack

- **Framework**: React Native with Expo (~54.0.32)
- **Language**: TypeScript (~5.9.2)
- **State Management**: React Context API (useAuth)
- **Navigation**: Custom tab-based navigation
- **Storage**: AsyncStorage (@react-native-async-storage/async-storage)
- **UI Components**: Custom components with Material Icons
- **Testing**: Jest with ts-jest

### Key Dependencies

```json
{
  "expo": "~54.0.32",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "@expo/vector-icons": "^15.0.3",
  "@react-native-async-storage/async-storage": "^2.2.0",
  "expo-haptics": "~15.0.8",
  "react-native-safe-area-context": "~5.6.0"
}
```

## Application Flow

### 1. Entry Point (`App.tsx`)

- Wraps app with `SafeAreaProvider`, `ErrorBoundary`, and `AuthProvider`
- Manages global navigation state
- Handles screen routing based on `activeTab` state
- Controls bottom navigation visibility

### 2. Authentication Flow

- **Login Screen** (`src/screens/auth/SimpleLogin.tsx`)
  - Phone number-based authentication
  - Mock login with 5% failure rate simulation
  - Validates 10-digit phone numbers
  - Sets user context on successful login

### 3. Main Navigation Tabs

1. **Home** - Dashboard with booking requests
2. **Manage** - Job management and operations
3. **Earnings** - Financial tracking and reports
4. **Profile** - User settings and preferences

## Core Features

### Credit System

The app implements a comprehensive credit-based booking system:

**Credit Flow:**

1. Vendor maintains credit balance
2. Accepting bookings deducts credits (1 credit per ₹100 order value)
3. Vendors can recharge credits via payment gateway
4. Low balance warnings and recharge prompts

**Credit Services:**

- `creditService.ts` - Main credit operations
- `creditRechargeService.ts` - Payment processing
- `creditApiService.ts` - Server synchronization
- `creditCacheService.ts` - Performance optimization
- `creditErrorHandler.ts` - Error management
- `creditRecoveryService.ts` - Data recovery
- `creditRetryManager.ts` - Retry logic
- `creditNotificationService.ts` - User notifications

### Booking Management

**Booking States:**

- **New Requests** - Displayed on Dashboard
- **Accepted** - Tracked in `bookingStateService`
- **Declined** - Logged with reason
- **Active Jobs** - In-progress pickups
- **Completed** - Finished jobs with earnings

**Booking Flow:**

1. New booking appears on Dashboard
2. Vendor reviews details in `BookingModal`
3. Credit validation before acceptance
4. Status updates: on-the-way → arrived → in-progress → completed
5. Job completion with scrap weighing
6. Earnings calculation and credit settlement

### Job Management

**Job Screens:**

- `ActiveJob.tsx` - Real-time job tracking with status updates
- `JobCompletion.tsx` - Scrap weighing and final amount calculation
- `JobManagementScreen.tsx` - Overview of all jobs (upcoming, pending, completed)
- `JobHistoryScreen.tsx` - Historical job records
- `FutureRequestsScreen.tsx` - Scheduled pickups
- `BookingDetailsScreen.tsx` - Detailed booking information

## Data Models

### Core Types (`src/types/index.ts`)

```typescript
// User & Authentication
interface User {
  id: string;
  name: string;
  phone: string;
  isOnline: boolean;
}

// Booking & Jobs
interface BookingRequest {
  id: string;
  scrapType: string;
  distance: string;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMode: string;
  estimatedAmount: number;
  createdAt: Date;
  priority?: "high" | "medium" | "low";
  estimatedTime?: string;
  customerRating?: number;
  isVerified?: boolean;
}

interface ActiveJob extends BookingRequest {
  status: "on-the-way" | "arrived" | "in-progress" | "completed";
  customerLocation: { lat: number; lng: number };
}

// Credit System
interface CreditTransaction {
  id: string;
  type: "deduction" | "addition" | "penalty";
  amount: number;
  description: string;
  timestamp: Date;
  bookingId?: string;
  orderValue?: number;
  paymentAmount?: number;
  status: "completed" | "pending" | "failed";
}

interface CreditBalanceData {
  vendorId: string;
  currentBalance: number;
  lastUpdated: Date;
  syncStatus: "synced" | "pending" | "error";
}

// Scrap & Materials
interface ScrapItem {
  type: string;
  weight?: number;
  ratePerKg: number;
  color?: string;
  icon?: string;
}
```

## Service Layer Architecture

### API Service (`src/services/api.ts`)

- Base HTTP client with request/response handling
- Mock implementations for frontend-only development
- Endpoints for credit sync, payment verification, transaction submission

### Storage Service (`src/services/storage.ts`)

- AsyncStorage wrapper for persistent data
- Credit balance and transaction storage
- Data validation and corruption detection
- Pending sync queue management

### Booking State Service (`src/services/bookingStateService.ts`)

- In-memory booking state management
- Accept/decline tracking
- Status updates and statistics
- Observable pattern with listeners

### Offline Manager (`src/services/offlineManager.ts`)

- Network status monitoring
- Offline operation queuing
- Automatic sync when online
- Data integrity validation

### Payment Service (`src/services/paymentService.ts`)

- Payment gateway integration (mocked)
- Transaction ID generation
- Payment verification
- Multiple payment methods support

## Component Architecture

### Common Components (`src/components/common/`)

- **Header** - Reusable page header with back navigation
- **LoadingSpinner** - Animated loading indicator
- **Toast** - Notification messages (success/error/info)
- **ErrorBoundary** - Global error handling

### UI Components (`src/components/ui/`)

- **BookingModal** - Detailed booking view with accept/decline
- **CreditBalance** - Credit display with warning states
- **CreditRechargeModal** - Credit purchase interface
- **CreditAnimations** - Reusable animation components
- **CreditLoadingState** - Loading skeletons for credit data
- **SkeletonLoader** - Shimmer loading placeholders
- **ThemedText/ThemedView** - Theme-aware components

### Navigation Components (`src/components/navigation/`)

- **BottomNavigation** - Tab bar with badges and active states

## Screen Organization

### Auth Screens (`src/screens/auth/`)

- `SimpleLogin.tsx` - Phone-based authentication

### Main Screens (`src/screens/main/`)

- `Dashboard.tsx` - Home screen with booking requests
- `EarningsScreen.tsx` - Financial reports and transaction history
- `ManageScreen.tsx` - Job management hub
- `MaterialsScreen.tsx` - Scrap material rates

### Job Screens (`src/screens/jobs/`)

- `ActiveJob.tsx` - Live job tracking
- `JobCompletion.tsx` - Final weighing and payment
- `JobManagementScreen.tsx` - All jobs overview
- `JobHistoryScreen.tsx` - Past jobs
- `FutureRequestsScreen.tsx` - Scheduled pickups
- `BookingDetailsScreen.tsx` - Booking information

### Profile Screens (`src/screens/profile/`)

- `ProfileScreen.tsx` - User profile hub
- `PersonalInfoScreen.tsx` - Edit personal details
- `EditProfileScreen.tsx` - Profile editing
- `VehicleScreen.tsx` - Vehicle management
- `VehicleDetailsScreen.tsx` - Vehicle information
- `VehicleStatusScreen.tsx` - Vehicle status tracking

### Settings Screens (`src/screens/settings/`)

- `AppSettingsScreen.tsx` - App preferences
- `PaymentSettingsScreen.tsx` - Payment methods
- `NotificationsScreen.tsx` - Notification preferences
- `LanguageScreen.tsx` - Language selection
- `HelpSupportScreen.tsx` - Help and support
- `AboutScreen.tsx` - App information
- `ContactsScreen.tsx` - Contact management
- `PrivacyScreen.tsx` - Privacy settings
- `MoreMenuScreen.tsx` - Additional options

### Credit Screens (`src/screens/credit/`)

- `CreditScreen.tsx` - Credit balance and transaction history

## State Management

### Context Providers

1. **AuthContext** (`hooks/useAuth.tsx`)
   - User authentication state
   - Login/logout functionality
   - Online status toggle
   - Loading states

### Local State Management

- Component-level state with `useState`
- Effect hooks for side effects
- Memoization with `useMemo` and `useCallback`
- Ref-based animations with `useRef`

## Performance Optimizations

### Credit System Optimizations

1. **Caching** (`creditCacheService.ts`)
   - Balance caching with TTL
   - Transaction list caching
   - Filter result caching
   - Preloading common filters

2. **Pagination**
   - Transaction history pagination (20 items per page)
   - Lazy loading with `hasMore` flag
   - Efficient list rendering with `FlatList`

3. **Performance Monitoring** (`creditPerformanceService.ts`)
   - Operation timing metrics
   - Real-time performance tracking
   - Performance summary reports

### UI Optimizations

- Memoized components with `React.memo`
- Optimized re-renders with `useMemo`/`useCallback`
- Native driver animations
- Skeleton loaders for perceived performance

## Error Handling

### Credit Error Management

- **Error Types**: Validation, Network, Storage, Payment, Sync, Data Corruption
- **Error Recovery**: Automatic retry with exponential backoff
- **User Feedback**: Toast notifications with actionable messages
- **Logging**: Comprehensive error logging with context

### Global Error Boundary

- Catches unhandled React errors
- Displays user-friendly error UI
- Retry functionality
- Development mode error details

## Testing Strategy

### Test Files

- `src/services/__tests__/creditService.test.ts`
- `src/services/__tests__/creditIntegration.test.ts`

### Test Configuration

- Jest with ts-jest transformer
- Property-based testing with fast-check
- Mock implementations for services
- Integration test coverage

## Build & Deployment

### Scripts

```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "lint": "expo lint",
  "test": "jest",
  "clean": "rm -rf node_modules && rm -rf .expo && npm install"
}
```

### Configuration Files

- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration
- `metro.config.js` - Metro bundler configuration
- `eslint.config.js` - Linting rules

## Security Considerations

1. **Phone Number Masking**: Partial masking before booking acceptance
2. **Credit Validation**: Server-side validation (mocked)
3. **Payment Security**: Secure transaction IDs and verification
4. **Data Encryption**: AsyncStorage data protection
5. **Error Sanitization**: No sensitive data in error messages

## Future Enhancements

1. **Real Backend Integration**: Replace mock APIs with actual endpoints
2. **Push Notifications**: Real-time booking alerts
3. **GPS Tracking**: Live location tracking during jobs
4. **Photo Upload**: Scrap photos for verification
5. **Multi-language Support**: Internationalization
6. **Offline Mode**: Full offline functionality
7. **Analytics**: User behavior tracking
8. **Chat System**: In-app customer communication
