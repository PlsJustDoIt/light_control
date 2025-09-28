import express from 'express';
import LightController from '../controllers/LightController.js';

const router = express.Router();
const lightController = new LightController();

// Bind des méthodes pour préserver le contexte 'this'
const bindController = (controller, method) => {
  return controller[method].bind(controller);
};

// Routes pour le contrôle de la lumière
router.get('/status', bindController(lightController, 'getStatus'));
router.post('/toggle', bindController(lightController, 'toggle'));
router.post('/brightness', bindController(lightController, 'setBrightness'));
router.post('/color', bindController(lightController, 'setColor'));
router.post('/white', bindController(lightController, 'setWhiteMode'));

// Route pour les informations de l'appareil
router.get('/device/info', bindController(lightController, 'getDeviceInfo'));

export default router;