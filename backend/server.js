import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import des modules locaux
import lightRoutes from './routes/lightRoutes.js';
import TuyaService from './services/TuyaService.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/index.js';

const app = express();
const port = process.env.PORT || 3001;

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Instancier le service Tuya pour les infos
const tuyaService = new TuyaService();

// Route de test / health check
app.get('/', (req, res) => {
  res.json({
    message: 'Tuya Light Control Backend',
    status: 'running',
    version: '2.0.0',
    ...tuyaService.getConfig()
  });
});

// Routes API
app.use('/api/light', lightRoutes);
app.use('/api/device', lightRoutes);

// Middlewares de fin de chaîne
app.use(notFoundHandler);
app.use(errorHandler);

// Démarrage du serveur
app.listen(port, () => {
  console.log(`🚀 Tuya Light Control Backend v2.0`);
  console.log(`✅ Server listening at http://localhost:${port}`);
  console.log(`🔧 Device ID: ${tuyaService.getConfig().device_id}`);
  console.log(`🌍 Data Center: ${tuyaService.getConfig().base_url}`);
  console.log(`⚙️  Configuration: ${tuyaService.isConfigured() ? '✅ Complete' : '❌ Missing credentials'}`);
});
