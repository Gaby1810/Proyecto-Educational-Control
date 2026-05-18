const bcrypt = require("bcryptjs");
const db = require("../db");

const BCRYPT_ROUNDS = 12;

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

async function ensureUser({
    nombre,
    correo,
    password,
    rol,
    dui = null,
    tipo_bachillerato = null,
    anio = null,
    telefono = null,
}) {
    const existente = await query("SELECT id FROM usuarios WHERE correo=?", [correo]);
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    if (existente.length > 0) {
        await query(
            `UPDATE usuarios
             SET nombre=?, correo=?, password=?, rol=?, dui=?, tipo_bachillerato=?, anio=?, telefono=?
             WHERE id=?`,
            [nombre, correo, hash, rol, dui, tipo_bachillerato, anio, telefono, existente[0].id]
        );
        return existente[0].id;
    }

    const result = await query(
        `INSERT INTO usuarios
         (nombre, correo, password, rol, dui, tipo_bachillerato, anio, telefono)
         VALUES (?,?,?,?,?,?,?,?)`,
        [nombre, correo, hash, rol, dui, tipo_bachillerato, anio, telefono]
    );

    return result.insertId;
}

async function ensureMateria(nombre) {
    const existente = await query("SELECT id FROM materias WHERE nombre=?", [nombre]);
    if (existente.length > 0) return existente[0].id;

    const result = await query("INSERT INTO materias (nombre) VALUES (?)", [nombre]);
    return result.insertId;
}

async function ensureClase({ docenteId, materiaId, grado, seccion, codigo }) {
    const existente = await query("SELECT id FROM docente_materias WHERE codigo_clase=?", [codigo]);

    if (existente.length > 0) {
        await query(
            `UPDATE docente_materias
             SET docente_id=?, materia_id=?, grado=?, seccion=?
             WHERE id=?`,
            [docenteId, materiaId, grado, seccion, existente[0].id]
        );
        return existente[0].id;
    }

    const result = await query(
        `INSERT INTO docente_materias
         (docente_id, materia_id, grado, seccion, codigo_clase)
         VALUES (?,?,?,?,?)`,
        [docenteId, materiaId, grado, seccion, codigo]
    );

    return result.insertId;
}

async function ensureInscripcion(estudianteId, claseId) {
    await query(
        "INSERT IGNORE INTO estudiante_materias (estudiante_id, docente_materia_id) VALUES (?,?)",
        [estudianteId, claseId]
    );
}

async function ensureTarea({ claseId, titulo, descripcion, fechaEntrega, valor }) {
    const existente = await query(
        "SELECT id FROM tareas WHERE docente_materia_id=? AND titulo=?",
        [claseId, titulo]
    );

    if (existente.length > 0) return existente[0].id;

    const result = await query(
        `INSERT INTO tareas
         (docente_materia_id, titulo, descripcion, archivo, tipo, fecha_entrega, valor)
         VALUES (?,?,?,?,?,?,?)`,
        [claseId, titulo, descripcion, null, "guia", fechaEntrega, valor]
    );

    return result.insertId;
}

async function seedDemoData() {
    const docenteId = await ensureUser({
        nombre: "Docente Demo",
        correo: "docente.demo@demo.sv",
        password: "Demo1234!",
        rol: "docente",
        dui: "12345678-9",
        telefono: "7777-7777",
    });

    const estudianteUnoId = await ensureUser({
        nombre: "Ana Lopez",
        correo: "ana.lopez@demo.sv",
        password: "Demo1234!",
        rol: "estudiante",
        tipo_bachillerato: "General",
        anio: "1",
    });

    const estudianteDosId = await ensureUser({
        nombre: "Luis Martinez",
        correo: "luis.martinez@demo.sv",
        password: "Demo1234!",
        rol: "estudiante",
        tipo_bachillerato: "Tecnico",
        anio: "1",
    });

    const estudianteTresId = await ensureUser({
        nombre: "Sofia Ramirez",
        correo: "sofia.ramirez@demo.sv",
        password: "Demo1234!",
        rol: "estudiante",
        tipo_bachillerato: "General",
        anio: "2",
    });

    const matematicaId = await ensureMateria("Matematica");
    const cienciasId = await ensureMateria("Ciencias");
    const lenguajeId = await ensureMateria("Lenguaje");

    const claseMateId = await ensureClase({
        docenteId,
        materiaId: matematicaId,
        grado: "1",
        seccion: "A",
        codigo: "MATE1A26",
    });

    const claseCienciasId = await ensureClase({
        docenteId,
        materiaId: cienciasId,
        grado: "1",
        seccion: "B",
        codigo: "CIEN1B26",
    });

    const claseLenguajeId = await ensureClase({
        docenteId,
        materiaId: lenguajeId,
        grado: "2",
        seccion: "A",
        codigo: "LENG2A26",
    });

    await ensureInscripcion(estudianteUnoId, claseMateId);
    await ensureInscripcion(estudianteUnoId, claseCienciasId);
    await ensureInscripcion(estudianteDosId, claseMateId);
    await ensureInscripcion(estudianteDosId, claseCienciasId);
    await ensureInscripcion(estudianteTresId, claseLenguajeId);

    await ensureTarea({
        claseId: claseMateId,
        titulo: "Guia diagnostica de algebra",
        descripcion: "Resuelve los ejercicios 1 al 10 y entrega tu procedimiento.",
        fechaEntrega: "2026-06-01 23:59:00",
        valor: 10,
    });

    await ensureTarea({
        claseId: claseLenguajeId,
        titulo: "Lectura comprensiva",
        descripcion: "Lee el texto compartido en clase y responde las preguntas.",
        fechaEntrega: "2026-06-03 23:59:00",
        valor: 15,
    });

    const [usuarios, clases, inscripciones] = await Promise.all([
        query("SELECT COUNT(*) AS total FROM usuarios"),
        query("SELECT COUNT(*) AS total FROM docente_materias"),
        query("SELECT COUNT(*) AS total FROM estudiante_materias"),
    ]);

    return {
        docente: {
            correo: "docente.demo@demo.sv",
            password: "Demo1234!",
        },
        estudiantes: [
            { correo: "ana.lopez@demo.sv", password: "Demo1234!" },
            { correo: "luis.martinez@demo.sv", password: "Demo1234!" },
            { correo: "sofia.ramirez@demo.sv", password: "Demo1234!" },
        ],
        codigosClase: ["MATE1A26", "CIEN1B26", "LENG2A26"],
        resumen: {
            usuarios: usuarios[0].total,
            clases: clases[0].total,
            inscripciones: inscripciones[0].total,
        },
    };
}

module.exports = {
    seedDemoData,
};
