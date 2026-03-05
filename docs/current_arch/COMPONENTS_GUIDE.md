# Component Usage Guide

## Component Hierarchy & Dependencies

### Common Components (`src/components/common/`)

#### 1. Header

**Purpose**: Reusable page header with navigation

**Props:**

```typescript
interface HeaderProps {
  title: string; // Page title
  onBack: () => void; // Back button handler
  rightElement?: ReactNode; // Optional right-side content
  isTransparent?: boolean; // Transparent background
  textColor?: string; // Custom text color
}
```

**Usage:**

```tsx
<Header
  title="Job Details"
  onBack={() => navigation.goBack()}
  rightElement={<Icon name="more-vert" />}
/>
```

**Dependencies:**

- `@expo/vector-icons` (MaterialIcons)
- React Native core components

**Used By:**

- Most screen components for consistent navigation

---

#### 2. LoadingSpinner

**Purpose**: Animated loading indicator

**Props:**

```typescript
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"; // Spinner size
  color?: string; // Spinner color
}
```

**Usage:**

```tsx
<LoadingSpinner size="md" color="#28a745" />
```

**Dependencies:**

- React Native Animated API
- No external dependencies

**Used By:**

- Dashboard (booking list loading)
- Credit screens (balance loading)
- Any async operation UI

---

#### 3. Toast

**Purpose**: Notification messages with auto-dismiss

**Props:**

```typescript
interface ToastProps {
  message: string; // Notification text
  type: "success" | "error" | "info"; // Toast type
  isVisible: boolean; // Visibility state
  onClose: () => void; // Close handler
  duration?: number; // Auto-dismiss time (ms)
}
```

**Usage:**

```tsx
<Toast
  message="Booking accepted!"
  type="success"
  isVisible={showToast}
  onClose={() => setShowToast(false)}
  duration={3000}
/>
```

**Dependencies:**

- `@expo/vector-icons` (MaterialIcons)
- React Native Animated API

**Used By:**

- App.tsx (global toast handler)
- All screens for user feedback

---

#### 4. ErrorBoundary

**Purpose**: Catches and handles React errors gracefully

**Props:**

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Custom error UI
}
```

**Usage:**

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Dependencies:**

- React error boundary lifecycle
- `@expo/vector-icons` (MaterialIcons)

**Used By:**

- App.tsx (root level error handling)

---

### UI Components (`src/components/ui/`)

#### 1. BookingModal

**Purpose**: Detailed booking view with accept/decline actions

**Props:**

```typescript
interface BookingModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline?: () => void;
  booking?: BookingRequest;
  currentCreditBalance?: number;
  onShowRechargeModal?: () => void;
  isAccepted?: boolean; // For already accepted jobs
}
```

**Usage:**

```tsx
<BookingModal
  isVisible={showModal}
  booking={selectedBooking}
  currentCreditBalance={creditBalance}
  onAccept={handleAccept}
  onDecline={handleDecline}
  onClose={() => setShowModal(false)}
  onShowRechargeModal={() => setShowRecharge(true)}
/>
```

**Dependencies:**

- `creditService` - Credit calculations
- `expo-haptics` - Tactile feedback
- `@expo/vector-icons` (MaterialIcons)
- React Native Modal, Animated

**Features:**

- 60-second countdown timer
- Credit requirement validation
- Customer contact information (masked until accepted)
- Earnings breakdown
- Quick actions (call, message, navigate)
- Animated entrance/exit

**Used By:**

- Dashboard (new booking requests)
- JobManagementScreen (accepted jobs)

---

#### 2. CreditBalance

**Purpose**: Displays current credit balance with warning states

**Props:**

```typescript
interface CreditBalanceProps {
  balance: number;
  onPress: () => void;
  showWarning?: boolean;
}
```

**Usage:**

```tsx
<CreditBalance
  balance={creditBalance}
  onPress={() => navigate("credit")}
  showWarning={creditBalance < 5}
/>
```

**Dependencies:**

- `creditAccessibility` utils
- `@expo/vector-icons` (MaterialIcons)
- Memoized with React.memo

**Features:**

- Low balance warning (< 5 credits)
- Accessibility labels
- Tap to navigate to credit screen

**Used By:**

- Dashboard header
- Any screen showing credit status

---

#### 3. CreditRechargeModal

**Purpose**: Credit purchase interface with payment options

**Props:**

```typescript
interface CreditRechargeModalProps {
  visible: boolean;
  onClose: () => void;
  onRechargeSuccess: (result: CreditRechargeResult) => void;
  onRechargeError: (error: string) => void;
  currentBalance: number;
  onNavigateToCredit?: () => void;
}
```

**Usage:**

```tsx
<CreditRechargeModal
  visible={showRecharge}
  currentBalance={balance}
  onRechargeSuccess={handleSuccess}
  onRechargeError={handleError}
  onClose={() => setShowRecharge(false)}
/>
```

**Dependencies:**

- `creditRechargeService` - Payment processing
- `paymentService` - Payment methods
- React Native Modal, ScrollView

**Features:**

- Predefined credit packages
- Custom credit amount input
- Multiple payment methods (UPI, Card, Wallet)
- Earnings summary
- Payment processing with loading states

**Used By:**

- Dashboard (insufficient credit prompt)
- CreditScreen (manual recharge)

---

#### 4. CreditAnimations

**Purpose**: Reusable animation components

**Components:**

- `FadeInView` - Fade in animation
- `SlideInView` - Slide from direction
- `ScaleInView` - Scale up animation
- `PulseView` - Continuous pulse
- `ShimmerView` - Shimmer effect

**Usage:**

```tsx
<FadeInView duration={300} delay={100}>
  <Text>Animated content</Text>
