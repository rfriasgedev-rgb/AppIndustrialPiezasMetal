-- ----------------------------------------------------------------
-- PATCH: Expandir ENUM de etapas en production_order_details
-- Agrega DESIGN, WELDING y normaliza el orden del flujo completo
-- Es seguro re-ejecutar (MODIFY no falla si ya tiene esos valores)
-- ----------------------------------------------------------------

ALTER TABLE production_order_details
MODIFY COLUMN stage ENUM(
    'DESIGN',
    'PENDING_MATERIAL',
    'CUTTING',
    'BENDING',
    'ASSEMBLY',
    'WELDING',
    'CLEANING',
    'PAINTING',
    'QUALITY_CHECK',
    'READY',
    'CANCELLED'
) NOT NULL DEFAULT 'DESIGN';
