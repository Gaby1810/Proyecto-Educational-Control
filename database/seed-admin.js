/**
 * Script para crear el PRIMER admin de la plataforma.
 * Uso:  node database/seed-admin.js
 *
 * Lee las variables del .env y crea un usuario admin con password hasheado.
 * Modifica los valores ADMIN_NOMBRE, ADMIN_CORREO, ADMIN_PASSWORD aquí mismo.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql  = require("mysql2/promise");

const ADMIN_NOMBRE   = "Administrador Demo";
const ADMIN_CORREO   = "admin@demo.sv";
const ADMIN_PASSWORD = "Demo1234!";   // ⚠️  Cambiar después del primer login
const ADMIN_DUI      = "00000000-1";

(async () => {
    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST     || "localhost",
        user:     process.env.DB_USER     || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME     || "educational_control",
    });

    try {
        const [rows] = await conn.execute(
            "SELECT id FROM usuarios WHERE correo=?",
            [ADMIN_CORREO]
        );

        const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

        if (rows.length > 0) {
            await conn.execute(
                "UPDATE usuarios SET password=?, rol='admin' WHERE correo=?",
                [hash, ADMIN_CORREO]
            );
            console.log("✅ Admin existente actualizado:", ADMIN_CORREO);
        } else {
            await conn.execute(
                `INSERT INTO usuarios (nombre, correo, password, rol, dui)
                 VALUES (?,?,?,?,?)`,
                [ADMIN_NOMBRE, ADMIN_CORREO, hash, "admin", ADMIN_DUI]
            );
            console.log("✅ Admin creado:", ADMIN_CORREO);
        }
        console.log("   Password:", ADMIN_PASSWORD);
        console.log("   ⚠️  Cámbiala después del primer login.");
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await conn.end();
    }
})();
