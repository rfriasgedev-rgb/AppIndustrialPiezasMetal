const { pool } = require('./connection');

async function migrate() {
    console.log('🔄 Ejecutando consolidación de base de datos...');
    global.migrationResults = [];
    const log = (msg) => {
        console.log(msg);
        global.migrationResults.push(`[${new Date().toISOString()}] ${msg}`);
    };

    const run = async (label, sql) => {
        try {
            await pool.query(sql);
            log(`✅ ${label}`);
        } catch (err) {
            // Ignorar errores de duplicados/ya-existe para permitir re-ejecución segura
            const ignorable = [
                'ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_DUP_ENTRY',
                'ER_TABLE_EXISTS_ERROR'
            ];
            if (ignorable.includes(err.code) || [1060, 1061, 1062, 1050].includes(err.errno)) {
                log(`⚠️  ${label}: ya existía (OK)`);
            } else {
                log(`❌ ${label}: ${err.message}`);
            }
        }
    };

    try {
        log('🔌 Conexión al pool establecida.');

        // ── 1. TABLAS BASE (idempotentes con IF NOT EXISTS) ────────────────────

        await run('tabla roles', `
            CREATE TABLE IF NOT EXISTS roles (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        await run('tabla users', `
            CREATE TABLE IF NOT EXISTS users (
                id CHAR(36) NOT NULL PRIMARY KEY,
                role_id INT UNSIGNED NOT NULL,
                full_name VARCHAR(120) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
            ) ENGINE=InnoDB
        `);

        await run('roles seed', `
            INSERT IGNORE INTO roles (id, name, description) VALUES
                (1, 'ADMIN',       'Acceso total al sistema.'),
                (2, 'SUPERVISOR',  'Supervisa órdenes de producción.'),
                (3, 'OPERADOR',    'Ejecuta etapas de producción.'),
                (4, 'ALMACENISTA', 'Gestiona inventario.'),
                (5, 'VENTAS',      'Gestiona clientes y órdenes.')
        `);

        // ── 2. TABLAS RRHH (UUID) ──────────────────────────────────────────────

        await run('tabla departments', `
            CREATE TABLE IF NOT EXISTS departments (
                id CHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        await run('tabla shifts', `
            CREATE TABLE IF NOT EXISTS shifts (
                id CHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        await run('tabla employee_roles', `
            CREATE TABLE IF NOT EXISTS employee_roles (
                id CHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        await run('tabla employees', `
            CREATE TABLE IF NOT EXISTS employees (
                id CHAR(36) NOT NULL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(150),
                phone VARCHAR(30),
                department_id CHAR(36) NOT NULL,
                shift_id CHAR(36) NOT NULL,
                employee_role_id CHAR(36) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
                CONSTRAINT fk_emp_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
                CONSTRAINT fk_emp_role FOREIGN KEY (employee_role_id) REFERENCES employee_roles(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        await run('tabla production_lines', `
            CREATE TABLE IF NOT EXISTS production_lines (
                id CHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                leader_employee_id CHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_pline_leader FOREIGN KEY (leader_employee_id) REFERENCES employees(id) ON DELETE SET NULL
            ) ENGINE=InnoDB
        `);

        await run('tabla production_line_employees', `
            CREATE TABLE IF NOT EXISTS production_line_employees (
                line_id CHAR(36) NOT NULL,
                employee_id CHAR(36) NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (line_id, employee_id),
                CONSTRAINT fk_ple_line FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
                CONSTRAINT fk_ple_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Columnas FK en users para RRHH (pueden ya existir)
        await run('users.department_id column', `ALTER TABLE users ADD COLUMN department_id CHAR(36) NULL`);
        await run('users.shift_id column',      `ALTER TABLE users ADD COLUMN shift_id CHAR(36) NULL`);
        await run('users FK dept',  `ALTER TABLE users ADD CONSTRAINT fk_users_dept  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL`);
        await run('users FK shift', `ALTER TABLE users ADD CONSTRAINT fk_users_shift FOREIGN KEY (shift_id)      REFERENCES shifts(id)      ON DELETE SET NULL`);

        // ── 3. TABLAS DE PRODUCCIÓN ────────────────────────────────────────────

        await run('tabla clients', `
            CREATE TABLE IF NOT EXISTS clients (
                id CHAR(36) NOT NULL PRIMARY KEY,
                company_name VARCHAR(200) NOT NULL,
                contact_name VARCHAR(120),
                email VARCHAR(150) UNIQUE,
                phone VARCHAR(30),
                address TEXT,
                tax_id VARCHAR(50) UNIQUE,
                credit_limit DECIMAL(15,2) DEFAULT 0.00,
                outstanding_balance DECIMAL(15,2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_by CHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_clients_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB
        `);

        await run('tabla material_categories', `
            CREATE TABLE IF NOT EXISTS material_categories (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'kg',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        await run('tabla inventory_items', `
            CREATE TABLE IF NOT EXISTS inventory_items (
                id CHAR(36) NOT NULL PRIMARY KEY,
                category_id INT UNSIGNED NOT NULL,
                name VARCHAR(200) NOT NULL,
                sku VARCHAR(80) UNIQUE,
                description TEXT,
                quantity_available DECIMAL(15,3) NOT NULL DEFAULT 0,
                quantity_reserved DECIMAL(15,3) NOT NULL DEFAULT 0,
                reorder_point DECIMAL(15,3) DEFAULT 0,
                unit_cost DECIMAL(15,4) DEFAULT 0,
                location VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_inv_category FOREIGN KEY (category_id) REFERENCES material_categories(id)
            ) ENGINE=InnoDB
        `);

        await run('tabla product_catalog', `
            CREATE TABLE IF NOT EXISTS product_catalog (
                id CHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                part_number VARCHAR(80) UNIQUE,
                description TEXT,
                requires_assembly BOOLEAN DEFAULT FALSE,
                standard_hours DECIMAL(8,2),
                sale_price DECIMAL(15,2) DEFAULT 0,
                unit_of_measure_id CHAR(36) NULL,
                image_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_prod_unit FOREIGN KEY (unit_of_measure_id) REFERENCES measurement_units(id) ON DELETE SET NULL
            ) ENGINE=InnoDB
        `);

        // Patch: Asegurar columna unit_of_measure_id en product_catalog si ya existe la tabla
        await run('product_catalog.unit_of_measure_id', `ALTER TABLE product_catalog ADD COLUMN unit_of_measure_id CHAR(36) NULL`);
        await run('product_catalog fk_prod_unit', `ALTER TABLE product_catalog ADD CONSTRAINT fk_prod_unit FOREIGN KEY (unit_of_measure_id) REFERENCES measurement_units(id) ON DELETE SET NULL`);

        await run('tabla production_orders', `
            CREATE TABLE IF NOT EXISTS production_orders (
                id CHAR(36) NOT NULL PRIMARY KEY,
                order_number VARCHAR(30) NOT NULL UNIQUE,
                client_id CHAR(36) NOT NULL,
                status ENUM('DRAFT','PENDING_MATERIAL','IN_PROGRESS','READY_FOR_DELIVERY','DELIVERED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                priority ENUM('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
                estimated_delivery DATE,
                actual_delivery DATE,
                notes TEXT,
                created_by CHAR(36) NOT NULL,
                assigned_to CHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_prod_client FOREIGN KEY (client_id) REFERENCES clients(id),
                CONSTRAINT fk_prod_creator FOREIGN KEY (created_by) REFERENCES users(id)
            ) ENGINE=InnoDB
        `);

        await run('tabla production_order_details', `
            CREATE TABLE IF NOT EXISTS production_order_details (
                id CHAR(36) NOT NULL PRIMARY KEY,
                order_id CHAR(36) NOT NULL,
                product_id CHAR(36) NOT NULL,
                quantity INT UNSIGNED NOT NULL DEFAULT 1,
                stage ENUM(
                    'DESIGN','PENDING_MATERIAL','CUTTING','BENDING','ASSEMBLY',
                    'WELDING','CLEANING','PAINTING','QUALITY_CHECK','READY','CANCELLED'
                ) NOT NULL DEFAULT 'DESIGN',
                requires_assembly BOOLEAN DEFAULT FALSE,
                notes TEXT,
                assigned_to CHAR(36),
                production_line_id CHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_podets_order   FOREIGN KEY (order_id)   REFERENCES production_orders(id) ON DELETE CASCADE,
                CONSTRAINT fk_podets_product FOREIGN KEY (product_id) REFERENCES product_catalog(id)
            ) ENGINE=InnoDB
        `);

        // CRÍTICO: Asegurar que el ENUM tenga todos los valores aunque la tabla ya existiera
        await run('MODIFY stage ENUM (patch)', `
            ALTER TABLE production_order_details MODIFY COLUMN stage ENUM(
                'DESIGN','PENDING_MATERIAL','CUTTING','BENDING','ASSEMBLY',
                'WELDING','CLEANING','PAINTING','QUALITY_CHECK','READY','CANCELLED'
            ) NOT NULL DEFAULT 'DESIGN'
        `);

        // Columna production_line_id en details (puede ya existir)
        await run('production_order_details.production_line_id', `
            ALTER TABLE production_order_details ADD COLUMN production_line_id CHAR(36) NULL
        `);

        await run('tabla production_stage_log', `
            CREATE TABLE IF NOT EXISTS production_stage_log (
                id CHAR(36) NOT NULL PRIMARY KEY,
                order_detail_id CHAR(36) NOT NULL,
                from_status VARCHAR(50),
                to_status VARCHAR(50) NOT NULL,
                notes TEXT,
                stage_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                stage_completed_at TIMESTAMP NULL,
                performed_by CHAR(36) NOT NULL,
                operator_name VARCHAR(150) NULL,
                operator_role VARCHAR(100) NULL,
                CONSTRAINT fk_stlog_orderdet FOREIGN KEY (order_detail_id) REFERENCES production_order_details(id) ON DELETE CASCADE,
                CONSTRAINT fk_stlog_user     FOREIGN KEY (performed_by)    REFERENCES users(id)
            ) ENGINE=InnoDB
        `);

        // CRÍTICO: Columnas de snapshot de operador (pueden no existir en DB vieja)
        await run('production_stage_log.operator_name', `ALTER TABLE production_stage_log ADD COLUMN operator_name VARCHAR(150) NULL`);
        await run('production_stage_log.operator_role', `ALTER TABLE production_stage_log ADD COLUMN operator_role VARCHAR(100) NULL`);
        // Cantidad de piezas transferida a la siguiente etapa
        await run('production_stage_log.quantity_passed', `ALTER TABLE production_stage_log ADD COLUMN quantity_passed INT UNSIGNED NULL`);
        // Cantidad original solicitada en la orden (para historial en cada etapa)
        await run('production_stage_log.quantity_requested', `ALTER TABLE production_stage_log ADD COLUMN quantity_requested INT UNSIGNED NULL`);

        await run('tabla production_stage_log_team', `
            CREATE TABLE IF NOT EXISTS production_stage_log_team (
                id CHAR(36) NOT NULL PRIMARY KEY,
                production_stage_log_id CHAR(36) NOT NULL,
                employee_name VARCHAR(150) NOT NULL,
                employee_role VARCHAR(100),
                CONSTRAINT fk_log_team FOREIGN KEY (production_stage_log_id) REFERENCES production_stage_log(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // ── 4. OTRAS TABLAS ────────────────────────────────────────────────────

        await run('tabla purchases', `
            CREATE TABLE IF NOT EXISTS purchases (
                id CHAR(36) NOT NULL PRIMARY KEY,
                idempotency_key VARCHAR(100) UNIQUE,
                supplier_name VARCHAR(200) NOT NULL,
                item_id CHAR(36) NOT NULL,
                quantity_ordered DECIMAL(15,3) NOT NULL,
                quantity_received DECIMAL(15,3) DEFAULT 0,
                unit_price DECIMAL(15,4) NOT NULL,
                total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
                status ENUM('PENDING','ORDERED','PARTIAL','RECEIVED','CANCELLED') DEFAULT 'PENDING',
                expected_date DATE,
                received_date DATE,
                notes TEXT,
                created_by CHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_pur_item FOREIGN KEY (item_id) REFERENCES inventory_items(id),
                CONSTRAINT fk_pur_user FOREIGN KEY (created_by) REFERENCES users(id)
            ) ENGINE=InnoDB
        `);

        await run('tabla requisitions', `
            CREATE TABLE IF NOT EXISTS requisitions (
                id CHAR(36) NOT NULL PRIMARY KEY,
                order_id CHAR(36) NOT NULL UNIQUE,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                generated_by CHAR(36),
                CONSTRAINT fk_req_order FOREIGN KEY (order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
                CONSTRAINT fk_req_user FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB
        `);

        await run('tabla audit_log', `
            CREATE TABLE IF NOT EXISTS audit_log (
                id CHAR(36) NOT NULL PRIMARY KEY,
                table_name VARCHAR(80) NOT NULL,
                record_id VARCHAR(100) NOT NULL,
                action ENUM('INSERT','UPDATE','DELETE') NOT NULL,
                old_values JSON,
                new_values JSON,
                performed_by CHAR(36),
                ip_address VARCHAR(45),
                user_agent TEXT,
                performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        // Columnas de unidades de medida (patch)
        await run('inventory_items.unit_of_measure', `ALTER TABLE inventory_items ADD COLUMN unit_of_measure VARCHAR(30) NULL`);
        await run('inventory_items.unit_id',         `ALTER TABLE inventory_items ADD COLUMN unit_id INT UNSIGNED NULL`);

        await run('tabla measurement_units', `
            CREATE TABLE IF NOT EXISTS measurement_units (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                abbreviation VARCHAR(10) NOT NULL UNIQUE,
                category ENUM('weight','volume','length','area','count','other') DEFAULT 'other',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        // Ampliar image_url para soportar base64 (imágenes almacenadas en BD)
        await run('product_catalog.image_url → MEDIUMTEXT', `
            ALTER TABLE product_catalog MODIFY COLUMN image_url MEDIUMTEXT NULL
        `);

        // Compatibilidad: measurement_units.unit_of_measure_id
        await run('inventory_items.unit_of_measure_id column', `ALTER TABLE inventory_items ADD COLUMN unit_of_measure_id INT UNSIGNED NULL`);

        // ── 5. TABLA COMPANY (singleton) ───────────────────────────────────────
        await run('tabla company', `
            CREATE TABLE IF NOT EXISTS company (
                id         VARCHAR(36)   NOT NULL DEFAULT 'COMPANY_SINGLETON',
                name       VARCHAR(255)  NOT NULL,
                phone      VARCHAR(50)   NULL,
                email      VARCHAR(255)  NULL,
                created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by VARCHAR(36)   NULL,
                updated_by VARCHAR(36)   NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        log('\u2705 Sistema de base de datos estabilizado.');

        return true;
    } catch (error) {
        if (global.migrationResults) {
            global.migrationResults.push(`[${new Date().toISOString()}] ❌ ERROR: ${error.message}`);
        }
        console.error('❌ Error en estabilización:', error);
        return false;
    }
}

module.exports = { migrate };
