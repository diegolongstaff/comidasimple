# Comida Simple - Database Architecture Documentation

**Generated:** June 2025  
**Version:** 1.0

## Executive Summary

Comida Simple features a sophisticated PostgreSQL database designed for family-centric meal planning with intelligent portion scaling, nutritional tracking, and comprehensive recipe management. The architecture supports multi-family environments with role-based permissions and dynamic age-based calculations.

---

## Core Architecture Principles

### 1. Family-Centric Design
- All meal planning decisions occur at the family level
- Each family has a designated chef (`chef_id`) with planning permissions
- Family members can view but not modify meal plans
- Ratings and preferences are managed collectively per family

### 2. Dynamic Age-Based Scaling
- Automatic age group calculation from birthdates
- Configurable portion multipliers per age group
- Nutritional recommendations that adapt as family members age
- No manual intervention required as children grow

### 3. Recipe Visibility System
- **Public recipes** (`es_publica=true`): Available to all families
- **Official recipes** (`es_oficial=true`): App-created vs user-generated
- **Private recipes**: Family-specific custom meals
- Granular control over recipe sharing and discovery

### 4. Comprehensive Nutritional Foundation
- Detailed ingredient nutrition database with brand/category organization
- Age-specific daily nutritional recommendations
- Foundation for future AI-powered meal suggestions

---

## Database Tables

### Core User Management

#### `usuarios`
**Purpose:** Central user authentication and family linking
- `id`: UUID primary key
- `email`: User login credential
- `nombre`, `apellido`: Personal information
- `es_chef`: Chef permission flag (defaults true)
- `familia_id`: Links user to their family
- `password_hash`: Local authentication
- `fecha_registro`: Account creation timestamp

#### `familias`
**Purpose:** Family group management with chef designation
- `id`: UUID primary key
- `nombre`: Family display name
- `chef_id`: UUID reference to usuarios (meal planning permission)
- `plan_id`: Subscription tier reference
- `codigo_invitacion`: Unique family invitation code
- `fecha_creacion`: Family creation timestamp

#### `miembros_familia`
**Purpose:** Individual family member demographics for portion scaling
- `familia_id`: Links to familias table
- `nombre`, `apellido`, `email`: Member identification
- `fecha_nacimiento`: Critical for automatic age group calculation
- `sexo`: Gender (Masculino/Femenino)
- `peso_kg`, `altura_cm`: Physical metrics for nutritional calculations
- `es_jefe_familia`: Administrative permissions within family
- `usuario_id`: Optional link to usuarios if member has account

### Age-Based Portion System

#### `age_ranges`
**Purpose:** Configurable age groups with portion multipliers and nutritional recommendations
- `nombre`: Age group display name
- `edad_min`, `edad_max`: Age boundaries (edad_max NULL = no upper limit)
- `multiplicador_porcion`: Portion scaling factor
- `calorias_diarias_recomendadas`: Daily caloric needs
- `proteina_gramos_diarias`: Daily protein requirements
- `grasa_gramos_diarias`: Daily fat requirements
- `carbohidratos_gramos_diarias`: Daily carbohydrate requirements
- `fibra_gramos_diarias`: Daily fiber requirements
- `activo`: Enable/disable age group

**Current Configuration:**
- Bebés (0-1): 0.25x portions, 700 cal/day
- Niños pequeños (2-5): 0.50x portions, 1200 cal/day
- Niños (6-11): 0.75x portions, 1800 cal/day
- Adolescentes (12-17): 1.20x portions, 2200 cal/day
- Adultos (18+): 1.00x portions, 2000 cal/day

### Recipe Management

#### `recetas`
**Purpose:** Recipe storage with visibility controls and metadata
- `usuario_id`: Recipe creator
- `es_oficial`: App-created (true) vs user-generated (false)
- `es_publica`: Visible to other families
- `nombre`: Recipe title
- `descripcion`: Cooking instructions
- `porciones_base`: Base serving size for scaling calculations
- `tiempo_min`: Preparation time
- `dificultad`: Difficulty rating (1-5 scale)
- `complejidad`: Preparation complexity (simple/media/compleja)

