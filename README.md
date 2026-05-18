# Educational Control

Plataforma moderna de gestion educativa para instituciones de bachillerato en El Salvador.
Permite a estudiantes, docentes y administradores gestionar clases, materiales, tareas,
entregas, calificaciones y asistencia en una sola plataforma web.

## Stack tecnologico

- **Backend:** Node.js + Express 4
- **Base de datos:** MySQL 8 (mysql2)
- **Frontend:** HTML5 + CSS3 + JavaScript vanilla
- **Seguridad:** Helmet, express-rate-limit, bcryptjs, express-session
- **Despliegue:** AWS EC2 + RDS (recomendado) o Elastic Beanstalk

## Estructura del proyecto

```
educational-control/
├── server.js                  Punto de entrada del servidor
├── db.js                      Pool de conexiones a MySQL
├── package.json               Dependencias
├── .env / .env.example        Variables de entorno
│
├── middlewares/
│   ├── auth.js                requireAuth, requireRole
│   └── upload.js              Multer con limites de tamaño/tipo
│
├── routes/
│   ├── auth.js                login, register, logout, me, register-admin
│   ├── admin.js               dashboard, usuarios, clases, reportes
│   ├── docente.js             mis-clases, crear-clase, estudiantes
│   ├── estudiante.js          dashboard, unirse, mis-clases, entregar
│   ├── materiales.js          subir/listar materiales
│   ├── tareas.js              crear/listar tareas, entregas, calificar
│   └── asistencia.js          registrar/consultar asistencia
│
├── database/
│   ├── schema.sql             Schema completo con indices y restricciones
│   └── seed-admin.js          Script para crear el primer admin
│   └── seed-demo.js           Script para poblar docentes, estudiantes y clases demo
│
├── public/                    Frontend estatico
│   ├── css/theme.css          Sistema de diseño azul moderno
│   ├── login.html             Pantalla de inicio de sesion
│   ├── register.html          Registro de estudiantes y docentes
│   ├── admin/                 Paneles de administrador
│   ├── docente/               Paneles de docente
│   └── estudiante/            Paneles de estudiante
│
└── uploads/                   Archivos subidos (no se sube al repo)
```

## Requisitos

- Node.js 18 o superior
- MySQL 8 (o MariaDB equivalente)
- npm (incluido con Node.js)

## Instalacion local rapida

```bash
# 1. Clonar el repo
git clone https://github.com/Gaby1810/Proyecto-Educational-Control.git
cd Proyecto-Educational-Control

# 2. Instalar dependencias
npm install

# 3. Copiar y editar variables de entorno
cp .env.example .env
# Editar .env con tu contrasena de MySQL

# 4. Crear la base de datos
mysql -u root -p < database/schema.sql

# 5. Crear el primer admin
node database/seed-admin.js

# 6. Cargar datos demo opcionales
node database/seed-demo.js

# 7. Iniciar el servidor
npm start
```

Abrir el navegador en http://localhost:3000

## Credenciales de demo

- **Admin:** admin@demo.sv / Demo1234!
- **Docente:** docente.demo@demo.sv / Demo1234!
- **Estudiantes:** ana.lopez@demo.sv / Demo1234!, luis.martinez@demo.sv / Demo1234!, sofia.ramirez@demo.sv / Demo1234!

## Códigos de clase demo

- `MATE1A26`
- `CIEN1B26`
- `LENG2A26`

## Variables de entorno

Ver `.env.example` para la lista completa.

## Base de datos

El diagrama ER y las instrucciones para revisar la base desde AWS están en `docs/database-diagram.md`.

## Seguridad

- Contrasenas con bcrypt (12 rounds)
- Sesiones con cookie HttpOnly + SameSite
- Rate limiting en login y API
- Bloqueo temporal de acceso durante 15 minutos tras 3 intentos fallidos
- Helmet para headers HTTP
- Validacion de inputs y sanitizacion
- Prepared statements en todas las queries SQL
- Subida de archivos con limite de 10MB y validacion de tipo MIME
- Solo administradores pueden crear otros administradores
- El panel admin puede poblar datos demo desde la interfaz o con `node database/seed-demo.js`

## Licencia

ISC
