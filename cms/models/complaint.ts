export interface Complaint {
  id: number;
  subject: string;
  description: string;
  category: string;
  department: string;
  location: string;
  priority: string;
  status: string;
}

export interface AdminComplaint extends Complaint {
  user_id: string;
  assigned_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface DepartmentCount {
  department: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  status_counts: StatusCount[];
  department_counts: DepartmentCount[];
  priority_counts: PriorityCount[];
}

export interface StaffStatEntry {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  open: number;
  in_progress: number;
  closed: number;
  total: number;
}

export interface ComplaintHistoryEntry {
  id: number;
  previous_status: string;
  new_status: string;
  changed_by: string;
  changed_by_role: string;
  changed_at: string;
}

export interface FiledByUser {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AssignedStaffInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
}

export interface ComplaintDetailResponse {
  complaint: AdminComplaint;
  filed_by_user: FiledByUser | null;
  assigned_staff: AssignedStaffInfo | null;
  history: ComplaintHistoryEntry[];
}

export const DEPARTMENTS = [
  "Police Department",
  "Municipal Corporation",
  "Health Department",
  "Electricity Department",
  "Transport Department",
] as const;

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const STATUSES = ["open", "in_progress", "closed"] as const;

export const CATEGORIES_BY_DEPARTMENT: Record<string, string[]> = {
  "Police Department": [
    "Crime Report",
    "Theft",
    "Missing Person",
    "Traffic Violation",
    "Cybercrime",
  ],
  "Municipal Corporation": [
    "Garbage",
    "Roads",
    "Street Lights",
    "Drainage",
    "Water Supply",
  ],
  "Health Department": [
    "Hospital Complaint",
    "Medicine Availability",
    "Ambulance",
    "Public Health",
    "Sanitation",
  ],
  "Electricity Department": [
    "Power Outage",
    "Street Lighting",
    "Billing",
    "Transformer",
  ],
  "Transport Department": [
    "Public Transport",
    "Traffic",
    "Bus Service",
    "Parking",
  ],
};

