-- Check if nutrition columns exist in recetas table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'recetas' 
  AND column_name IN ('calorias_por_porcion', 'proteinas_g', 'grasas_g', 'carbohidratos_g', 'fibra_g', 'sodio_mg')
ORDER BY column_name;

-- Also check current structure of recetas table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'recetas'
ORDER BY ordinal_position;