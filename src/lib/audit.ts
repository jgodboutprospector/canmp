'use client';

import { supabase } from '@/lib/supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout';

export type EntityType =
  | 'household'
  | 'beneficiary'
  | 'case_note'
  | 'property'
  | 'unit'
  | 'lease'
  | 'work_order'
  | 'event'
  | 'class_section'
  | 'teacher'
  | 'volunteer'
  | 'mentor_team'
  | 'donation_item'
  | 'user';

export interface AuditLogEntry {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log an audit entry to the database
 * This function is designed to not block the UI - it logs asynchronously
 * and handles errors silently to avoid disrupting user experience
 */
export async function logAudit({
  action,
  entityType,
  entityId,
  entityName,
  oldValues,
  newValues,
  metadata,
}: AuditLogEntry): Promise<void> {
  try {
    // Use the database function for logging
    await (supabase as any).rpc('log_audit', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_entity_name: entityName || null,
      p_old_values: oldValues ? JSON.stringify(oldValues) : null,
      p_new_values: newValues ? JSON.stringify(newValues) : null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should never break the app
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Helper to log a create action
 */
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  entityName: string,
  newValues: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  return logAudit({
    action: 'create',
    entityType,
    entityId,
    entityName,
    newValues,
    metadata,
  });
}

/**
 * Helper to log an update action
 */
export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  entityName: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  return logAudit({
    action: 'update',
    entityType,
    entityId,
    entityName,
    oldValues,
    newValues,
    metadata,
  });
}

/**
 * Helper to log a delete action
 */
export async function logDelete(
  entityType: EntityType,
  entityId: string,
  entityName: string,
  oldValues: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  return logAudit({
    action: 'delete',
    entityType,
    entityId,
    entityName,
    oldValues,
    newValues: { is_active: false }, // Soft delete marker
    metadata,
  });
}

/**
 * Compute the diff between old and new values
 * Useful for displaying what changed in the UI
 */
export function computeChanges(
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

  for (const key of allKeys) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];

    // Compare values (handling null/undefined)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { from: oldVal, to: newVal };
    }
  }

  return changes;
}

/**
 * Format a field name for display (e.g., 'first_name' -> 'First Name')
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format entity type for display
 */
export function formatEntityType(entityType: EntityType): string {
  const labels: Record<EntityType, string> = {
    household: 'Household',
    beneficiary: 'Individual',
    case_note: 'Case Note',
    property: 'Property',
    unit: 'Unit',
    lease: 'Lease',
    work_order: 'Work Order',
    event: 'Event',
    class_section: 'Class',
    teacher: 'Teacher',
    volunteer: 'Volunteer',
    mentor_team: 'Mentor Team',
    donation_item: 'Donation Item',
    user: 'User',
  };
  return labels[entityType] || entityType;
}

/**
 * Format action for display
 */
export function formatAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    view: 'Viewed',
    login: 'Logged In',
    logout: 'Logged Out',
  };
  return labels[action] || action;
}

/**
 * Get action color for UI display
 */
export function getActionColor(action: AuditAction): string {
  const colors: Record<AuditAction, string> = {
    create: 'text-green-600 bg-green-100',
    update: 'text-blue-600 bg-blue-100',
    delete: 'text-red-600 bg-red-100',
    view: 'text-gray-600 bg-gray-100',
    login: 'text-purple-600 bg-purple-100',
    logout: 'text-orange-600 bg-orange-100',
  };
  return colors[action] || 'text-gray-600 bg-gray-100';
}
