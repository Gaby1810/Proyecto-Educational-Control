# Diagrama de Base de Datos

Este proyecto usa MySQL 8 con una base llamada `educational_control`.

## Diagrama ER

```mermaid
erDiagram
    usuarios {
        int id PK
        varchar nombre
        varchar correo UK
        varchar password
        enum rol
        varchar dui
        enum tipo_bachillerato
        enum anio
        varchar telefono
        timestamp created_at
        timestamp updated_at
    }

    login_intentos {
        varchar correo PK
        int intentos_fallidos
        datetime bloqueado_hasta
        timestamp ultimo_intento
    }

    materias {
        int id PK
        varchar nombre UK
    }

    docente_materias {
        int id PK
        int docente_id FK
        int materia_id FK
        varchar grado
        varchar seccion
        varchar codigo_clase UK
        timestamp created_at
    }

    estudiante_materias {
        int id PK
        int estudiante_id FK
        int docente_materia_id FK
        timestamp created_at
    }

    materiales {
        int id PK
        int docente_materia_id FK
        varchar titulo
        text descripcion
        varchar archivo
        varchar tipo
        timestamp fecha_subida
    }

    tareas {
        int id PK
        int docente_materia_id FK
        varchar titulo
        text descripcion
        varchar archivo
        varchar tipo
        timestamp fecha_subida
        datetime fecha_entrega
        decimal valor
    }

    entregas_tareas {
        int id PK
        int tarea_id FK
        int estudiante_id FK
        varchar archivo
        text comentario
        timestamp fecha_entrega
        decimal nota
        enum estado
    }

    asistencia {
        int id PK
        int docente_materia_id FK
        int estudiante_id FK
        date fecha
        boolean presente
        timestamp created_at
    }

    usuarios ||--o{ docente_materias : "imparte"
    materias ||--o{ docente_materias : "define"
    usuarios ||--o{ estudiante_materias : "se_inscribe"
    docente_materias ||--o{ estudiante_materias : "admite"
    docente_materias ||--o{ materiales : "publica"
    docente_materias ||--o{ tareas : "asigna"
    tareas ||--o{ entregas_tareas : "recibe"
    usuarios ||--o{ entregas_tareas : "entrega"
    docente_materias ||--o{ asistencia : "registra"
    usuarios ||--o{ asistencia : "marca"
}
```

## Cómo verla en AWS

Hay dos escenarios comunes:

### 1. La base está en Amazon RDS

1. Abre la consola de AWS.
2. Ve a `RDS` -> `Databases`.
3. Selecciona tu instancia o clúster.
4. Revisa:
   - `Endpoint`
   - `Port`
   - `VPC / Security Groups`
5. Conéctate con un cliente MySQL como MySQL Workbench, DBeaver o con CLI:

```bash
mysql -h TU_ENDPOINT_RDS -P 3306 -u TU_USUARIO -p
```

6. Ya dentro:

```sql
USE educational_control;
SHOW TABLES;
DESCRIBE usuarios;
```

### 2. La base corre dentro de la misma EC2

1. Entra por SSH o EC2 Instance Connect.
2. Abre MySQL:

```bash
mysql -u TU_USUARIO -p
```

3. Luego:

```sql
USE educational_control;
SHOW TABLES;
```

## Consultas útiles para revisar el modelo desde AWS

```sql
USE educational_control;

SHOW TABLES;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'educational_control'
ORDER BY table_name;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_key
FROM information_schema.columns
WHERE table_schema = 'educational_control'
ORDER BY table_name, ordinal_position;
```

## Nota de compatibilidad

En el código se mantiene el identificador técnico `anio` por compatibilidad con la base y las rutas existentes, pero todo lo visible al usuario se muestra como `año`.
