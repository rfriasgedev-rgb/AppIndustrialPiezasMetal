require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

async function seed() {
    console.log('🌱 Iniciando seed de la base de datos...');
    try {
        // Crear usuario administrador por defecto
        // Crear usuario administrador por defecto
        let adminId = uuidv4();
        const hash = await bcrypt.hash('Admin123!', 10);
        await pool.query(
            `INSERT IGNORE INTO users (id, role_id, full_name, email, password_hash)
       VALUES (?, 1, 'Administrador del Sistema', 'admin@metalerp.com', ?)`,
            [adminId, hash]
        );

        // Obtener el ID real (por si ya existía y el INSERT IGNORE lo omitió)
        const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@metalerp.com']);
        if (adminRows.length > 0) {
            adminId = adminRows[0].id;
        }

        console.log('✅ Usuario admin creado o verificado: admin@metalerp.com');

        // Crear otros usuarios de prueba
        const testHash = await bcrypt.hash('Test1234!', 10);
        const testUsers = [
            { id: uuidv4(), role_id: 2, full_name: 'Supervisor General', email: 'supervisor@metalerp.com', password_hash: testHash },
            { id: uuidv4(), role_id: 3, full_name: 'Jose Perez', email: 'jperez@piezaserp.com', password_hash: testHash },
            { id: uuidv4(), role_id: 4, full_name: 'Almacenista Central', email: 'almacen@metalerp.com', password_hash: testHash },
            { id: uuidv4(), role_id: 5, full_name: 'Ventas Corporativas', email: 'ventas@metalerp.com', password_hash: testHash },
            { id: uuidv4(), role_id: 3, full_name: 'Maria Lopez', email: 'mlopez@metalerp.com', password_hash: testHash },
            { id: uuidv4(), role_id: 3, full_name: 'Carlos Ruiz', email: 'cruiz@metalerp.com', password_hash: testHash },
        ];

        for (const u of testUsers) {
            await pool.query(
                `INSERT IGNORE INTO users (id, role_id, full_name, email, password_hash) VALUES (?, ?, ?, ?, ?)`,
                [u.id, u.role_id, u.full_name, u.email, u.password_hash]
            );
        }
        console.log('✅ Usuarios de prueba (dummy data) creados exitosamente.');

        // Crear clientes de prueba
        const testClients = [
            { id: uuidv4(), company_name: 'Industrias Metalmecánicas SA', contact_name: 'Roberto Gómez', email: 'rgomez@metalmec.com', phone: '555-0101', address: 'Av. Industrial 123, Zona Norte', tax_id: 'NIT-100200300', credit_limit: 15000.00 },
            { id: uuidv4(), company_name: 'Construcciones del Valle', contact_name: 'Ana Martínez', email: 'amartinez@construvalle.com', phone: '555-0202', address: 'Carrera 45 #12-34', tax_id: 'NIT-200300400', credit_limit: 25000.00 },
            { id: uuidv4(), company_name: 'Ensambladora Nacional', contact_name: 'Carlos Torres', email: 'ctorres@ensamblenac.com', phone: '555-0303', address: 'Parque Industrial Sur, Lote 4', tax_id: 'NIT-300400500', credit_limit: 8000.00 },
            { id: uuidv4(), company_name: 'Talleres Automotrices Unidos', contact_name: 'Laura Sánchez', email: 'lsanchez@talleresunidos.net', phone: '555-0404', address: 'Av. Principal 890', tax_id: 'NIT-400500600', credit_limit: 12000.00 },
            { id: uuidv4(), company_name: 'Aceros y Perfiles Elite', contact_name: 'Miguel Díaz', email: 'mdiaz@aceroselite.com', phone: '555-0505', address: 'Zona Comercial, Mz B Lote 2', tax_id: 'NIT-500600700', credit_limit: 50000.00 },
            { id: uuidv4(), company_name: 'Estructuras Metálicas Pro', contact_name: 'Elena Rojas', email: 'erojas@estructuraspro.com', phone: '555-0606', address: 'Calle 100 #20-50', tax_id: 'NIT-600700800', credit_limit: 30000.00 },
            { id: uuidv4(), company_name: 'Maquinaria Agrícola Moderna', contact_name: 'Fernando Castro', email: 'fcastro@maqmoderna.com', phone: '555-0707', address: 'Ruta 5, Km 12', tax_id: 'NIT-700800900', credit_limit: 18000.00 },
            { id: uuidv4(), company_name: 'Sistemas de Ventilación SA', contact_name: 'Patricia Vega', email: 'pvega@sistemasvent.com', phone: '555-0808', address: 'Cl. 80 #15-22', tax_id: 'NIT-800900100', credit_limit: 5000.00 },
            { id: uuidv4(), company_name: 'Equipos Médicos Especializados', contact_name: 'Jorge Mendoza', email: 'jmendoza@equiposmed.com', phone: '555-0909', address: 'Av. Salud 456', tax_id: 'NIT-900100200', credit_limit: 22000.00 },
            { id: uuidv4(), company_name: 'Ferretería Industrial Mayorista', contact_name: 'Sofía Herrera', email: 'sherrera@ferreteriaind.com', phone: '555-1010', address: 'Centro Empresarial Norte, Bodega 8', tax_id: 'NIT-010203040', credit_limit: 40000.00 }
        ];

        for (const c of testClients) {
            await pool.query(
                `INSERT IGNORE INTO clients (id, company_name, contact_name, email, phone, address, tax_id, credit_limit, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [c.id, c.company_name, c.contact_name, c.email, c.phone, c.address, c.tax_id, c.credit_limit, adminId]
            );
        }
        console.log('✅ Clientes de prueba (dummy data) creados exitosamente.');


        // Crear items de inventario de ejemplo
        const items = [
            { category_id: 1, name: 'Lámina Magnesio AZ31 1.5mm', sku: 'MAG-AZ31-15', qty: 500, reorder: 100, cost: 12.50, location: 'Bodega A-1' },
            { category_id: 2, name: 'Alambre Cromo Duro 3mm', sku: 'CRO-AD3-00', qty: 200, reorder: 50, cost: 18.75, location: 'Bodega A-2' },
            { category_id: 3, name: 'Lingote Zinc 99.9%', sku: 'ZNC-99-LG', qty: 1000, reorder: 200, cost: 3.20, location: 'Bodega B-1' },
            { category_id: 4, name: 'Lámina Acero Galvanizado 2mm', sku: 'ACE-GAL-2', qty: 750, reorder: 150, cost: 4.80, location: 'Bodega B-2' },
            { category_id: 5, name: 'Perfil Aluminio Extruido 40x40', sku: 'ALU-P40-EX', qty: 300, reorder: 60, cost: 7.25, location: 'Bodega C-1' },
            { category_id: 6, name: 'Pintura Epoxi Gris Industria 4L', sku: 'PIN-EPX-GR4', qty: 80, reorder: 20, cost: 24.00, location: 'Pinturería' },
        ];

        for (const item of items) {
            const id = uuidv4();
            await pool.query(
                `INSERT IGNORE INTO inventory_items (id, category_id, name, sku, quantity_available, reorder_point, unit_cost, location)
         VALUES (?,?,?,?,?,?,?,?)`,
                [id, item.category_id, item.name, item.sku, item.qty, item.reorder, item.cost, item.location]
            );
        }
        console.log('✅ Items de inventario de ejemplo creados.');

        // Crear catálogo de productos de prueba
        const testProducts = [
            { id: uuidv4(), name: 'Carcasa Metálica Motor V8', part_number: 'CM-V8-001', description: 'Carcasa base para ensamble de motor tracción.', requires_assembly: true, standard_hours: 12.5, sale_price: 450.00 },
            { id: uuidv4(), name: 'Soporte Estructural Reforzado', part_number: 'SE-R-012', description: 'Soporte en acero para estructuras de carga pesada.', requires_assembly: false, standard_hours: 4.0, sale_price: 120.00 },
            { id: uuidv4(), name: 'Panel Frontal Equipo Médico', part_number: 'PF-MED-X', description: 'Panel de aluminio extruido con cortes milimétricos.', requires_assembly: false, standard_hours: 6.5, sale_price: 280.00 },
            { id: uuidv4(), name: 'Eje de Transmisión Principal', part_number: 'EJE-TR-99', description: 'Eje torneado en cromo endurecido.', requires_assembly: false, standard_hours: 8.0, sale_price: 315.50 },
            { id: uuidv4(), name: 'Chasis de Cuatrimoto (ATV)', part_number: 'CH-ATV-2024', description: 'Estructura tubular soldada y pintada.', requires_assembly: true, standard_hours: 24.0, sale_price: 1250.00 },
            { id: uuidv4(), name: 'Cubierta de Ventilación', part_number: 'CV-IND-05', description: 'Rejilla troquelada en acero galvanizado.', requires_assembly: false, standard_hours: 2.5, sale_price: 45.00 },
            { id: uuidv4(), name: 'Brazo Robótico Articulado', part_number: 'BRAZ-ROB-3D', description: 'Conjunto de piezas de magnesio ensambladas con precisión.', requires_assembly: true, standard_hours: 40.0, sale_price: 3500.00 },
            { id: uuidv4(), name: 'Engranaje Cónico Helicoidal', part_number: 'ENG-CH-45', description: 'Engranaje de precisión para cajas reductoras.', requires_assembly: false, standard_hours: 18.0, sale_price: 680.00 },
            { id: uuidv4(), name: 'Tanque de Presión 50L', part_number: 'TAN-P-50L', description: 'Tanque soldado con pruebas hidrostáticas.', requires_assembly: true, standard_hours: 15.0, sale_price: 590.00 },
            { id: uuidv4(), name: 'Perfilería Ventanas Blindadas', part_number: 'PER-BLI-01', description: 'Marcos pesados para vidrios de seguridad.', requires_assembly: false, standard_hours: 5.5, sale_price: 185.00 }
        ];

        for (const p of testProducts) {
            await pool.query(
                `INSERT IGNORE INTO product_catalog (id, name, part_number, description, requires_assembly, standard_hours, sale_price) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [p.id, p.name, p.part_number, p.description, p.requires_assembly ? 1 : 0, p.standard_hours, p.sale_price]
            );
        }
        console.log('✅ Catálogo de productos (10 piezas de prueba) creados/verificados.');

        console.log('\n🚀 Seed completado. Ya puedes iniciar el servidor.');
    } catch (err) {
        console.error('❌ Error en seed:', err);
    } finally {
        await pool.end();
    }
}

seed();
