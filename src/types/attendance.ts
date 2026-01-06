/**
 * Attendance Types for Clock-in/out and Overtime Tracking
 * Based on Lei Geral do Trabalho de Angola (Lei n.º 12/23)
 */

export type AttendanceStatus = 
  | 'clocked_in'      // Currently working
  | 'clocked_out'     // Day completed
  | 'absent'          // Did not clock in
  | 'late'            // Clocked in late
  | 'early_leave';    // Left before scheduled end

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;                  // ISO date string (YYYY-MM-DD)
  clockIn?: string;              // ISO datetime string
  clockOut?: string;             // ISO datetime string
  status: AttendanceStatus;
  scheduledStart: string;        // Expected start time (HH:mm)
  scheduledEnd: string;          // Expected end time (HH:mm)
  breakDurationMinutes: number;  // Break duration in minutes
  lateMinutes: number;           // Minutes late (0 if on time)
  earlyLeaveMinutes: number;     // Minutes left early (0 if stayed)
  workedMinutes: number;         // Total minutes worked
  overtimeMinutes: number;       // Overtime minutes (above 8 hours)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeSummary {
  employeeId: string;
  month: number;
  year: number;
  normalHours: number;           // Regular overtime hours
  nightHours: number;            // Night overtime (20:00-06:00)
  holidayHours: number;          // Holiday/weekend overtime
  totalHours: number;            // Total overtime hours
  cumulativeNormalHoursThisMonth: number; // For 30h threshold
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  averageWorkedHours: number;
  totalOvertimeHours: number;
}

export interface ClockAction {
  type: 'clock_in' | 'clock_out';
  employeeId: string;
  timestamp: string;
  location?: string;
  notes?: string;
}

// Default work schedule
export const DEFAULT_SCHEDULE = {
  startTime: '08:00',
  endTime: '17:00',
  breakMinutes: 60,
  workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
} as const;

// Grace period for late arrivals (minutes)
export const LATE_GRACE_PERIOD = 10; // 10 minutes grace

// Minimum break duration
export const MIN_BREAK_MINUTES = 60; // 1 hour minimum break
