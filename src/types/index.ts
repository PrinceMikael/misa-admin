export type LiturgicalSeason =
  | 'ordinary_time'
  | 'advent'
  | 'christmas'
  | 'lent'
  | 'holy_week'
  | 'easter';

export interface Parish {
  id: string;
  name: string;
  nameSwahili?: string;
  diocese: string;
  region?: string;
  deanery?: string;
  address: string;
  description?: string;
  history?: string;
  patronSaint?: string;
  foundedYear?: number;
  priestName?: string;
  officeHours?: string;
  mpesaTillNumber?: string;
  mpesaAmount?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  locationStatus?: 'pending' | 'approved' | 'rejected';
  locationRejectionNote?: string;
  phone?: string;
  email?: string;
  imageUrl?: string;
  currentSeason?: LiturgicalSeason;
  seasonNote?: string;
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
  isSpecial?: boolean;
  specialLabel?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IntentionType =
  | 'thanksgiving'
  | 'repose_of_soul'
  | 'healing'
  | 'special'
  | 'birthday'
  | 'anniversary'
  | 'safe_travel';

export interface MassIntention {
  id: string;
  parishId: string;
  scheduleId?: string;
  intentionText: string;
  intentionType?: IntentionType;
  beneficiaryName?: string;
  note?: string;
  mpesaConfirmationCode?: string;
  mpesaAmount?: number;
  preferredDate?: Date;
  submittedByName?: string;
  submittedByPhone?: string;
  submittedByEmail?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'flagged';
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
}

export interface Notice {
  id: string;
  parishId: string;
  title: string;
  body: string;
  imageUrl?: string;
  category?: 'event' | 'announcement' | 'message' | 'schedule_change';
  postedAt: Date;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  role: 'PARISH_ADMIN' | 'SUPER_ADMIN';
  parishId?: string;
  displayName?: string;
  status?: 'active' | 'invited' | 'disabled';
  createdAt: Date;
}
