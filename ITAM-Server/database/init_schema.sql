-- SI YA EXISTÍAN LAS TABLAS, LAS BORRAMOS PARA RECREARLAS LIMPIAS
DROP TABLE IF EXISTS activos;
DROP TABLE IF EXISTS pisos;
DROP TABLE IF EXISTS edificios;

-- 1. Tabla de Edificios
CREATE TABLE edificios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100)
);

-- 2. Tabla de Pisos
CREATE TABLE pisos (
    id SERIAL PRIMARY KEY,
    edificio_id INTEGER REFERENCES edificios(id),
    nivel INTEGER NOT NULL,
    nombre_alias VARCHAR(50)
);

-- 3. Tabla de Activos (ACTUALIZADA CON HARDWARE)
CREATE TABLE activos (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    hostname VARCHAR(100),
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    usuario_detectado VARCHAR(100),
    
    -- NUEVOS CAMPOS DE HARDWARE/SOFTWARE
    marca VARCHAR(50),              -- Ej: HP, Dell, Lenovo
    sistema_operativo VARCHAR(100), -- Ej: Microsoft Windows 11 Pro
    procesador VARCHAR(100),        -- Ej: Intel(R) Core(TM) i7-10700
    memoria_ram VARCHAR(50),        -- Ej: 16 GB
    
    -- Estado
    ultimo_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    es_dominio BOOLEAN DEFAULT FALSE,
    
    -- Ubicación
    piso_id INTEGER REFERENCES pisos(id),
    pos_x FLOAT,
    pos_y FLOAT
);

-- Datos de prueba
INSERT INTO edificios (nombre, ciudad) VALUES ('Edificio Central', 'Chimbote');
INSERT INTO pisos (edificio_id, nivel, nombre_alias) VALUES (1, 1, 'Primer Piso');;