# Mock Data & Backend Integration Guide

## Overview

This document provides comprehensive details about all mock data structures used in the Scrapiz Vendor App, sample JSON for backend integration, and API contract specifications. This guide is essential for backend developers to understand the expected data formats and integration points.

---

## Table of Contents

1. [Mock Data Structures](#mock-data-structures)
2. [API Endpoints & Contracts](#api-endpoints--contracts)
3. [Sample JSON Payloads](#sample-json-payloads)
4. [Backend Integration Points](#backend-integration-points)
5. [Data Validation Rules](#data-validation-rules)

---

## Mock Data Structures

### 1. Booking Request Data

**Location**: `src/screens/main/Dashboard.tsx`

**Purpose**: Represents incoming scrap collection requests from customers

```typescript
interface BookingRequest {
  id: string; // Unique booking identifier
  scrapType: string; // Type of scrap material
  distance: string; // Distance from vendor (e.g., "2.5 km")
  customerName: string; // Customer full name
  customerPhone: string; // Customer phone number
  address: string; // Pickup address
  paymentMode: string; // Payment method (Cash/UPI/Digital)
  estimatedAmount: number; // Estimated transaction value in INR
  createdAt: Date; // Booking creation timestamp
  priority?: "high" | "medium" | "low"; // Booking priority
  estimatedTime?: string; // Estimated travel time
}
```

**Sample Mock Data**:

```json
{
  "id": "1",
  "scrapType": "Mixed Scrap",
  "distance": "2.5 km",
  "customerName": "Rajesh Kumar",
  "customerPhone": "+91 9876543210",
  "address": "123 MG Road, Bangalore",
  "paymentMode": "Cash",
  "estimatedAmount": 450,
  "createdAt": "2024-12-11T10:30:00Z",
  "priority": "high",
  "estimatedTime": "15 mins"
}
```

---

### 2. Credit System Data

**Location**: `src/services/creditService.ts`, `src/types/index.ts`

#### Credit Balance Data

```typescript
interface CreditBalanceData {
  vendorId: string; // Unique vendor identifier
  currentBalance: number; // Current credit balance
  lastUpdated: Date; // Last balance update timestamp
  pendingTransactions: string[]; // Array of pending transaction IDs
  syncStatus: "synced" | "pending" | "error"; // Sync status with server
}
```

**Sample JSON**:

```json
{
  "vendorId": "vendor_12345",
  "currentBalance": 50,
  "lastUpdated": "2024-12-11T14:30:00Z",
  "pendingTransactions": [],
  "syncStatus": "synced"
}
```

#### Credit Transaction Data

```typescript
interface CreditTransaction {
  id: string; // Unique transaction ID
  type: "addition" | "deduction" | "penalty"; // Transaction type
  amount: number; // Credit amount
  description: string; // Transaction description
  timestamp: Date; // Transaction timestamp
  bookingId?: string; // Associated booking ID (for deductions)
  orderValue?: number; // Order value (for deductions)
  paymentAmount?: number; // Payment amount (for additions)
  paymentTransactionId?: string; // Payment gateway transaction ID
  status: "completed" | "pending" | "failed"; // Transaction status
}
```

**Sample JSON (Deduction)**:

```json
{
  "id": "txn_1702301234567_abc123",
  "type": "deduction",
  "amount": 5,
  "description": "Booking acceptance - Order #BK001",
  "timestamp": "2024-12-11T10:35:00Z",
  "bookingId": "BK001",
  "orderValue": 450,
  "status": "completed"
}
```

**Sample JSON (Addition)**:

```json
{
  "id": "txn_1702301234568_def456",
  "type": "addition",
  "amount": 100,
  "description": "Credit recharge - ₹1000",
  "timestamp": "2024-12-11T09:00:00Z",
  "paymentAmount": 1000,
  "paymentTransactionId": "TXN_1702301234567_xyz789",
  "status": "completed"
}
```

---

### 3. Earnings Data

**Location**: `src/screens/main/EarningsScreen.tsx`

```typescript
interface EarningsData {
  totalEarnings: number; // Total earnings for period
  totalJobs: number; // Number of completed jobs
  transactions: EarningsTransaction[]; // List of earning transactions
}

interface EarningsTransaction {
  id: string; // Transaction ID
  jobId: string; // Associated job ID
  amount: number; // Earning amount in INR
  date: Date; // Transaction date
  status: "completed" | "pending"; // Transaction status
}
```

**Sample JSON**:

```json
{
  "totalEarnings": 15680,
  "totalJobs": 42,
  "transactions": [
    {
      "id": "week_1",
      "jobId": "J045",
      "amount": 1200,
      "date": "2024-12-10T16:00:00Z",
      "status": "completed"
    },
    {
      "id": "week_2",
      "jobId": "J044",
      "amount": 950,
      "date": "2024-12-09T14:30:00Z",
      "status": "completed"
    }
  ]
}
```

---

### 4. Future Requests Data

**Location**: `src/screens/jobs/FutureRequestsScreen.tsx`

```typescript
interface FutureRequest {
  id: string; // Request ID
  scheduledDate: string; // Scheduled pickup date (YYYY-MM-DD)
  scheduledTime: string; // Scheduled pickup time (HH:MM AM/PM)
  customerName: string; // Customer name
  customerPhone: string; // Customer phone
  scrapType: string; // Scrap material type
  estimatedAmount: number; // Estimated value
  address: string; // Pickup address
  estimatedWeight: string; // Estimated weight
  status: "scheduled" | "confirmed" | "pending"; // Request status
  priority: "high" | "medium" | "low"; // Priority level
}
```

**Sample JSON**:

```json
{
  "id": "REQ001",
  "scheduledDate": "2024-12-12",
  "scheduledTime": "10:00 AM",
  "customerName": "Meera Gupta",
  "customerPhone": "+91 98765 43210",
  "scrapType": "Electronics & Metal",
  "estimatedAmount": 1500,
  "address": "HSR Layout, Bangalore",
  "estimatedWeight": "20 kg",
  "status": "confirmed",
  "priority": "high"
}
```

---

### 5. Job History Data

**Location**: `src/screens/jobs/JobHistoryScreen.tsx`

```typescript
interface JobRecord {
  id: string; // Job ID
  date: string; // Job completion date (YYYY-MM-DD)
  customerName: string; // Customer name
  scrapType: string; // Scrap type
  amount: number; // Transaction amount
  status: "completed" | "cancelled"; // Job status
  rating?: number; // Customer rating (1-5)
  address: string; // Pickup address
  weight: string; // Actual weight collected
}
```

**Sample JSON**:

```json
{
  "id": "JOB001",
  "date": "2024-12-11",
  "customerName": "Priya Sharma",
  "scrapType": "Mixed Scrap",
  "amount": 850,
  "status": "completed",
  "rating": 5,
  "address": "MG Road, Bangalore",
  "weight": "15 kg"
}
```

---

### 6. Material Rates Data

**Location**: `src/screens/main/MaterialsScreen.tsx`

```typescript
interface Material {
  id: string; // Material ID
  name: string; // Material name
  category: string; // Category (Metals/Paper/Plastics/E-Waste)
  currentRate: number; // Current rate per unit
  unit: string; // Unit of measurement (kg)
  iconName?: string; // Icon identifier
  color?: string; // Display color
  trend?: "up" | "down" | "stable"; // Price trend
}
```

**Sample JSON**:

```json
{
  "id": "1",
  "name": "Iron",
  "category": "Metals",
  "currentRate": 25,
  "unit": "kg",
  "iconName": "build",
  "color": "#95a5a6",
  "trend": "up"
}
```

---

### 7. Vehicle Details Data

**Location**: `src/screens/profile/VehicleDetailsScreen.tsx`

```typescript
interface Vehicle {
  id: string; // Vehicle ID
  type: string; // Vehicle type
  number: string; // Registration number
  capacity: string; // Load capacity
  fuelType: string; // Fuel type
  insurance: string; // Insurance validity
  permit: string; // Permit validity
  icon: string; // Icon name
}
```

**Sample JSON**:

```json
{
  "id": "1",
  "type": "Auto Rickshaw",
  "number": "KA 01 AB 1234",
  "capacity": "500 kg",
  "fuelType": "Petrol",
  "insurance": "Valid till Dec 2024",
  "permit": "Valid till Mar 2025",
  "icon": "directions-car"
}
```

---

### 8. User Profile Data

**Location**: `src/screens/profile/PersonalInfoScreen.tsx`

```typescript
interface UserProfile {
  name: string; // Full name
  phone: string; // Phone number
  email: string; // Email address
  address: string; // Residential address
  aadharNumber: string; // Aadhar card number
  panNumber: string; // PAN card number
  licenseNumber: string; // Driving license number
}
```

**Sample JSON**:

```json
{
  "name": "Rajesh Kumar",
  "phone": "+91 98765 43210",
  "email": "rajesh.kumar@email.com",
  "address": "123 MG Road, Bangalore, Karnataka 560001",
  "aadharNumber": "1234 5678 9012",
  "panNumber": "ABCDE1234F",
  "licenseNumber": "KA01 20230001234"
}
```

---

## API Endpoints & Contracts

### Base URL

```
https://api.scrapiz.com/v1
```

### Authentication

All API requests should include:

```
Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
```

---

### 1. Credit System APIs

#### Get Credit Balance

```
GET /vendors/{vendorId}/credits/balance
```

**Response**:

```json
{
  "success": true,
  "data": {
    "vendorId": "vendor_12345",
    "currentBalance": 50,
    "lastUpdated": "2024-12-11T14:30:00Z",
    "pendingTransactions": [],
    "syncStatus": "synced"
  }
}
```

#### Sync Credit Data

```
POST /vendors/{vendorId}/credits/sync
```

**Request Body**:

```json
{
  "vendorId": "vendor_12345",
  "balance": {
    "currentBalance": 45,
    "lastUpdated": "2024-12-11T14:35:00Z",
    "pendingTransactions": [],
    "syncStatus": "pending"
  },
  "transactions": [
    {
      "id": "txn_1702301234567_abc123",
      "type": "deduction",
      "amount": 5,
      "description": "Booking acceptance - Order #BK001",
      "timestamp": "2024-12-11T14:35:00Z",
      "bookingId": "BK001",
      "orderValue": 450,
      "status": "completed"
    }
  ],
  "pendingOperations": []
}
```

**Response**:

```json
{
  "success": true,
  "serverBalance": {
    "vendorId": "vendor_12345",
    "currentBalance": 45,
    "lastUpdated": "2024-12-11T14:35:00Z",
    "pendingTransactions": [],
    "syncStatus": "synced"
  },
  "serverTransactions": [],
  "conflicts": null
}
```

#### Deduct Credits

```
POST /vendors/{vendorId}/credits/deduct
```

**Request Body**:

```json
{
  "amount": 5,
  "bookingId": "BK001",
  "orderValue": 450,
  "timestamp": "2024-12-11T14:35:00Z"
}
```

**Response**:

```json
{
  "success": true,
  "transactionId": "txn_1702301234567_abc123",
  "newBalance": 45,
  "message": "Credits deducted successfully"
}
```

#### Add Credits (Recharge)

```
POST /vendors/{vendorId}/credits/add
```

**Request Body**:

```json
{
  "amount": 100,
  "paymentAmount": 1000,
  "paymentTransactionId": "TXN_1702301234567_xyz789",
  "timestamp": "2024-12-11T09:00:00Z"
}
```

**Response**:

```json
{
  "success": true,
  "transactionId": "txn_1702301234568_def456",
  "newBalance": 145,
  "message": "Credits added successfully"
}
```

---

### 2. Booking APIs

#### Get New Bookings

```
GET /vendors/{vendorId}/bookings/new
```

**Query Parameters**:

- `limit` (optional): Number of bookings to return (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "scrapType": "Mixed Scrap",
      "distance": "2.5 km",
      "customerName": "Rajesh Kumar",
      "customerPhone": "+91 9876543210",
      "address": "123 MG Road, Bangalore",
      "paymentMode": "Cash",
      "estimatedAmount": 450,
      "createdAt": "2024-12-11T10:30:00Z",
      "priority": "high",
      "estimatedTime": "15 mins"
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Accept Booking

```
POST /vendors/{vendorId}/bookings/{bookingId}/accept
```

**Request Body**:

```json
{
  "creditsDeducted": 5,
  "acceptedAt": "2024-12-11T14:35:00Z"
}
```

**Response**:

```json
{
  "success": true,
  "booking": {
    "id": "1",
    "status": "accepted",
    "acceptedAt": "2024-12-11T14:35:00Z",
    "vendorId": "vendor_12345"
  },
  "message": "Booking accepted successfully"
}
```

#### Decline Booking

```
POST /vendors/{vendorId}/bookings/{bookingId}/decline
```

**Request Body**:

```json
{
  "reason": "Too far from current location",
  "declinedAt": "2024-12-11T14:35:00Z"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Booking declined"
}
```

---

### 3. Payment APIs

#### Initiate Payment

```
POST /payments/initiate
```

**Request Body**:

```json
{
  "vendorId": "vendor_12345",
  "amount": 1000,
  "credits": 100,
  "paymentMethod": "upi"
}
```

**Response**:

```json
{
  "success": true,
  "transactionId": "TXN_1702301234567_xyz789",
  "paymentUrl": "upi://pay?pa=scrapiz@upi&pn=Scrapiz&am=1000&tr=TXN_1702301234567_xyz789",
  "expiresAt": "2024-12-11T15:00:00Z"
}
```

#### Verify Payment

```
POST /payments/{transactionId}/verify
```

**Response**:

```json
{
  "verified": true,
  "transactionId": "TXN_1702301234567_xyz789",
  "amount": 1000,
  "status": "success",
  "timestamp": "2024-12-11T14:45:00Z"
}
```

---

### 4. Earnings APIs

#### Get Earnings

```
GET /vendors/{vendorId}/earnings
```

**Query Parameters**:

- `period`: "today" | "week" | "month"

**Response**:

```json
{
  "success": true,
  "data": {
    "totalEarnings": 15680,
    "totalJobs": 42,
    "transactions": [
      {
        "id": "week_1",
        "jobId": "J045",
        "amount": 1200,
        "date": "2024-12-10T16:00:00Z",
        "status": "completed"
      }
    ]
  }
}
```

---

### 5. Material Rates APIs

#### Get Material Rates

```
GET /materials/rates
```

**Query Parameters**:

- `category` (optional): Filter by category

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Iron",
      "category": "Metals",
      "currentRate": 25,
      "unit": "kg",
      "trend": "up",
      "lastUpdated": "2024-12-11T00:00:00Z"
    }
  ]
}
```

---

## Backend Integration Points

### 1. Credit System Integration

**Key Integration Points**:

- Credit balance synchronization
- Transaction history sync
- Payment verification
- Offline operation queue processing

**Implementation Notes**:

- Use `creditService.syncWithServer()` for periodic sync
- Handle offline scenarios with `offlineManager`
- Validate all credit operations before processing
- Implement idempotency for transaction submissions

---

### 2. Booking Management Integration

**Key Integration Points**:

- Real-time booking notifications
- Booking acceptance/decline
- Status updates
- Customer contact reveal after acceptance

**Implementation Notes**:

- Implement WebSocket or push notifications for real-time updates
- Validate credit requirements before booking acceptance
- Track booking state changes
- Implement privacy protection for customer data

---

### 3. Payment Gateway Integration

**Key Integration Points**:

- Payment initiation
- Payment verification
- Refund processing
- Transaction status tracking

**Implementation Notes**:

- Support multiple payment methods (UPI, Card, Net Banking, Wallet)
- Implement retry logic for failed verifications
- Handle payment timeouts gracefully
- Secure payment data transmission

---

## Data Validation Rules

### Credit Amount Validation

```typescript
- Must be a positive number
- Cannot exceed 10,000 credits per transaction
- Minimum 1 credit for deductions
- Minimum 10 credits for additions
```

### Order Value Validation

```typescript
- Must be a positive number
- Minimum: ₹100
- Maximum: ₹100,000
- Must be a multiple of 10
```

### Payment Amount Validation

```typescript
- Must be a positive number
- Minimum: ₹100
- Maximum: ₹100,000
- Must match credit calculation (₹10 per credit)
```

### Phone Number Validation

```typescript
- Format: +91 XXXXX XXXXX
- Must be 10 digits after country code
- Country code: +91 (India)
```

### Transaction ID Validation

```typescript
- Format: TXN_<timestamp>_<random>
- Must be unique
- Cannot be empty or null
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credits for this operation",
    "details": {
      "required": 5,
      "available": 2
    },
    "recoverable": true,
    "suggestedAction": "Please recharge your credits to continue"
  }
}
```

### Common Error Codes

- `INSUFFICIENT_CREDITS`: Not enough credits for operation
- `INVALID_PAYMENT`: Payment verification failed
- `NETWORK_ERROR`: Network connectivity issue
- `SYNC_CONFLICT`: Data synchronization conflict
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication failed
- `NOT_FOUND`: Resource not found
- `SERVER_ERROR`: Internal server error

---

## Testing Recommendations

### Mock Data for Testing

1. Use provided sample JSON for unit tests
2. Test edge cases (empty arrays, null values, extreme numbers)
3. Validate all date/time formats
4. Test offline scenarios
5. Verify data integrity after sync

### Integration Testing

1. Test complete booking flow with credit deduction
2. Test payment flow end-to-end
3. Test sync conflict resolution
4. Test offline operation queue
5. Verify error recovery mechanisms

---

## Notes for Backend Developers

1. **Credit Calculation**: 1 credit = ₹100 order value (rounded up)
2. **Sync Strategy**: Client-first with server reconciliation
3. **Offline Support**: Queue operations locally, sync when online
4. **Data Privacy**: Customer phone numbers hidden until booking acceptance
5. **Transaction Idempotency**: Use transaction IDs to prevent duplicates
6. **Rate Limiting**: Implement appropriate rate limits for API endpoints
7. **Caching**: Client implements aggressive caching for performance
8. **Real-time Updates**: Consider WebSocket for booking notifications

---

**Last Updated**: December 11, 2024
**Version**: 1.0.0
