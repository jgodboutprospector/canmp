export const RELATIONSHIP_TYPES = [
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other_relative', label: 'Other Relative' },
  { value: 'non_relative', label: 'Non-Relative' },
] as const;

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const ENGLISH_PROFICIENCY = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'fluent', label: 'Fluent' },
] as const;

export const EDUCATION_LEVELS = [
  { value: 'none', label: 'No formal education' },
  { value: 'primary', label: 'Primary school' },
  { value: 'secondary', label: 'Secondary school' },
  { value: 'high_school', label: 'High school' },
  { value: 'vocational', label: 'Vocational training' },
  { value: 'some_college', label: 'Some college' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate' },
] as const;

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

export const EVENT_TYPES = [
  { value: 'class', label: 'Class' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'social', label: 'Social Event' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'other', label: 'Other' },
] as const;

export const WORK_ORDER_PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'danger' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'medium', label: 'Medium', color: 'info' },
  { value: 'low', label: 'Low', color: 'default' },
] as const;

export const LEASE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'completed', label: 'Completed', color: 'info' },
  { value: 'terminated', label: 'Terminated', color: 'danger' },
] as const;

export const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
] as const;

export const USER_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'board_member', label: 'Board Member' },
  { value: 'volunteer', label: 'Volunteer' },
] as const;
