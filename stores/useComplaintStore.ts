import { create } from 'zustand';
import axios from 'axios';

interface Complaint {
  _id: string;
  complaintId: string;
  fullName: string;
  phone: string;
  community: string;
  problems: string[];
  category: string;
  images: string[];
  detail: string;
  location: {
    lat: number;
    lng: number;
  };
  status: string;
  officer: string;
  createdAt: string;
  updatedAt: string;
  lastNotificationSent?: string;
  notificationCount: number;
}

interface ComplaintState {
  complaints: Complaint[];
  isLoading: boolean;
  error: string | null;
  fetchComplaints: (status?: string) => Promise<void>;
}

const useComplaintStore = create<ComplaintState>((set) => ({
  complaints: [],
  isLoading: false,
  error: null,
  fetchComplaints: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = status ? `/api/complaints?status=${encodeURIComponent(status)}&role=admin` : '/api/complaints?role=admin';
      const res = await axios.get<Complaint[]>(url);
      set({ complaints: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch', isLoading: false });
    }
  }
}));

export default useComplaintStore;