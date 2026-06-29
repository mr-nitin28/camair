import { create } from 'zustand';

export interface StudentProfile {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string | null;
  department_id: string;
  course_id: string;
  semester_id: string;
  cgpa: number;
  sgpa: number;
  status: string;
  admission_date: string;
  departments?: { name: string; code: string };
  courses?: { name: string; code: string };
  semesters?: { number: number };
}

interface FacultyProfile {
  id: string;
  faculty_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id: string;
  created_at: string;
  departments?: { name: string; code: string };
}

interface AdminProfile {
  id: string;
  name: string;
  role: 'Super Admin' | 'Institution Admin' | 'Academic Admin' | 'Examination Admin' | 'Finance Admin' | 'Department Admin';
  created_at: string;
}

interface AppState {
  student: StudentProfile | null;
  faculty: FacultyProfile | null;
  admin: AdminProfile | null;
  activeSemesterNumber: number;
  sidebarOpen: boolean;
  unreadNotificationsCount: number;
  setStudent: (student: StudentProfile | null) => void;
  setFaculty: (faculty: FacultyProfile | null) => void;
  setAdmin: (admin: AdminProfile | null) => void;
  setActiveSemesterNumber: (semesterNum: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setUnreadNotificationsCount: (count: number) => void;
  decrementNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  student: null,
  faculty: null,
  admin: null,
  activeSemesterNumber: 6, // Default to Semester 6 as seeded
  sidebarOpen: false,
  unreadNotificationsCount: 0,
  setStudent: (student) => set({ student }),
  setFaculty: (faculty) => set({ faculty }),
  setAdmin: (admin) => set({ admin }),
  setActiveSemesterNumber: (activeSemesterNumber) => set({ activeSemesterNumber }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setUnreadNotificationsCount: (unreadNotificationsCount) => set({ unreadNotificationsCount }),
  decrementNotifications: () =>
    set((state) => ({
      unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
    })),
}));
