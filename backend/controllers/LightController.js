import TuyaService from '../services/TuyaService.js';

/**
 * Contrôleur moderne pour les opérations de lumière connectée
 * Utilise async/await et les meilleures pratiques ES6+
 */
export default class LightController {
  // Propriété privée pour le service Tuya
  #tuyaService;

  constructor() {
    this.#tuyaService = new TuyaService();
  }

  /**
   * Méthode utilitaire pour la gestion d'erreurs
   */
  #handleError = (error, res, operation) => {
    const errorMessage = error?.message || 'Unknown error occurred';
    console.error(`❌ Error during ${operation}:`, errorMessage);
    
    return res.status(error?.status || 500).json({
      success: false,
      error: errorMessage,
      operation
    });
  };

  /**
   * Obtenir le statut de la lumière
   */
  async getStatus(req, res) {
    try {
      if (!this.#tuyaService.isConfigured()) {
        return res.status(500).json({
          success: false,
          error: 'Tuya credentials not configured'
        });
      }

      const result = await this.#tuyaService.getDeviceStatus();
      res.json(result);
    } catch (error) {
      return this.#handleError(error, res, 'status retrieval');
    }
  }

  /**
   * Allumer/éteindre la lumière
   */
  async toggle(req, res) {
    try {
      const { switch_led } = req.body;
      
      if (typeof switch_led !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'switch_led must be a boolean'
        });
      }

      const commands = [{
        code: 'switch_led',
        value: switch_led
      }];

      // Vérification intelligente : même état ?
      const currentState = await this.#tuyaService.isLightOn();
      if (currentState === switch_led) {
        const action = switch_led ? 'on' : 'off';
        return res.json({
          success: true,
          result: true,
          optimized: true,
          message: `Device is already ${action}`
        });
      }
      
      const result = await this.#tuyaService.sendCommands(commands);
      res.json(result);
    } catch (error) {
      return this.#handleError(error, res, 'light toggle');
    }
  }

  /**
   * Changer la luminosité
   */
  async setBrightness(req, res) {
    try {
      const { bright_value } = req.body;
      
      if (typeof bright_value !== 'number' || bright_value < 25 || bright_value > 255) {
        return res.status(400).json({
          success: false,
          error: 'bright_value must be a number between 25 and 255 (according to Tuya documentation)'
        });
      }

      const commands = [{
        code: 'bright_value',
        value: bright_value
      }];

      // Vérification intelligente : même luminosité ?
      const currentBrightness = await this.#tuyaService.getCurrentBrightness();
      if (currentBrightness === bright_value) {
        return res.json({
          success: true,
          result: true,
          optimized: true,
          message: `Device brightness is already set to ${bright_value}`
        });
      }
      
      const result = await this.#tuyaService.sendCommands(commands);
      res.json(result);
    } catch (error) {
      return this.#handleError(error, res, 'brightness setting');
    }
  }

  /**
   * Changer la couleur
   */
  async setColor(req, res) {
    try {
      const { hue, saturation, brightness } = req.body;
      
      // Validation des paramètres
      if (typeof hue !== 'number' || hue < 0 || hue > 360) {
        return res.status(400).json({
          success: false,
          error: 'Hue must be a number between 0 and 360'
        });
      }
      
      if (typeof saturation !== 'number' || saturation < 0 || saturation > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Saturation must be a number between 0 and 1000'
        });
      }
      
      if (typeof brightness !== 'number' || brightness < 0 || brightness > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Brightness must be a number between 0 and 1000'
        });
      }

      // Format JSON pour Tuya
      const colorData = {
        h: hue,
        s: saturation,
        v: brightness
      };

      const commands = [{
        code: 'colour_data',
        value: JSON.stringify(colorData)
      }];

      const result = await this.#tuyaService.sendCommands(commands);
      res.json(result);
    } catch (error) {
      return this.#handleError(error, res, 'color setting');
    }
  }

  /**
   * Passer en mode blanc (avec validation intelligente)
   */
  async setWhiteMode(req, res) {
    try {
      // Vérification intelligente : déjà en mode blanc ?
      if (await this.#tuyaService.isInWhiteMode()) {
        return res.json({
          success: true,
          result: true,
          optimized: true,
          message: 'Device is already in white mode'
        });
      }
      
      const commands = [{
        code: 'work_mode',
        value: 'white'
      }];

      const result = await this.#tuyaService.sendCommands(commands);
      res.json(result);
    } catch (error) {
      return this.#handleError(error, res, 'white mode setting');
    }
  }

  /**
   * Obtenir les informations de l'appareil
   */
  async getDeviceInfo(req, res) {
    try {
      const result = await this.#tuyaService.getDeviceInfo();
      res.json(result);
    } catch (error) {
      return this.#handleError(error, res, 'device info retrieval');
    }
  }

  /**
   * Vider le cache (utile pour debug et tests)
   */
  clearCache() {
    this.#tuyaService.clearStateCache();
    return { success: true, message: 'Cache cleared successfully' };
  }

  /**
   * Obtenir la configuration du service (pour debug)
   */
  getServiceConfig() {
    return this.#tuyaService.getConfig();
  }
}