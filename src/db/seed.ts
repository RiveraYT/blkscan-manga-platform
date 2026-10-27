import * as dotenv from 'dotenv';
import { getDb } from './index';
import { users, mangas, chapters, chapterPages } from './schema';
import { hashPassword } from '../lib/auth';
import { eq } from 'drizzle-orm';

dotenv.config();

async function runSeed() {
  console.log('🌱 [BLK SCAN SEED] Iniciando inicialización de datos...');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('usuario:password') || dbUrl.includes('ep-xyz')) {
    console.error('\n❌ ERROR: DATABASE_URL contiene valores de ejemplo ficticios ("usuario:password" o "ep-xyz").');
    console.error('👉 Para conectar con tu base de datos Neon:');
    console.error('   1. Abre tu archivo .env');
    console.error('   2. Reemplaza la línea DATABASE_URL con tu connection string real obtenido de https://console.neon.tech');
    console.error('   3. Vuelve a ejecutar: npm run db:push && npx tsx src/db/seed.ts\n');
    console.error('ℹ️ Si solo deseas probar la plataforma en local sin configurar Neon todavía, ejecuta directamente:');
    console.error('   npm run dev\n');
    process.exit(1);
  }

  try {
    const db = getDb();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@blkscan.com';
    const adminName = process.env.ADMIN_NAME || 'Ego Jinpachi';
    const adminPass = process.env.ADMIN_PASSWORD || 'Egoist2026!';

    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });

    let adminId: string;

    if (!existingAdmin) {
      console.log(`👤 Creando usuario administrador: ${adminEmail}...`);
      const passwordHash = await hashPassword(adminPass);
      const [newAdmin] = await db.insert(users).values({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin',
      }).returning();
      adminId = newAdmin.id;
      console.log(`✅ Administrador creado con éxito (ID: ${adminId})`);
    } else {
      adminId = existingAdmin.id;
      console.log(`ℹ️ Administrador ya existe: ${adminEmail} (ID: ${adminId})`);
    }

    // 2. Crear Manga Inicial: Blue Lock
    const blueLockSlug = 'blue-lock';
    const existingManga = await db.query.mangas.findFirst({
      where: eq(mangas.slug, blueLockSlug),
    });

    let mangaId: string;

    if (!existingManga) {
      console.log('⚽ Registrando manga oficial Blue Lock...');
      const [newManga] = await db.insert(mangas).values({
        slug: blueLockSlug,
        title: 'Blue Lock',
        alternativeTitles: 'ブルーロック, Blue Lock: Egoist Striker',
        synopsis: 'Tras la eliminación de Japón en el Mundial de 2018, la Unión de Fútbol de Japón contrata al excéntrico y enigmático entrenador Ego Jinpachi con un único objetivo: ganar la Copa del Mundo. Para ello nace Blue Lock, una revolucionaria y despiadada prisión de máxima seguridad donde 300 de los mejores delanteros de secundaria competirán a muerte. Solo aquel que despierte su egoísmo más puro se convertirá en el delantero estrella de Japón, destruyendo los sueños de los otros 299 rivales.',
        author: 'Muneyuki Kaneshiro',
        artist: 'Yusuke Nomura',
        genres: 'Deportes, Shonen, Psicológico, Acción, Drama',
        coverImageKey: 'mangas/blue-lock/blue-lock-cover.jpg',
        coverImageUrl: '/images/blue-lock-cover.jpg',
        status: 'publishing',
        featured: true,
        orderIndex: 1,
      }).returning();
      mangaId = newManga.id;
      console.log(`✅ Manga oficial Blue Lock registrado correctamente (ID: ${mangaId}) listo para recibir capítulos.`);
    } else {
      console.log('ℹ️ Blue Lock ya se encuentra registrado en la base de datos.');
    }

    console.log('🎉 [SEED COMPLETADO CON ÉXITO]');
    console.log(`   Admin: ${adminEmail}`);
    console.log(`   Clave: ${adminPass}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la ejecución del seed:', error);
    process.exit(1);
  }
}

runSeed();
