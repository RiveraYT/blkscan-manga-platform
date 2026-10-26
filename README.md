# BLK SCAN - Plataforma Web de Manga

Plataforma web moderna, profesional, atractiva y completamente responsive para publicar, administrar y leer mangas por capítulos, con **Blue Lock** como manga inaugural.

Desarrollada con **Astro 5 (SSR)**, **TypeScript**, **Tailwind CSS**, **Drizzle ORM**, **Neon PostgreSQL** y arquitectura de almacenamiento compatible con **S3** (Cloudflare R2, AWS S3, MinIO) con fallback local.

---

## 🚀 Características Principales

### 🌐 Sitio Público
- **Identidad Artística Blue Lock**: Tema oscuro estético (negro azulado `#070a12`, acentos azul eléctrico `#00d2ff`, resplandores neón sutiles).
- **Banner Principal Destacado**: Presentación cinemática de *Blue Lock* con portada, descripción, géneros, estado y accesos directos.
- **Sección de Últimos Capítulos**: Tarjetas con fecha, portada y lectura directa.
- **Catálogo de Mangas Completo**: Búsqueda por título, filtros por género, filtros por estado de emisión, ordenación (fecha de actualización o alfabético) y paginación.
- **Ficha Técnica del Manga**: Sinopsis, autores, géneros, lista interactiva de capítulos con ordenación ascendente/descendente y buscador rápido de capítulos.
- **Mi Biblioteca**: Historial guardado localmente para continuar la lectura automáticamente en la última página visitada.

### 📖 Lector de Manga Profesional (4 Modos de Lectura)
- **Modo 1: Página Individual**: Navegación con flechas del teclado, indicador de página y slider rápido.
- **Modo 2: Páginas Dobles**: Dos páginas lado a lado en pantallas grandes, con adaptación automática a una página en dispositivos móviles.
- **Modo 3: Cascada Vertical Continua**: Modo Webtoon / scroll vertical infinito con carga progresiva de imágenes.
- **Modo 4: Ajuste Automático**: Adaptación inteligente a la altura o ancho de la pantalla sin distorsión de relación de aspecto.
- **Sentido de Lectura Configurable**: De derecha a izquierda (estilo Manga japonés original) o de izquierda a derecha.
- **Experiencia de Lectura Optimizada**: Ocultación de controles (tecla H o clic central), pantalla completa (tecla F), cambio de color de fondo (negro puro, azulado o gris carbón), detección y reintento de imágenes fallidas.