#### `ingredientes`
**Purpose:** Comprehensive ingredient database with nutritional data
- `nombre`: Ingredient name
- `unidad_base`: Standard measurement unit
- `kcal_100`, `prot_100`, `grasa_100`, `carb_100`, `fibra_100`: Nutrition per 100g
- `usuario_id`: Creator (if custom ingredient)
- `es_publico`: Available to all users
- `categoria_id`: Links to categorias
- `marca_id`: Brand association
- `estado`, `fuente`: Data quality tracking

#### `receta_ingredientes`
**Purpose:** Recipe-ingredient relationships with quantities
- `receta_id`: Links to recetas
- `ingrediente_id`: Links to ingredientes
- `cantidad`: Amount needed
- `unidad`: Measurement unit
- `notas`: Special preparation instructions

### Meal Planning

#### `momento`
**Purpose:** Meal time definitions
- `momento`: Meal names ("Almuerzo", "Cena", etc.)

#### `comidas_semana`
**Purpose:** Weekly meal planning assignments
- `usuario_id`: Who planned the meal (must be family chef)
- `fecha`: Target cooking date
- `receta_id`: Recipe to prepare
- `momento`: Meal time reference

#### `comidas_historial`
**Purpose:** Historical tracking of planned vs actually cooked meals
- `familia_id`: Family reference
- `fecha_planificada`: Originally planned date
- `fecha_cocinada`: Actual cooking date
- `fue_cocinada`: Boolean success tracking
- `notas`: Feedback or reasons for changes

#### `recetas_puntaje`
**Purpose:** Family-based recipe ratings
- `familia_id`: Rating family (not usuario_id)
- `receta_id`: Rated recipe
- `puntaje`: Rating scale (3+ = liked, <3 = disliked)
- Logic: 3+ points indicates family likes recipe for future suggestions

### Shopping List Management

#### `listas_compras`
**Purpose:** Shopping list tracking with status management
- `familia_id`: Owning family
- `nombre`: List identifier
- `fecha_creacion`: Generated timestamp
- `fecha_compra`: Completion timestamp
- `estado`: 'pendiente', 'comprada', 'cancelada'
- `total_estimado`: Budget estimation
- `notas`: Additional shopping notes

#### `lista_compras_items`
**Purpose:** Individual shopping list items with purchase tracking
- `lista_id`: Parent shopping list
- `ingrediente_id`: Required ingredient
- `cantidad`: Scaled quantity needed
- `unidad`: Measurement unit
- `precio_estimado`: Cost estimation
- `comprado`: Purchase completion flag
- `notas`: Item-specific notes

### Organization and Categorization

#### `categorias`
**Purpose:** Ingredient categorization (Vegetables, Proteins, etc.)

#### `marcas`
**Purpose:** Brand information for ingredient organization
- `pais_origen`: Geographic tracking for sourcing

#### `tags`
**Purpose:** Recipe tagging system for filtering
- `nombre`: Tag name
- `color`, `icono`: Display properties

#### `receta_tag`
**Purpose:** Many-to-many recipe-tag relationships

#### `usuario_tag`
**Purpose:** User preference tagging

### Advanced Nutritional System

#### `nutrientes`
**Purpose:** Master nutritional component database
- `nombre`: Nutrient name
- `unidad`: Measurement unit

#### `ingrediente_nutriente`
**Purpose:** Detailed nutritional breakdown per ingredient
- `ingrediente_id`: Target ingredient
- `nutriente_id`: Specific nutrient
- `valor_100g`: Amount per 100g

### Subscription Management

#### `planes`
**Purpose:** Service tier management
- `nombre`: Plan name
- `precio_mensual`: Subscription cost
- `activo`: Availability flag

---

## Key Database Functions and Views

### Views

#### `miembros_familia_con_edad`
Real-time calculation combining family members with current age groups:
- Automatically calculates current age from birthdate
- Joins with age_ranges for current portion multiplier
- Provides nutritional recommendations per family member
- Updates daily without manual intervention