</FadeInView>

<SlideInView direction="up" distance={50}>
  <Card />
</SlideInView>
```

**Dependencies:**

- React Native Animated API
- Easing functions

**Used By:**

- CreditScreen (list animations)
- Dashboard (card animations)
- All screens for smooth transitions

---

#### 5. CreditLoadingState

**Purpose**: Loading skeletons for credit data

**Props:**

```typescript
interface CreditLoadingStateProps {
  type: "balance" | "transactions" | "full";
  message?: string;
}
```

**Usage:**

```tsx
<CreditLoadingState type="balance" />
<CreditLoadingState type="transactions" />
<CreditLoadingState type="full" message="Loading..." />
```

**Dependencies:**

- React Native ActivityIndicator
- `@expo/vector-icons` (MaterialIcons)

**Used By:**

- CreditScreen (loading states)
- Dashboard (credit balance loading)

---

#### 6. SkeletonLoader

**Purpose**: Shimmer loading placeholders

**Components:**

- `SkeletonLoader` - Generic skeleton
- `BookingCardSkeleton` - Booking card placeholder

**Usage:**

```tsx
<SkeletonLoader width="100%" height={20} borderRadius={4} />
<BookingCardSkeleton />
```

**Dependencies:**

- React Native Animated API

**Used By:**

- Dashboard (booking list loading)
- Any list with loading states

---

#### 7. ThemedText & ThemedView

**Purpose**: Theme-aware text and view components

**Props:**

```typescript
interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
}

interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
}
```

**Usage:**

```tsx
<ThemedView lightColor="#fff" darkColor="#000">
  <ThemedText type="title">Hello</ThemedText>
</ThemedView>
```

**Dependencies:**

- `useThemeColor` hook
- React Native core components

**Used By:**

- Any component needing theme support

---

### Navigation Components (`src/components/navigation/`)

#### BottomNavigation

**Purpose**: Tab bar navigation with badges

**Props:**

```typescript
interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  jobCounts?: {
    active: number;
    pending: number;
    upcoming: number;
  };
}
```

**Usage:**

```tsx
<BottomNavigation
  activeTab={activeTab}
  onTabChange={setActiveTab}
  jobCounts={{ active: 2, pending: 1, upcoming: 3 }}
/>
```

**Dependencies:**

- `@expo/vector-icons` (MaterialIcons)
- `react-native-safe-area-context`

**Features:**

- 4 tabs: Home, Manage, Earnings, Profile
- Badge notifications
- Active state styling
- Safe area handling

**Used By:**

- App.tsx (main navigation)

---

## Component Relationships

### Dashboard Flow

```
Dashboard
├── CreditBalance (header)
├── BookingModal (booking details)
│   └── CreditRechargeModal (insufficient credits)
├── SkeletonLoader (loading)
└── Toast (notifications)
```

### Credit Flow

```
CreditScreen
├── CreditBalance (balance display)
├── CreditLoadingState (loading)
├── CreditAnimations (list animations)
├── CreditRechargeModal (recharge)
└── Toast (notifications)
```

### Job Flow

```
ActiveJob
├── Header (navigation)
├── LoadingSpinner (status updates)
└── Toast (notifications)
    ↓
JobCompletion
├── Header (navigation)
├── ScrapItem inputs
└── Toast (completion)
```

## Styling Patterns

### Common Style Patterns

```typescript
// Card style
{
  backgroundColor: 'white',
  borderRadius: 16,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4
}

// Button style
{
  backgroundColor: '#1B7332',
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8
}

// Header style
{
  backgroundColor: '#1B7332',
  paddingTop: 44,
  paddingBottom: 16,
  paddingHorizontal: 16
}
```

### Color Palette

```typescript
const colors = {
  primary: "#1B7332", // Green
  success: "#28a745", // Success green
  error: "#dc3545", // Error red
  warning: "#FF9800", // Warning orange
  info: "#2196F3", // Info blue
  background: "#F7F9FC", // Light gray
  text: "#333", // Dark gray
  textLight: "#6c757d", // Medium gray
  border: "#e9ecef", // Light border
};
```

## Accessibility

### Accessibility Labels

All interactive components include:

- `accessible={true}`
- `accessibilityRole` (button, link, etc.)
- `accessibilityLabel` (descriptive text)
- `accessibilityHint` (action description)

### Credit Accessibility

```typescript
// From creditAccessibility.ts
creditAccessibilityLabels.balance(50, false);
// Returns: "Credit balance: 50 credits"

creditAccessibilityLabels.transaction(transaction);
// Returns: "Transaction: Booking acceptance, 5 credits deducted..."
```

## Performance Tips

1. **Memoization**: Use `React.memo` for expensive components
2. **Callbacks**: Use `useCallback` for event handlers
3. **Computed Values**: Use `useMemo` for derived data
4. **List Optimization**: Use `FlatList` with `getItemLayout`
5. **Native Driver**: Enable for animations
6. **Image Optimization**: Use appropriate sizes
7. **Lazy Loading**: Load data on demand

## Common Patterns

### Modal Pattern

```tsx
const [showModal, setShowModal] = useState(false);

<TouchableOpacity onPress={() => setShowModal(true)}>
  <Text>Open Modal</Text>
</TouchableOpacity>

<CustomModal
  visible={showModal}
  onClose={() => setShowModal(false)}
/>
```

### Loading Pattern

```tsx
const [loading, setLoading] = useState(false);

{
  loading ? <LoadingSpinner /> : <Content />;
}
```

### Error Pattern

```tsx
const [error, setError] = useState<string | null>(null);

{
  error && (
    <Toast message={error} type="error" onClose={() => setError(null)} />
  );
}
```
