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
        coverImageKey: 'mangas/blue-lock/cover.webp',
        coverImageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop', // Imagen temática deportiva de alta calidad
        status: 'publishing',
        featured: true,
        orderIndex: 1,
      }).returning();
      mangaId = newManga.id;
      console.log(`✅ Blue Lock creado (ID: ${mangaId})`);

      // 3. Crear Capítulos de Demostración para Blue Lock
      console.log('📖 Registrando capítulos iniciales...');

      // Capítulo 1: Sueño (Publicado)
      const [chap1] = await db.insert(chapters).values({
        mangaId,
        chapterNumber: '1',
        title: 'Sueño',
        slug: 'capitulo-1',
        description: 'Yoichi Isagi duda sobre su filosofía de juego en equipo tras perder la final prefectural. Una extraña carta de invitación cambiará su vida para siempre.',
        status: 'published',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      }).returning();

      // Páginas demostrativas para capítulo 1
      const demoPagesChap1 = [
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop',
      ];

      for (let i = 0; i < demoPagesChap1.length; i++) {
        await db.insert(chapterPages).values({
          chapterId: chap1.id,
          pageNumber: i + 1,
          storageKey: `mangas/blue-lock/ch1/page-${i + 1}.webp`,
          imageUrl: demoPagesChap1[i],
          width: 1200,
          height: 1800,
        });
      }
      console.log(`✅ Capítulo 1 y sus ${demoPagesChap1.length} páginas registradas.`);

      // Capítulo 2: Monstruo (Publicado)
      const [chap2] = await db.insert(chapters).values({
        mangaId,
        chapterNumber: '2',
        title: 'Monstruo',
        slug: 'capitulo-2',
        description: 'La prueba de expulsión inicia dentro de la celda de la habitación Z: el juego de la mancha con balón.',
        status: 'published',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      }).returning();

      const demoPagesChap2 = [
        'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop',
      ];

      for (let i = 0; i < demoPagesChap2.length; i++) {
        await db.insert(chapterPages).values({
          chapterId: chap2.id,
          pageNumber: i + 1,
          storageKey: `mangas/blue-lock/ch2/page-${i + 1}.webp`,
          imageUrl: demoPagesChap2[i],
          width: 1200,
          height: 1800,
        });
      }
      console.log(`✅ Capítulo 2 y sus ${demoPagesChap2.length} páginas registradas.`);

      // Capítulo 3: Egoísta (Borrador - Solo visible para administradores)
      await db.insert(chapters).values({
        mangaId,
        chapterNumber: '3',
        title: 'El Despertar del Ego',
        slug: 'capitulo-3',
        description: 'Borrador en preparación para revisión de escaneo.',
        status: 'draft',
        publishedAt: new Date(),
      });
      console.log('✅ Capítulo 3 registrado como borrador (draft).');
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