### Functions

#### `obtener_rango_edad(fecha_nacimiento)`
Returns complete age group information for a given birthdate:
- Calculates current age in years
- Matches to appropriate age_ranges record
- Returns nutritional recommendations and portion multiplier

#### `calcular_porciones_familia(familia_id)`
Calculates total portion scaling factor for entire family:
- Sums all family member portion multipliers
- Accounts for different age groups automatically
- Returns scaling factor for recipe ingredient calculations

#### `calcular_necesidades_familia(familia_id)`
Comprehensive family nutritional needs calculation:
- Aggregates daily caloric and nutritional requirements
- Considers all family members' age groups
- Foundation for future meal planning optimization

---

## Business Logic Implementation

### Portion Scaling Algorithm
1. Recipe defines `porciones_base` (typically 4 servings)
2. Family composition calculated via `calcular_porciones_familia()`
3. Scaling factor = family_total_multiplier / 4.0
4. All ingredient quantities multiplied by scaling factor
5. Results used for shopping list generation

### Recipe Recommendation System
1. Recipes with rating ≥3 points considered "liked" by family
2. Recipes with rating <3 points avoided in suggestions
3. `es_publica` recipes available for discovery
4. `es_oficial` recipes prioritized for new families

### Chef Permission Model
- Only user designated as `familias.chef_id` can:
  - Plan meals in `comidas_semana`
  - Rate recipes in `recetas_puntaje`
  - Generate shopping lists
- Other family members have read-only access to meal plans

### Shopping List Generation Logic
1. Aggregate all `comidas_semana` entries for date range
2. Collect all `receta_ingredientes` for planned recipes
3. Scale quantities using family portion calculations
4. Combine duplicate ingredients with quantity summation
5. Generate `listas_compras` and `lista_compras_items`

---

## Data Integrity and Performance

### Key Constraints
- All tables use UUID primary keys for scalability
- Foreign key constraints maintain referential integrity
- Check constraints validate data ranges (ratings 1-5, valid states)
- Age range overlaps prevented by application logic

### Performance Optimizations
- Indexes on all foreign keys
- Composite indexes on frequently queried combinations:
  - `(familia_id, fecha)` on comidas_semana
  - `(familia_id, estado)` on listas_compras
- View-based calculations prevent data inconsistency

### Scalability Design
- UUID keys enable distributed architectures
- Normalized design eliminates data duplication
- Configurable parameters stored in tables vs hardcoded
- JSON columns for future flexible metadata storage

---

## Future Enhancement Capabilities

The database architecture supports advanced features:

### AI-Powered Meal Planning
- Historical preference data via `comidas_historial`
- Nutritional optimization via age-specific requirements
- Seasonal ingredient recommendations
- Difficulty progression tracking

### Advanced Nutrition Tracking
- Daily nutrition compliance monitoring
- Dietary restriction management per family member
- Weekly nutrition goal setting and achievement

### Social Features
- Recipe sharing between families
- Community ratings and reviews
- Collaborative meal planning

### Financial Management
- Detailed cost tracking per ingredient
- Budget management and alerts
- Price trend analysis

---

## Migration and Maintenance

### Database Versioning
- All structural changes tracked via migrations
- Backward compatibility maintained
- Data migration scripts for schema updates

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Cross-region replication for disaster recovery

### Monitoring
- Query performance monitoring
- Storage growth tracking
- User activity analytics

---

## Security Considerations

### Data Protection
- Password hashing with bcrypt
- UUID keys prevent enumeration attacks
- Family data isolation via foreign key constraints

### Access Control
- Role-based permissions (chef vs family member)
- Family-level data access restrictions
- Session management via secure cookies

### Privacy
- Personal data (birthdates, weights) encrypted at rest
- Ingredient preferences anonymized for analytics
- GDPR compliance ready with data export capabilities

---

*This documentation represents the complete Comida Simple database architecture as of June 2025. The system balances complexity with maintainability while providing a robust foundation for family meal planning at scale.*