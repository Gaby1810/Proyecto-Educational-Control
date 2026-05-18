require("dotenv").config();

const { seedDemoData } = require("./demo-data");

(async () => {
    try {
        const result = await seedDemoData();
        console.log("Demo creada o actualizada correctamente.");
        console.log("Docente demo:", result.docente.correo, "/", result.docente.password);
        console.log("Codigos de clase:", result.codigosClase.join(", "));
        console.log("Usuarios totales:", result.resumen.usuarios);
        console.log("Clases totales:", result.resumen.clases);
        console.log("Inscripciones totales:", result.resumen.inscripciones);
    } catch (error) {
        console.error("No se pudo preparar la demo:", error.message);
        process.exitCode = 1;
    }
})();
