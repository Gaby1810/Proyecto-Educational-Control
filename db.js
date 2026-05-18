require("dotenv").config();
const mysql = require("mysql2");

// Pool de conexiones (mas estable que createConnection)
const pool = mysql.createPool({
    host:     process.env.DB_HOST     || "localhost",
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "educational_control",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4"
});

const ensureLoginAttemptsTableSql = `
CREATE TABLE IF NOT EXISTS login_intentos (
    correo              VARCHAR(150) PRIMARY KEY,
    intentos_fallidos   INT NOT NULL DEFAULT 0,
    bloqueado_hasta     DATETIME NULL,
    ultimo_intento      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bloqueado_hasta (bloqueado_hasta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

pool.getConnection((err, conn) => {
    if (err) {
        console.error("Error de conexion MySQL:", err.message);
        return;
    }
    conn.query(ensureLoginAttemptsTableSql, (tableErr) => {
        if (tableErr) {
            console.error("No se pudo verificar la tabla login_intentos:", tableErr.message);
        } else {
            console.log("Tabla login_intentos verificada");
        }

        console.log("MySQL conectado (pool)");
        conn.release();
    });
});

module.exports = pool;
