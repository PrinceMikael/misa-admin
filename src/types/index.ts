export interface Parish {
  id: string;
  name: string;
  nameSwahili?: string;
  diocese: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  email?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MassSchedule {
  id: string;
  parishId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  time: string;
  timeLabel?: string;
  language: 'Swahili' | 'English' | 'Latin' | 'Other';
  priestName?: string;
  location?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MassIntention {
  id: string;
  parishId: string;
  scheduleId?: string;
  intentionText: string;
  submittedByName?: string;
  submittedByPhone?: string;
  submittedByEmail?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  preferredDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'PARISH_ADMIN' | 'SUPER_ADMIN';
  parishId?: string;
  displayName?: string;
  createdAt: Date;
}
