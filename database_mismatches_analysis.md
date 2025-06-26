# Database Column Mismatches Analysis

## Critical Issues Found (Will Cause Runtime Errors)

### 1. **COMIDAS_SEMANA Table** ⚠️ HIGH PRIORITY
**Database:** `usuario_id`, `receta_id`
**Code expects:** `usuarioId`, `recetaId`
**Impact:** All meal planning operations will fail
**Files affected:** 
- `server/storage.ts` (lines 304, 307, 349, 354)
- `server/storage-simple.ts`

### 2. **RECETA_INGREDIENTES Table** ⚠️ HIGH PRIORITY
**Database:** `receta_id`, `ingrediente_id`, `unidad`
**Code expects:** `recetaId`, `ingredienteId`, `unidadMedida`
**Impact:** Recipe ingredient operations and grocery list generation will fail
**Files affected:**
- `server/storage.ts` (lines 346, 351, 352)

### 3. **USUARIOS Table (Auth Fields)** ⚠️ MEDIUM PRIORITY
**Database:** `auth_id`, `password_hash`, `email_verified`, `last_login_at`
**Code expects:** `authId`, `passwordHash`, `emailVerified`, `lastLoginAt`
**Impact:** Authentication operations may fail
**Files affected:**
- `server/storage.ts` (user operations)
- Auth middleware

### 4. **RECETAS Table** ⚠️ MEDIUM PRIORITY
**Database:** `usuario_id`, `es_oficial`, `es_publica`, `imagen_url`, `porciones_base`, `tiempo_min`, `created_at`
**Code expects:** `usuarioId`, `esOficial`, `esPublica`, `imagenUrl`, `porcionesBase`, `tiempoMin`, `createdAt`
**Impact:** Recipe operations will fail
**Files affected:**
- `server/storage.ts` (recipe operations)

### 5. **INGREDIENTES Table** ⚠️ LOW PRIORITY
**Database:** `unidad_base`, `kcal_100`, `prot_100`, `grasa_100`, `carb_100`, `fibra_100`, `usuario_id`, `es_publico`, `categoria_id`, `marca_id`
**Code expects:** `unidadBase`, `kcal100`, `prot100`, `grasa100`, `carb100`, `fibra100`, `usuarioId`, `esPublico`, `categoriaId`, `marcaId`
**Impact:** Nutritional calculations will fail

## Operations Currently at Risk

1. **Meal Planning:**
   - `getComidasSemana()` - Will fail due to usuario_id/receta_id mismatch
   - `planearComida()` - Will fail when inserting
   - `getIngredientesParaSemana()` - Will fail on multiple joins

2. **Recipe Management:**
   - All recipe CRUD operations
   - Recipe ingredient operations
   - Grocery list generation

3. **User Authentication:**
   - OAuth operations
   - Password-based auth
   - Session management

## Fixed Areas ✅
- Family member operations (routes-minimal.ts)
- Family creation and management
- Basic recipe listing

## Recommended Action Plan
1. Fix meal planning operations first (most used feature)
2. Fix recipe ingredient operations 
3. Update authentication operations
4. Address remaining schema mismatches