### 🔒 Panel Administrativo Privado (`/admin`)
- **Ruta Protegida por Sesión**: Cookies HTTP-Only firmadas con JWT y validación estricta de roles (`admin`, `editor`).
- **Dashboard en Tiempo Real**: Estadísticas de mangas totales, capítulos totales, publicados y borradores.
- **Gestión de Mangas**: Alta, edición, asignación de portada y géneros.
- **Gestión y Subida de Capítulos**:
  - Subida individual mediante arrastrar y soltar (Drag & Drop) con previsualización, reordenamiento de páginas y validación de tipos (JPEG, PNG, WebP).
  - **Importador desde archivo ZIP**: Extracción segura en memoria (JSZip), detección automática de páginas, ordenamiento natural numérico y confirmación visual antes de publicar.

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: [Astro 5](https://astro.build/) en modo SSR (`@astrojs/node`).
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/).
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) con paleta personalizada.
- **Base de Datos**: [Neon PostgreSQL](https://neon.tech/) Serverless.
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) + Drizzle Kit para migraciones.
- **Almacenamiento**: Patrón desacoplado compatible con S3 (`@aws-sdk/client-s3`) y fallback local transparente en `public/uploads`.
- **Componentes Interactivos**: [React 19](https://react.dev/) para el Lector de Manga y los gestores de subida / ZIP.
- **Iconos**: [Lucide React](https://lucide.dev/).

---

## 📦 Instalación y Puesta en Marcha Local

### 1. Clonar el repositorio y acceder
```bash
git clone <URL_DEL_REPOSITORIO>
cd "BLKSCAN APP"
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo de ejemplo `.env.example` a `.env`:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
```env
# URL de conexión de Neon PostgreSQL
DATABASE_URL="postgresql://usuario:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Secreto de sesión (mínimo 32 caracteres)
SESSION_SECRET="un_secreto_muy_seguro_de_32_caracteres_o_mas"

# Credenciales para el administrador inicial
ADMIN_NAME="Ego Jinpachi"
ADMIN_EMAIL="admin@blkscan.com"
ADMIN_PASSWORD="TuContraseñaSegura2026!"

# Tipo de almacenamiento: 'local' para desarrollo, 's3' para producción (Cloudflare R2 / AWS S3)
STORAGE_TYPE="local"
```

> **Nota importante:** Si no cuentas con credenciales de Neon de inmediato, el proyecto incluye un modo de fallback local para que puedas probar la interfaz y el lector sin bloqueos.

### 4. Empujar el esquema a Neon PostgreSQL y crear el Administrador
Cuando tengas tu `DATABASE_URL` configurada:
```bash
# Empuja las tablas a Neon
npm run db:push

# Ejecuta el seed para crear el primer administrador y Blue Lock con sus capítulos
npx tsx src/db/seed.ts
```

### 5. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:4321](http://localhost:4321).

---

## 🔐 Acceso al Panel Administrativo

1. Dirígete a [http://localhost:4321/admin/login](http://localhost:4321/admin/login).
2. Ingresa con las credenciales configuradas en tu seed (por defecto: `admin@blkscan.com` / `Egoist2026!` o las definidas en tu `.env`).
3. Desde el panel podrás:
   - Crear nuevos mangas.
   - Subir capítulos arrastrando imágenes.
   - Importar capítulos empaquetados en archivos `.zip`.

---

## 📁 Estructura del Proyecto

```
blkscan-app/
├── public/                 # Archivos estáticos y uploads locales
├── src/
│   ├── components/
│   │   ├── admin/          # Gestores de subida y ZIP (React Islands)
│   │   ├── catalog/        # MangaCard, ChapterCard
│   │   ├── common/         # Header, Footer, HeroBanner
│   │   ├── manga/          # ChapterList interactivo
│   │   └── reader/         # MangaReader con 4 modos de lectura
│   ├── db/
│   │   ├── index.ts        # Conexión Postgres / Neon con Drizzle
│   │   ├── schema.ts       # Esquema relacional tipado
│   │   └── seed.ts         # Script de administrador y Blue Lock inicial
│   ├── layouts/
│   │   ├── AdminLayout.astro   # Layout protegido del panel
│   │   └── PublicLayout.astro  # Layout oscuro para usuarios
│   ├── lib/
│   │   ├── auth.ts         # JWT, bcryptjs y sesiones
│   │   ├── storage/        # Adaptador S3 y Local
│   │   ├── services/       # Lógica de datos de Manga y Admin
│   │   └── utils.ts        # Slugs, formateo y utilidades
│   ├── pages/
│   │   ├── index.astro     # Inicio con Hero de Blue Lock
│   │   ├── mangas/         # Catálogo y fichas individuales
│   │   ├── leer/           # Lector interactivo por capítulo
│   │   ├── biblioteca.astro # Historial de lectura
│   │   ├── admin/          # Rutas del panel administrativo
│   │   ├── api/            # Endpoints REST (auth, upload, chapters)
│   │   ├── 404.astro       # Página de error personalizada
│   │   ├── robots.txt.ts   # SEO Robots
│   │   └── sitemap.xml.ts  # SEO Sitemap dinámico
│   └── styles/
│       └── global.css      # Estilos Tailwind y efectos neón
├── astro.config.mjs        # Configuración Astro SSR con Node
├── drizzle.config.ts       # Configuración Drizzle ORM
├── tailwind.config.mjs     # Configuración de diseño y paleta
└── package.json
```

---

## ☁️ Guía de Despliegue en Producción

### Despliegue en VPS / Servidor Node.js
1. Compilar el proyecto:
   ```bash
   npm run build
   ```
2. Ejecutar el servidor compilado:
   ```bash
   node ./dist/server/entry.mjs
   ```
3. O utilizar un gestor de procesos como PM2:
   ```bash
   pm2 start ./dist/server/entry.mjs --name "blkscan"
   ```

### Despliegue en Vercel o Render
- La aplicación cuenta con SSR activado. Para Vercel, puedes utilizar `@astrojs/vercel` o el adaptador standalone de Node en Render/Railway.
