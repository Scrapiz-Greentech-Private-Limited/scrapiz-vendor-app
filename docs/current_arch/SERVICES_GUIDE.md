# Services Layer Guide

## Overview

This document provides an in-depth look at the service layer architecture of the Scrapiz Vendor App. The service layer handles all business logic, data management, API communication, and state synchronization.

---

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [Credit System Services](#credit-system-services)
3. [Booking Management Services](#booking-management-services)
4. [Payment Services](#payment-services)
5. [Storage Services](#storage-services)
6. [Offline Management](#offline-management)
7. [Service Dependencies](#service-dependencies)

---

## Service Architecture

### Design Principles

1. **Singleton Pattern**: All services use singleton instances for consistent state
2. **Separation of Concerns**: Each service handles a specific domain
3. **Error Handling**: Comprehensive error handling with recovery mechanisms
4. **Offline-First**: Services work offline and sync when online
5. **Performance Optimization**: Caching, batching, and lazy loading
6. **Type Safety**: Full TypeScript type definitions

### Service Layer Structure

```
src/services/
├── creditService.ts              # Main credit management
├── creditApiService.ts           # Credit API communication
├── creditCacheService.ts         # Credit data caching
├── creditErrorHandler.ts         # Credit error handling
├── creditNotificationService.ts  # Credit notifications
├── creditPerformanceService.ts   # Performance monitoring
├── creditRechargeService.ts      # Credit recharge logic
├── creditRecoveryService.ts      # Error recovery
├── creditRetryManager.ts         # Retry logic
├── bookingStateService.ts        # Booking state management
├── paymentService.ts             # Payment processing
├── storage.ts                    # Local storage
├── offlineManager.ts             # Offline operations
├── hapticService.ts              # Haptic feedback
└── api.ts                        # Base API service
```

---

## Credit System Services

### 1. Credit Service (creditService.ts)

**Purpose**: Main orchestrator for all credit-related operations

**Key Methods**:

```typescript
class CreditService {
  // Balance Management
  getCurrentBalance(): Promise<number>;

  // Credit Operations
  deductCredits(
    amount: number,
    bookingId: string,
    orderValue: number,
  ): Promise<boolean>;
  addCredits(
    amount: number,
    transactionId: string,
    paymentAmount: number,
  ): Promise<void>;

  // Transaction History
  getTransactionHistory(
    filter?: TransactionFilter,
  ): Promise<CreditTransaction[]>;
  getPaginatedTransactionHistory(
    filter?,
    limit,
    offset,
  ): Promise<PaginatedResult>;

  // Calculations
  calculateRequiredCredits(orderValue: number): number;
  hasSufficientCredits(orderValue: number): Promise<boolean>;

  // Synchronization
  syncWithServer(): Promise<void>;

  // System Health
  validateDataIntegrity(): Promise<boolean>;
  performHealthCheck(): Promise<HealthStatus>;
  optimizePerformance(): Promise<void>;
}
```

**Usage Example**:

```typescript
import { creditService } from "./services/creditService";

// Get current balance
const balance = await creditService.getCurrentBalance();

// Calculate required credits
const required = creditService.calculateRequiredCredits(450); // Returns 5

// Deduct credits for booking
const success = await creditService.deductCredits(5, "BK001", 450);
```

**Dependencies**:

- CreditStorageService
- creditNotificationService
- offlineManager
- creditApiService
- creditErrorHandler
- creditRetryManager
- creditRecoveryService
- creditCacheService
- creditPerformanceService

### 2. Credit API Service (creditApiService.ts)

**Purpose**: Handles all API communication for credit operations

**Key Features**:

- Server synchronization
- Transaction submission
- Balance updates
- Conflict resolution

**Integration Points**:

- `POST /vendors/{vendorId}/credits/sync` - Sync credit data
- `GET /vendors/{vendorId}/credits/balance` - Get server balance
- `POST /vendors/{vendorId}/credits/deduct` - Submit deduction
- `POST /vendors/{vendorId}/credits/add` - Submit addition

---

### 3. Credit Cache Service (creditCacheService.ts)

**Purpose**: Optimizes performance through intelligent caching

**Key Features**:

- Balance caching with TTL (5 minutes)
- Transaction history caching
- Filtered transaction caching
- Pagination support
- Cache invalidation strategies

**Cache Statistics**:

```typescript
interface CacheStats {
  balanceHits: number;
  balanceMisses: number;
  transactionHits: number;
  transactionMisses: number;
  hitRate: number;
}
```

**Usage**:

```typescript
// Automatic caching in creditService
const balance = await creditService.getCurrentBalance(); // Cached for 5 mins
const transactions = await creditService.getTransactionHistory(); // Cached
```

---

### 4. Credit Error Handler (creditErrorHandler.ts)

**Purpose**: Centralized error handling and validation

**Error Types**:

```typescript
enum CreditErrorType {
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  SYNC_ERROR = "SYNC_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATA_CORRUPTION = "DATA_CORRUPTION",
  SYSTEM_ERROR = "SYSTEM_ERROR",
}
```

**Validation Methods**:

- `validateCreditAmount(amount: number)`
- `validateOrderValue(orderValue: number)`
- `validatePaymentAmount(amount: number)`
- `validateTransactionId(id: string)`

**Error Handling**:

- `handleInsufficientCredits(required, available, bookingId)`
- `handlePaymentError(error, amount)`
- `handleNetworkError(error, operation)`
- `handleStorageError(error, operation)`
- `handleSyncError(error, operation)`
- `handleDataCorruption(details)`

---

### 5. Credit Notification Service (creditNotificationService.ts)

**Purpose**: User notifications for credit events

**Notification Types**:

- Balance changes
- Insufficient credits
- Low balance warnings
- Booking acceptance success
- Payment success/failure
- Sync errors

**Key Methods**:

```typescript
showInsufficientCreditPrompt(required, available, bookingId);
showLowBalanceWarning(balance, threshold);
showBookingAcceptanceSuccess(customerName, creditsDeducted, newBalance);
handleBalanceChange(oldBalance, newBalance, transaction);
```

---

### 6. Credit Performance Service (creditPerformanceService.ts)

**Purpose**: Monitor and optimize service performance

**Metrics Tracked**:

- Operation execution time
- Cache hit rates
- API response times
- Error rates
- Memory usage

**Performance Monitoring**:

```typescript
// Automatic performance tracking
const result = await creditPerformanceService.measureAsync(
  "get_balance",
  async () => await fetchBalance(),
);

// Get metrics
const metrics = creditPerformanceService.getRealTimeMetrics();
const summary = creditPerformanceService.getPerformanceSummary();
```

---

### 7. Credit Recharge Service (creditRechargeService.ts)

**Purpose**: Handle credit purchase and recharge

**Recharge Packages**:

```typescript
const packages = [
  { credits: 10, amount: 100, bonus: 0 },
  { credits: 50, amount: 500, bonus: 5 },
  { credits: 100, amount: 1000, bonus: 15 },
  { credits: 500, amount: 5000, bonus: 100 },
];
```

**Recharge Flow**:

1. User selects package
2. Payment initiated via paymentService
3. Payment verified
4. Credits added to balance
5. Transaction recorded
6. User notified

---

### 8. Credit Recovery Service (creditRecoveryService.ts)

**Purpose**: Automatic error recovery and data restoration

**Recovery Strategies**:

- Retry failed operations
- Restore from backup
- Sync from server
- Reset to default state

**Recovery Plans**:

```typescript
interface RecoveryPlan {
  error: CreditError;
  steps: RecoveryStep[];
  canAutoRecover: boolean;
  requiresUserAction: boolean;
  estimatedTime: number;
}
```

---

### 9. Credit Retry Manager (creditRetryManager.ts)

**Purpose**: Intelligent retry logic for failed operations

**Retry Configurations**:

```typescript
const configs = {
  credit_deduction: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 },
  credit_addition: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 },
  balance_sync: { maxRetries: 5, baseDelay: 2000, maxDelay: 10000 },
  transaction_sync: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 },
  payment_verification: { maxRetries: 5, baseDelay: 2000, maxDelay: 10000 },
};
```

**Retry Strategy**:

- Exponential backoff
- Jitter to prevent thundering herd
- Operation-specific configurations
- Automatic retry for transient errors

---

## Booking Management Services

### Booking State Service (bookingStateService.ts)

**Purpose**: Manage booking lifecycle and state

**Key Features**:

- Accept/decline bookings
- Track booking status
- State change notifications
- Statistics tracking

**Booking States**:

```typescript
type BookingStatus = "accepted" | "in-progress" | "completed" | "cancelled";
```

**Key Methods**:

```typescript
class BookingStateService {
  acceptBooking(booking: BookingRequest, vendorId: string): AcceptedBooking;
  declineBooking(
    booking: BookingRequest,
    vendorId: string,
    reason?: string,
  ): DeclinedBooking;
  updateBookingStatus(bookingId: string, status: BookingStatus): boolean;
  getAcceptedBookings(): AcceptedBooking[];
  getBookingsByStatus(status: BookingStatus): AcceptedBooking[];
  isBookingProcessed(bookingId: string): boolean;
  subscribe(listener: () => void): () => void;
  getStats(): BookingStats;
}
```

**Usage Example**:

```typescript
import { bookingStateService } from "./services/bookingStateService";

// Accept booking
const accepted = bookingStateService.acceptBooking(booking, vendorId);

// Update status
bookingStateService.updateBookingStatus(bookingId, "in-progress");

// Subscribe to changes
const unsubscribe = bookingStateService.subscribe(() => {
  console.log("Booking state changed");
});
```

**Integration with Credit System**:

```typescript
// Before accepting booking
const required = creditService.calculateRequiredCredits(
  booking.estimatedAmount,
);
const hasCredits = await creditService.hasSufficientCredits(
  booking.estimatedAmount,
);

if (hasCredits) {
  const success = await creditService.deductCredits(
    required,
    booking.id,
    booking.estimatedAmount,
  );
  if (success) {
    bookingStateService.acceptBooking(booking, vendorId);
  }
}
```

---

## Payment Services

### Payment Service (paymentService.ts)

**Purpose**: Handle all payment operations for credit recharge

**Supported Payment Methods**:

- UPI (Unified Payments Interface)
- Credit/Debit Cards
- Net Banking
- Digital Wallets

**Key Methods**:

```typescript
class PaymentService {
  getPaymentMethods(): Promise<PaymentMethod[]>;
  initiatePayment(amount: number, credits: number): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<boolean>;
  cancelPayment(transactionId: string): Promise<boolean>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  processRefund(transactionId: string, amount: number): Promise<PaymentResult>;
}
```

**Payment Flow**:

1. **Initiation**:

```typescript
const result = await paymentService.initiatePayment(1000, 100);
if (result.success) {
  // Payment initiated, redirect to gateway
  const transactionId = result.transactionId;
}
```

2. **Verification**:

```typescript
const verified = await paymentService.verifyPayment(transactionId);
if (verified) {
  // Add credits to account
  await creditService.addCredits(100, transactionId, 1000);
}
```

3. **Status Tracking**:

```typescript
const status = await paymentService.getPaymentStatus(transactionId);
// Returns: 'pending' | 'success' | 'failed' | 'cancelled'
```

**Error Handling**:

- Network timeouts
- Payment gateway errors
- Insufficient funds
- Card declined
- Invalid transaction

**Mock Implementation**:

- 90% success rate for testing
- Simulates various failure scenarios
- Realistic processing delays (2-5 seconds)

---

## Storage Services

### Storage Service (storage.ts)

**Purpose**: Local data persistence using AsyncStorage

**Key Features**:

- Credit balance storage
- Transaction history storage
- Pending sync queue
- Data encryption (future)
- Backup and restore

**Storage Keys**:

```typescript
const STORAGE_KEYS = {
  CREDIT_BALANCE: "@scrapiz_credit_balance",
  CREDIT_TRANSACTIONS: "@scrapiz_credit_transactions",
  PENDING_SYNC: "@scrapiz_pending_sync",
  USER_PROFILE: "@scrapiz_user_profile",
  APP_SETTINGS: "@scrapiz_app_settings",
};
```

**Key Methods**:

```typescript
class CreditStorageService {
  // Balance Operations
  static getCreditBalance(): Promise<CreditBalanceData | null>;
  static storeCreditBalance(balance: CreditBalanceData): Promise<void>;
  static initializeDefaultBalance(vendorId: string): Promise<CreditBalanceData>;

  // Transaction Operations
  static getCreditTransactions(): Promise<CreditTransaction[]>;
  static addCreditTransaction(transaction: CreditTransaction): Promise<void>;
  static clearOldTransactions(daysToKeep: number): Promise<void>;

  // Sync Queue
  static getPendingSync(): Promise<string[]>;
  static storePendingSync(operations: string[]): Promise<void>;
  static addPendingOperation(operation: string): Promise<void>;
  static removePendingOperation(operation: string): Promise<void>;
}
```

**Data Persistence Strategy**:

- Immediate writes for critical data (balance, transactions)
- Batched writes for non-critical data
- Automatic cleanup of old data
- Data integrity validation on read

**Usage Example**:

```typescript
// Store balance
await CreditStorageService.storeCreditBalance({
  vendorId: "vendor_123",
  currentBalance: 50,
  lastUpdated: new Date(),
  pendingTransactions: [],
  syncStatus: "synced",
});

// Retrieve balance
const balance = await CreditStorageService.getCreditBalance();

// Add transaction
await CreditStorageService.addCreditTransaction({
  id: "txn_123",
  type: "deduction",
  amount: 5,
  description: "Booking acceptance",
  timestamp: new Date(),
  status: "completed",
});
```

---

## Offline Management

### Offline Manager (offlineManager.ts)

**Purpose**: Handle offline scenarios and data synchronization

**Key Features**:

- Network status monitoring
- Operation queuing
- Automatic sync when online
- Conflict resolution
- Data integrity validation

**Operation Queue**:

```typescript
interface OfflineOperation {
  type:
    | "credit_deduction"
    | "credit_addition"
    | "transaction_submit"
    | "balance_update";
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}
```

**Key Methods**:

```typescript
class OfflineManager {
  // Network Status
  getNetworkStatus(): boolean;
  startNetworkMonitoring(): void;
  stopNetworkMonitoring(): void;

  // Operation Queue
  queueOfflineOperation(operation: OfflineOperation): Promise<void>;
  processOfflineQueue(): Promise<void>;
  clearOfflineQueue(): Promise<void>;

  // Synchronization
  forceSync(): Promise<void>;
  getSyncStatus(): boolean;

  // Data Integrity
  validateDataIntegrity(): Promise<IntegrityCheck>;
  recoverFromCorruption(): Promise<void>;
}
```

**Sync Strategy**:

1. **Queue Operations Offline**:

```typescript
await offlineManager.queueOfflineOperation({
  type: "credit_deduction",
  data: { transactionId: "txn_123" },
  maxRetries: 5,
});
```

2. **Auto-Sync When Online**:

```typescript
// Automatically triggered when network becomes available
offlineManager.startNetworkMonitoring();
```

3. **Manual Sync**:

```typescript
await offlineManager.forceSync();
```

**Conflict Resolution**:

- Server-wins strategy for balance conflicts
- Merge strategy for transaction history
- User notification for unresolvable conflicts

---

## Service Dependencies

### Dependency Graph

```
creditService
├── CreditStorageService (storage.ts)
├── creditNotificationService
├── offlineManager
├── creditApiService
├── creditErrorHandler
├── creditRetryManager
├── creditRecoveryService
├── creditCacheService
└── creditPerformanceService

bookingStateService
└── (standalone, no dependencies)

paymentService
├── creditErrorHandler
└── creditRetryManager

offlineManager
├── CreditStorageService
└── creditApiService

creditApiService
└── ApiService (api.ts)
```

### Service Initialization Order

1. **Storage Services** (no dependencies)
2. **Error Handler** (no dependencies)
3. **Notification Service** (no dependencies)
4. **Retry Manager** (no dependencies)
5. **Cache Service** (no dependencies)
6. **Performance Service** (no dependencies)
7. **API Service** (depends on base API)
8. **Offline Manager** (depends on storage, API)
9. **Recovery Service** (depends on error handler, storage)
10. **Payment Service** (depends on error handler, retry manager)
11. **Credit Service** (depends on all credit-related services)
12. **Booking State Service** (standalone)

### Service Communication Patterns

**1. Direct Method Calls**:

```typescript
// CreditService calls other services directly
const balance = await CreditStorageService.getCreditBalance();
```

**2. Event-Based Communication**:

```typescript
// BookingStateService uses observer pattern
bookingStateService.subscribe(() => {
  // React to state changes
});
```

**3. Callback-Based Communication**:

```typescript
// Notification service uses callbacks
creditService.setToastHandler((message, type) => {
  // Show toast notification
});
```

---

## Service Usage Patterns

### Pattern 1: Credit Deduction Flow

```typescript
// 1. Calculate required credits
const required = creditService.calculateRequiredCredits(orderValue);

// 2. Check if sufficient credits
const hasSufficient = await creditService.hasSufficientCredits(orderValue);

if (!hasSufficient) {
  // Show recharge modal
  return;
}

// 3. Deduct credits
const success = await creditService.deductCredits(
  required,
  bookingId,
  orderValue,
);

if (success) {
  // 4. Accept booking
  bookingStateService.acceptBooking(booking, vendorId);

  // 5. Show success notification (automatic via creditNotificationService)
}
```

### Pattern 2: Credit Recharge Flow

```typescript
// 1. Initiate payment
const paymentResult = await paymentService.initiatePayment(amount, credits);

if (paymentResult.success) {
  // 2. Verify payment
  const verified = await paymentService.verifyPayment(
    paymentResult.transactionId,
  );

  if (verified) {
    // 3. Add credits
    await creditService.addCredits(
      credits,
      paymentResult.transactionId,
      amount,
    );

    // 4. Show success notification (automatic)
  }
}
```

### Pattern 3: Offline Operation Flow

```typescript
try {
  // Attempt operation
  await creditService.deductCredits(amount, bookingId, orderValue);
} catch (error) {
  // If offline, operation is automatically queued
  // Will sync when network is available
  console.log("Operation queued for sync");
}

// Monitor sync status
const isSyncing = offlineManager.getSyncStatus();
```

### Pattern 4: Error Recovery Flow

```typescript
try {
  await creditService.syncWithServer();
} catch (error) {
  // Automatic error handling and recovery
  await creditService.handleCreditError(error, "sync_with_server");

  // Check if recovery was successful
  const isHealthy = await creditService.validateDataIntegrity();

  if (!isHealthy) {
    // Manual recovery required
    await creditService.recoverFromCorruption();
  }
}
```

---

## Performance Optimization

### Caching Strategy

**Balance Caching**:

- TTL: 5 minutes
- Invalidated on: balance changes, manual refresh
- Preloaded on: app start, after sync

**Transaction Caching**:

- TTL: 10 minutes
- Invalidated on: new transaction, manual refresh
- Preloaded: common filters (all, deductions, additions)

**Pagination**:

- Default page size: 20 transactions
- Cached per page
- Infinite scroll support

### Batching Operations

**Transaction Submission**:

```typescript
// Batch multiple transactions
const transactions = [tx1, tx2, tx3];
await creditApiService.batchSubmitTransactions(transactions);
```

**Sync Operations**:

```typescript
// Sync all pending operations at once
await offlineManager.processOfflineQueue();
```

### Lazy Loading

**Transaction History**:

```typescript
// Load only when needed
const transactions = await creditService.getPaginatedTransactionHistory(
  filter,
  limit: 20,
  offset: 0
);
```

---

## Testing Services

### Unit Testing

```typescript
import { creditService } from "./services/creditService";

describe("CreditService", () => {
  it("should calculate required credits correctly", () => {
    expect(creditService.calculateRequiredCredits(450)).toBe(5);
    expect(creditService.calculateRequiredCredits(100)).toBe(1);
    expect(creditService.calculateRequiredCredits(99)).toBe(1);
  });

  it("should deduct credits successfully", async () => {
    const success = await creditService.deductCredits(5, "BK001", 450);
    expect(success).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe("Credit Flow Integration", () => {
  it("should complete full booking acceptance flow", async () => {
    // 1. Check balance
    const balance = await creditService.getCurrentBalance();
    expect(balance).toBeGreaterThan(0);

    // 2. Deduct credits
    const success = await creditService.deductCredits(5, "BK001", 450);
    expect(success).toBe(true);

    // 3. Verify new balance
    const newBalance = await creditService.getCurrentBalance();
    expect(newBalance).toBe(balance - 5);

    // 4. Check transaction history
    const transactions = await creditService.getTransactionHistory();
    expect(transactions).toHaveLength(1);
  });
});
```

---

## Best Practices

### 1. Always Use Singleton Instances

```typescript
// ✅ Correct
import { creditService } from "./services/creditService";

// ❌ Incorrect
import { CreditService } from "./services/creditService";
const service = new CreditService(); // Don't do this
```

### 2. Handle Errors Gracefully

```typescript
try {
  await creditService.deductCredits(amount, bookingId, orderValue);
} catch (error) {
  // Let service handle error recovery
  await creditService.handleCreditError(error, "deduct_credits");
}
```

### 3. Use Type Definitions

```typescript
import { CreditTransaction, CreditBalanceData } from "./types";

const transaction: CreditTransaction = {
  // TypeScript ensures all required fields are present
};
```

### 4. Validate Before Operations

```typescript
// Check sufficient credits before deduction
const hasSufficient = await creditService.hasSufficientCredits(orderValue);
if (!hasSufficient) {
  // Show recharge prompt
  return;
}
```

### 5. Monitor Performance

```typescript
// Get performance metrics periodically
const metrics = creditService.getPerformanceMetrics();
console.log("Cache hit rate:", metrics.cache.hitRate);
console.log("Avg operation time:", metrics.summary.avgExecutionTime);
```

---

## Troubleshooting

### Common Issues

**1. Balance Not Updating**:

- Check network connectivity
- Verify sync status: `offlineManager.getSyncStatus()`
- Force sync: `await creditService.syncWithServer()`
- Clear cache: `creditCacheService.invalidateBalance()`

**2. Transactions Not Appearing**:

- Check transaction status in storage
- Verify sync queue: `await CreditStorageService.getPendingSync()`
- Process offline queue: `await offlineManager.processOfflineQueue()`

**3. Payment Verification Failing**:

- Check transaction ID format
- Verify payment gateway response
- Check retry count: may need manual verification
- Review error logs in creditErrorHandler

**4. Data Corruption**:

- Run integrity check: `await creditService.validateDataIntegrity()`
- Attempt recovery: `await creditService.recoverFromCorruption()`
- Check recovery status: `creditRecoveryService.isRecoveryInProgress()`

---

## Migration Guide

### Upgrading Services

When updating service implementations:

1. **Backup Data**:

```typescript
const balance = await CreditStorageService.getCreditBalance();
const transactions = await CreditStorageService.getCreditTransactions();
// Store backups
```

2. **Clear Caches**:

```typescript
creditCacheService.invalidateAll();
```

3. **Re-sync Data**:

```typescript
await creditService.syncWithServer();
```

4. **Validate Integrity**:

```typescript
const isValid = await creditService.validateDataIntegrity();
```

---

**Last Updated**: December 11, 2024
**Version**: 1.0.0
