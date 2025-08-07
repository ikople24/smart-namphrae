import mongoose from 'mongoose';

const SubmittedReportSchema = new mongoose.Schema({

  fullName: String,
  phone: String,
  community: String,
  problems: [String],
  category: String,
  images: [String],
  detail: String,
  location: {
    lat: Number,
    lng: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  complaintId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'อยู่ระหว่างดำเนินการ',
  },
  officer: {
    type: String,
    default: 'on',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastNotificationSent: {
    type: Date,
  },
  notificationCount: {
    type: Number,
    default: 0,
  },
});

export default mongoose.models.SubmittedReport || mongoose.model('SubmittedReport', SubmittedReportSchema);