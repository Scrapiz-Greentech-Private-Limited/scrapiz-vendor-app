import { ApiService, VendorLeadSummary } from './api';
import { AuthStorageService } from './authStorage';
import { BookingRequest } from '../types';

type LeadListener = (bookings: BookingRequest[]) => void;

type LeadSocketEvent =
  | { type: 'lead_snapshot'; leads: VendorLeadSummary[] }
  | { type: 'lead_created'; lead: VendorLeadSummary }
  | { type: 'lead_removed'; lead_id: string; reason?: string }
  | { type: 'pong' };

class VendorLeadSocketService {
  private ws: WebSocket | null = null;
  private listeners = new Set<LeadListener>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private bookings: BookingRequest[] = [];
  private isActive = false;

  subscribe(listener: LeadListener) {
    this.listeners.add(listener);
    listener(this.bookings);
    return () => this.listeners.delete(listener);
  }

  async start() {
    if (this.ws || this.isActive) {
      return;
    }

    this.isActive = true;
    const token = await AuthStorageService.getToken();
    if (!token) {
      this.isActive = false;
      return;
    }

    const ws = new WebSocket(ApiService.getVendorLeadSocketUrl(token));
    this.ws = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as LeadSocketEvent;
        this.handleEvent(payload);
      } catch (error) {
        console.warn('Invalid lead socket payload', error);
      }
    };

    ws.onclose = () => {
      this.ws = null;
      if (this.isActive && !this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          void this.start();
        }, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  stop() {
    this.isActive = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private handleEvent(event: LeadSocketEvent) {
    if (event.type === 'lead_snapshot') {
      this.bookings = event.leads.map((lead) => ApiService.mapVendorLeadSummaryToBookingRequest(lead));
      this.emit();
      return;
    }

    if (event.type === 'lead_created') {
      const next = ApiService.mapVendorLeadSummaryToBookingRequest(event.lead);
      this.bookings = [next, ...this.bookings.filter((booking) => booking.id !== next.id)];
      this.emit();
      return;
    }

    if (event.type === 'lead_removed') {
      this.bookings = this.bookings.filter((booking) => booking.id !== event.lead_id);
      this.emit();
    }
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.bookings));
  }
}

export const vendorLeadSocketService = new VendorLeadSocketService();
