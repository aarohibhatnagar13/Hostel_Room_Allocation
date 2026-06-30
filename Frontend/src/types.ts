export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  HOSTEL_WARDEN = 'HOSTEL_WARDEN',
  GUEST = 'GUEST'
}

export interface Room {
  id: string;
  roomNumber: string;
  hostelBlock: 'A' | 'B' | 'C';
  floor: number;
  capacity: number;
  occupiedBeds: number;
  roomType: 'AC' | 'Non-AC';
  version: number;
}

export interface Student {
  id?: string;
  name: string;
  rollNo: string;
  cgpa: number;
  priorityScore: number;
  allocationStatus: 'unallocated' | 'allocated' | 'confirmed' | 'waitlisted';
  allocatedRoomId?: string;
}

export interface AllocationRun {
  runId: string;
  timestamp: string;
  stats: {
    roomsFilled: number;
    studentsUnallocated: number;
    studentsWaitlisted: number;
  };
  results: any[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  exists?: boolean;
  hasSubmitted?: boolean;
  studentData?: any;
  conflict?: boolean; // For 409 handling
}