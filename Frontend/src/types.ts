export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  LAB_MANAGER = 'LAB_MANAGER',
  GUEST = 'GUEST'
}

export interface AuthorizedUser {
  id: number;
  email: string;
  role: string;
  createdAt?: string;
}

export interface Lab {
  id: string;
  subject: string;
  day: string;
  startTime: number;
  endTime: number;
  capacity: number;
  assignedCount?: number;
  slotsLeft?: number;
}

export interface GradePref {
  subject: string;
  grade: string; // 'A', 'AB', 'B', etc.
}

export interface TimeSlot {
  day: string;
  startTime: number;
  endTime: number;
}

export interface Student {
  id?: string;
  name: string;
  rollNo: string;
  cgpa: number;
  grades?: GradePref[];
  availability?: TimeSlot[];
}

export interface AllocationResult {
  id: number;
  labId: string;
  studentId: string;
  student: Student;
  lab: Lab;
}

export interface SystemStatus {
  currentRound: number;
  isConfirmed: boolean;
  academicYear: string;
  semester: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  exists?: boolean;
  hasSubmitted?: boolean;
  studentData?: Student;
  systemStatus?: SystemStatus; // <-- Added this
  total?: number;
  lastPage?: number;
  isWindowOpen?: boolean;
}