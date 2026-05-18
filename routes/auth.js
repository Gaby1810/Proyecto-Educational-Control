const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const db      = require("../db");
const { requireAuth } = require("../middlewares/auth");

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS || 3);
const LOGIN_LOCK_MINUTES = Number(process.env.AUTH_LOCKOUT_MINUTES || 15);

const regexCorreo   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const regexDUI      = /^\d{8}-\d$/;
const regexTelefono = /^\d{4}-?\d{4}$/;
const regexPassword = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function sanitize(str) {
    return String(str || "").trim().slice(0, 255);
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

async function obtenerIntentoLogin(correo) {
    const result = await query(
        "SELECT correo, intentos_fallidos, bloqueado_hasta FROM login_intentos WHERE correo=?",
        [correo]
    );
    return result[0] || null;
}

async function limpiarIntentosLogin(correo) {
    await query("DELETE FROM login_intentos WHERE correo=?", [correo]);
}

async function registrarIntentoFallido(correo) {
    const actual = await obtenerIntentoLogin(correo);
    const intentosFallidos = (actual?.intentos_fallidos || 0) + 1;
    const bloqueado = intentosFallidos >= MAX_LOGIN_ATTEMPTS;
    const bloqueadoHasta = bloqueado
        ? new Date(Date.now() + (LOGIN_LOCK_MINUTES * 60 * 1000))
        : null;

    await query(
        `INSERT INTO login_intentos (correo, intentos_fallidos, bloqueado_hasta)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE
            intentos_fallidos = VALUES(intentos_fallidos),
            bloqueado_hasta   = VALUES(bloqueado_hasta),
            ultimo_intento    = CURRENT_TIMESTAMP`,
        [correo, intentosFallidos, bloqueadoHasta]
    );

    return {
        bloqueado,
        intentosRestantes: Math.max(MAX_LOGIN_ATTEMPTS - intentosFallidos, 0),
    };
}

// REGISTER (solo estudiantes y docentes)
router.post("/register", async (req, res) => {
    try {
        let { nombre, correo, password, rol, dui, tipo_bachillerato, anio, telefono } = req.body;
        nombre   = sanitize(nombre);
        correo   = sanitize(correo).toLowerCase();
        password = String(password || "");
        rol      = sanitize(rol);
        dui      = dui ? sanitize(dui) : null;
        telefono = telefono ? sanitize(telefono) : null;

        if (!nombre || nombre.length < 3)
            return res.status(400).json({ message: "El nombre debe tener al menos 3 caracteres" });
        if (!regexCorreo.test(correo))
            return res.status(400).json({ message: "Correo electronico invalido" });
        if (!regexPassword.test(password))
            return res.status(400).json({ message: "La contrasena debe tener minimo 8 caracteres, letras y numeros" });

        // SEGURIDAD CRITICA: no permitir admin via /register
        if (rol === "admin")
            return res.status(403).json({ message: "El rol admin no se puede registrar publicamente" });
        if (!["estudiante", "docente"].includes(rol))
            return res.status(400).json({ message: "Rol invalido" });

        if (rol === "docente") {
            if (!dui || !regexDUI.test(dui))
                return res.status(400).json({ message: "DUI invalido (formato: 12345678-9)" });
            if (telefono && !regexTelefono.test(telefono))
                return res.status(400).json({ message: "Telefono invalido (formato: 7777-7777)" });
        }
        if (rol === "estudiante") {
            if (tipo_bachillerato && !["Tecnico", "General"].includes(tipo_bachillerato))
                return res.status(400).json({ message: "Tipo de bachillerato invalido" });
            if (anio && !["1", "2", "3"].includes(String(anio)))
                return res.status(400).json({ message: "Año inválido" });
        }

        db.query("SELECT id FROM usuarios WHERE correo=?", [correo], async (err, result) => {
            if (err) return res.status(500).json({ message: "Error servidor" });
            if (result.length > 0)
                return res.status(409).json({ message: "El correo ya esta registrado" });

            const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            let sql, values;
            if (rol === "estudiante") {
                sql = "INSERT INTO usuarios (nombre, correo, password, rol, tipo_bachillerato, anio, dui) VALUES (?,?,?,?,?,?,?)";
                values = [nombre, correo, hash, rol, tipo_bachillerato || null, anio || null, null];
            } else {
                sql = "INSERT INTO usuarios (nombre, correo, password, rol, telefono, dui) VALUES (?,?,?,?,?,?)";
                values = [nombre, correo, hash, rol, telefono, dui];
            }
            db.query(sql, values, (err) => {
                if (err) return res.status(500).json({ message: "Error servidor" });
                res.json({ message: "Usuario registrado correctamente" });
            });
        });
    } catch (e) {
        res.status(500).json({ message: "Error servidor" });
    }
});

// REGISTRO ADMIN protegido
router.post("/register-admin", async (req, res) => {
    try {
        let { nombre, correo, password, dui, token } = req.body;
        nombre   = sanitize(nombre);
        correo   = sanitize(correo).toLowerCase();
        password = String(password || "");
        dui      = dui ? sanitize(dui) : null;

        if (!regexCorreo.test(correo) || !regexPassword.test(password) || !nombre)
            return res.status(400).json({ message: "Datos invalidos" });

        db.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol='admin'", async (err, rows) => {
            if (err) return res.status(500).json({ message: "Error servidor" });
            const yaHayAdmin = rows[0].total > 0;
            if (!yaHayAdmin) {
                if (!process.env.ADMIN_REGISTRATION_TOKEN || token !== process.env.ADMIN_REGISTRATION_TOKEN)
                    return res.status(403).json({ message: "Token de bootstrap invalido" });
            } else {
                if (!req.session || !req.session.usuario || req.session.usuario.rol !== "admin")
                    return res.status(403).json({ message: "Solo un admin puede crear administradores" });
            }
            const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            db.query(
                "INSERT INTO usuarios (nombre, correo, password, rol, dui) VALUES (?,?,?,?,?)",
                [nombre, correo, hash, "admin", dui],
                (err) => {
                    if (err) {
                        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Correo ya registrado" });
                        return res.status(500).json({ message: "Error servidor" });
                    }
                    res.json({ message: "Administrador creado correctamente" });
                }
            );
        });
    } catch (e) {
        res.status(500).json({ message: "Error servidor" });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    const correo   = sanitize(req.body.correo).toLowerCase();
    const password = String(req.body.password || "");
    if (!regexCorreo.test(correo) || !password)
        return res.status(400).json({ message: "Credenciales invalidas" });

    try {
        const intentoActual = await obtenerIntentoLogin(correo);
        if (intentoActual?.bloqueado_hasta) {
            const bloqueadoHasta = new Date(intentoActual.bloqueado_hasta);
            if (bloqueadoHasta > new Date()) {
                return res.status(429).json({
                    message: `Demasiados intentos fallidos. Tu acceso está bloqueado durante ${LOGIN_LOCK_MINUTES} minutos.`,
                });
            }
            await limpiarIntentosLogin(correo);
        }

        const result = await query("SELECT * FROM usuarios WHERE correo=?", [correo]);
        if (result.length === 0) {
            const intento = await registrarIntentoFallido(correo);
            if (intento.bloqueado) {
                return res.status(429).json({
                    message: `Demasiados intentos fallidos. Tu acceso está bloqueado durante ${LOGIN_LOCK_MINUTES} minutos.`,
                });
            }
            return res.status(401).json({
                message: `Credenciales incorrectas. Intentos restantes antes del bloqueo: ${intento.intentosRestantes}.`,
            });
        }

        const user = result[0];
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            const intento = await registrarIntentoFallido(correo);
            if (intento.bloqueado) {
                return res.status(429).json({
                    message: `Demasiados intentos fallidos. Tu acceso está bloqueado durante ${LOGIN_LOCK_MINUTES} minutos.`,
                });
            }
            return res.status(401).json({
                message: `Credenciales incorrectas. Intentos restantes antes del bloqueo: ${intento.intentosRestantes}.`,
            });
        }

        await limpiarIntentosLogin(correo);

        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ message: "Error de sesion" });
            req.session.usuario = {
                id: user.id, nombre: user.nombre, rol: user.rol, correo: user.correo,
            };
            req.session.save(() => {
                res.json({ message: "Login correcto", rol: user.rol, nombre: user.nombre });
            });
        });
    } catch (e) {
        res.status(500).json({ message: "Error servidor" });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => { res.clearCookie("edu.sid"); res.json({ message: "Sesion cerrada" }); });
});
router.get("/logout", (req, res) => {
    req.session.destroy(() => { res.clearCookie("edu.sid"); res.json({ message: "Sesion cerrada" }); });
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ usuario: req.session.usuario });
});

module.exports = router;
