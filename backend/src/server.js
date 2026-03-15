const app = require('./app');
const { initializeDatabase } = require('./db');

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  try {
    await initializeDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[backend] Server läuft auf http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('[backend] Fehler beim Start:', error);
    process.exit(1);
  }
}

bootstrap();


