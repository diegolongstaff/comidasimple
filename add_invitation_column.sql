-- Add invitation code column to miembros_familia table
ALTER TABLE miembros_familia 
ADD COLUMN IF NOT EXISTS codigo_invitacion VARCHAR(50);

-- Add index for better performance on invitation code lookups
CREATE INDEX IF NOT EXISTS idx_miembros_familia_codigo_invitacion 
ON miembros_familia(codigo_invitacion);