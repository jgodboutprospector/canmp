-- Audit Logs Schema
-- Tracks all create, update, delete operations across the application

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'login', 'logout')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  changes JSONB,  -- Computed diff of what changed
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  metadata JSONB,  -- Additional context (e.g., bulk operation info)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timeline
  ON audit_logs(entity_type, entity_id, created_at DESC);

-- Function to compute changes between old and new values
CREATE OR REPLACE FUNCTION compute_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_keys TEXT[];
  new_keys TEXT[];
  all_keys TEXT[];
  key TEXT;
  changes_json JSONB := '{}';
BEGIN
  -- Only compute changes for update actions
  IF NEW.action = 'update' AND NEW.old_values IS NOT NULL AND NEW.new_values IS NOT NULL THEN
    -- Get all keys from both objects
    SELECT array_agg(DISTINCT key) INTO all_keys
    FROM (
      SELECT jsonb_object_keys(NEW.old_values) AS key
      UNION
      SELECT jsonb_object_keys(NEW.new_values) AS key
    ) keys;

    -- Compare each key
    IF all_keys IS NOT NULL THEN
      FOREACH key IN ARRAY all_keys LOOP
        IF (NEW.old_values->key)::text IS DISTINCT FROM (NEW.new_values->key)::text THEN
          changes_json := changes_json || jsonb_build_object(
            key, jsonb_build_object(
              'from', NEW.old_values->key,
              'to', NEW.new_values->key
            )
          );
        END IF;
      END LOOP;
    END IF;

    NEW.changes := changes_json;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for computing changes
DROP TRIGGER IF EXISTS audit_logs_compute_changes ON audit_logs;
CREATE TRIGGER audit_logs_compute_changes
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION compute_audit_changes();

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and coordinators can view audit logs
CREATE POLICY "Admins and coordinators can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

-- Policy: System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

-- View for human-readable audit log entries
CREATE OR REPLACE VIEW audit_logs_view AS
SELECT
  al.id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.entity_name,
  al.old_values,
  al.new_values,
  al.changes,
  al.created_at,
  up.first_name || ' ' || up.last_name AS user_name,
  up.email AS user_email,
  al.ip_address,
  al.metadata
FROM audit_logs al
LEFT JOIN user_profiles up ON al.user_id = up.id
ORDER BY al.created_at DESC;

-- Grant view permissions
GRANT SELECT ON audit_logs_view TO authenticated;

-- Helper function to log audit entries (callable from application)
CREATE OR REPLACE FUNCTION log_audit(
  p_action VARCHAR(50),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_entity_name VARCHAR(255) DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    old_values,
    new_values,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_old_values,
    p_new_values,
    p_metadata
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

COMMENT ON TABLE audit_logs IS 'Tracks all data modifications across the application for compliance and debugging';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: create, update, delete, view, login, logout';
COMMENT ON COLUMN audit_logs.entity_type IS 'Table/entity name: household, beneficiary, case_note, etc.';
COMMENT ON COLUMN audit_logs.entity_name IS 'Human-readable name for the entity (e.g., household name)';
COMMENT ON COLUMN audit_logs.changes IS 'Computed diff showing only fields that changed';
