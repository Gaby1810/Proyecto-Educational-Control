-- =========================================
-- EDUCATIONAL CONTROL - SCHEMA OPTIMIZADO
-- Versión: 1.1
-- Base de datos con índices, charset utf8mb4 y restricciones
-- =========================================

DROP DATABASE IF EXISTS educational_control;
CREATE DATABASE educational_control
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE educational_control;

-- =========================================
-- USUARIOS
-- =========================================
CREATE TABLE usuarios (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    correo              VARCHAR(150) UNIQUE NOT NULL,
    password            VARCHAR(255) NOT NULL,
    rol                 ENUM('estudiante', 'docente', 'admin') NOT NULL,
    dui                 VARCHAR(20) UNIQUE,
    tipo_bachillerato   ENUM('Tecnico', 'General') NULL,
    anio                ENUM('1', '2', '3') NULL,
    telefono            VARCHAR(20),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rol (rol),
    INDEX idx_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- LOGIN_INTENTOS (bloqueo temporal por intentos fallidos)
-- =========================================
CREATE TABLE login_intentos (
    correo              VARCHAR(150) PRIMARY KEY,
    intentos_fallidos   INT NOT NULL DEFAULT 0,
    bloqueado_hasta     DATETIME NULL,
    ultimo_intento      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bloqueado_hasta (bloqueado_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- MATERIAS
-- =========================================
CREATE TABLE materias (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- DOCENTE_MATERIAS (Clases)
-- =========================================
CREATE TABLE docente_materias (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    docente_id      INT NOT NULL,
    materia_id      INT NOT NULL,
    grado           VARCHAR(30),
    seccion         VARCHAR(30),
    codigo_clase    VARCHAR(20) UNIQUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    INDEX idx_codigo (codigo_clase),
    INDEX idx_docente (docente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- ESTUDIANTE_MATERIAS (inscripciones)
-- =========================================
CREATE TABLE estudiante_materias (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id       INT NOT NULL,
    docente_materia_id  INT NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inscripcion (estudiante_id, docente_materia_id),
    FOREIGN KEY (estudiante_id)       REFERENCES usuarios(id)         ON DELETE CASCADE,
    FOREIGN KEY (docente_materia_id)  REFERENCES docente_materias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- MATERIALES
-- =========================================
CREATE TABLE materiales (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    docente_materia_id  INT NOT NULL,
    titulo              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    archivo             VARCHAR(255) NOT NULL,
    tipo                VARCHAR(20) DEFAULT 'otro',
    fecha_subida        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_materia_id) REFERENCES docente_materias(id) ON DELETE CASCADE,
    INDEX idx_clase (docente_materia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- TAREAS
-- =========================================
CREATE TABLE tareas (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    docente_materia_id  INT NOT NULL,
    titulo              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    archivo             VARCHAR(255),
    tipo                VARCHAR(20) DEFAULT 'otro',
    fecha_subida        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega       DATETIME,
    valor               DECIMAL(5,2) DEFAULT 10,
    FOREIGN KEY (docente_materia_id) REFERENCES docente_materias(id) ON DELETE CASCADE,
    INDEX idx_clase (docente_materia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- ENTREGAS DE TAREAS
-- =========================================
CREATE TABLE entregas_tareas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id        INT NOT NULL,
    estudiante_id   INT NOT NULL,
    archivo         VARCHAR(255),
    comentario      TEXT,
    fecha_entrega   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nota            DECIMAL(5,2),
    estado          ENUM('Pendiente', 'Entregado', 'Calificado') DEFAULT 'Pendiente',
    UNIQUE KEY uq_entrega (tarea_id, estudiante_id),
    FOREIGN KEY (tarea_id)       REFERENCES tareas(id)    ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    INDEX idx_tarea (tarea_id),
    INDEX idx_estudiante (estudiante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- ASISTENCIA
-- =========================================
CREATE TABLE asistencia (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    docente_materia_id  INT NOT NULL,
    estudiante_id       INT NOT NULL,
    fecha               DATE NOT NULL,
    presente            BOOLEAN NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_asistencia (docente_materia_id, estudiante_id, fecha),
    FOREIGN KEY (docente_materia_id) REFERENCES docente_materias(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id)      REFERENCES usuarios(id)         ON DELETE CASCADE,
    INDEX idx_clase_fecha (docente_materia_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- DATOS DE EJEMPLO PARA LA DEMO
-- Passwords todos: Demo1234! (hash bcrypt rounds 12)
-- =========================================
-- Admin demo (correo: admin@demo.sv  password: Demo1234!)
INSERT INTO usuarios (nombre, correo, password, rol, dui) VALUES
('Administrador Demo', 'admin@demo.sv',
 '$2b$12$5sZ8qK4Q4LqV5R4cWyP9HuYjxKzC1xK8mFhU8.kK6jH7yT9pQ3vBC',
 'admin', '00000000-1');

-- NOTA: el hash anterior es solo placeholder. Usa el script seed-admin.js
-- o registra el admin vía POST /api/auth/register-admin con el token del .env
-- Para poblar docentes, estudiantes y clases de ejemplo usa: node database/seed-demo.js
