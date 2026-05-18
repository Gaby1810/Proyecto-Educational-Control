// =====================================
// EDUCATIONAL CONTROL - SERVIDOR PRINCIPAL
// =====================================
require("dotenv").config();

const express      = require("express");
const session      = require("express-session");
const path         = require("path");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");

const app = express();

const required = ["SESSION_SECRET", "DB_HOST", "DB_USER", "DB_NAME"];
for (const key of required) {
    if (!process.env[key]) {
        console.warn("Variable de entorno faltante:", key, "(revisa tu .env)");
    }
}

const isProd = process.env.NODE_ENV === "production";
const forceHttps = process.env.FORCE_HTTPS === "true";
const trustProxy = Number(process.env.TRUST_PROXY || 1);
const sameSite = (process.env.SESSION_COOKIE_SAMESITE || "lax").toLowerCase();

function resolveSessionCookieSecure(value) {
    const normalized = String(value || "auto").toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return "auto";
}

const sessionCookieSecure = resolveSessionCookieSecure(process.env.SESSION_COOKIE_SECURE);

// Seguridad - headers HTTP
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return cb(null, true);
        }
        return cb(new Error("Origen no permitido por CORS: " + origin));
    },
    credentials: true,
}));

// Parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.set("trust proxy", trustProxy);

if (forceHttps) {
    app.use((req, res, next) => {
        if (req.secure || req.get("x-forwarded-proto") === "https") {
            return next();
        }
        return res.redirect(301, "https://" + req.headers.host + req.originalUrl);
    });
}

// Rate limit
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/", apiLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", loginLimiter);

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || "fallback-cambia-este-secreto",
    resave: false,
    saveUninitialized: false,
    name: "edu.sid",
    proxy: isProd,
    cookie: {
        maxAge: 1000 * 60 * 60 * 4,
        httpOnly: true,
        secure: sessionCookieSecure,
        sameSite,
    },
}));

// Estáticos
app.use(express.static(path.join(__dirname, "public")));

// Uploads solo con sesión
app.use("/uploads", (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(401).send("No autorizado");
    }
    next();
}, express.static(path.join(__dirname, "uploads")));

// Rutas API
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/docente",    require("./routes/docente"));
app.use("/api/materiales", require("./routes/materiales"));
app.use("/api/tareas",     require("./routes/tareas"));
app.use("/api/asistencia", require("./routes/asistencia"));
app.use("/api/admin",      require("./routes/admin"));
app.use("/estudiante",     require("./routes/estudiante"));

app.get("/", (req, res) => res.redirect("/login.html"));
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
    console.error("Error no controlado:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
});

app.use((req, res) => res.status(404).json({ message: "Recurso no encontrado" }));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
    console.log("Servidor Educational Control en http://localhost:" + PORT);
    console.log("Entorno:", process.env.NODE_ENV || "development");
    console.log("Trust proxy:", trustProxy);
    console.log("Session cookie secure:", sessionCookieSecure);
});
