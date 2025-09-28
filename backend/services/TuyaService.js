import axios from 'axios';
import crypto from 'crypto-js';

/**
 * Service moderne pour l'API Tuya IoT
 * Utilise les dernières fonctionnalités ES6+ et les meilleures pratiques
 */
export default class TuyaService {
  // Propriétés de classe privées (syntaxe moderne)
  #cachedToken = null;
  #tokenExpiry = 0;
  
  // Cache intelligent d'état du device
  #deviceStateCache = null;
  #stateCacheExpiry = 0;
  #lastRequestTime = 0;
  
  // Constantes de classe
  static DATA_CENTERS = {
    US: 'https://openapi.tuyaus.com',
    EU: 'https://openapi.tuyaeu.com', 
    CN: 'https://openapi.tuyacn.com',
    IN: 'https://openapi.tuyain.com'
  };
  
  static TOKEN_REFRESH_BUFFER = 600; // 10 minutes en secondes
  static STATE_CACHE_DURATION = 30; // 30 secondes de cache d'état
  static MIN_REQUEST_INTERVAL = 500; // 500ms minimum entre requêtes (debouncing)
  
  constructor() {
    this.ACCESS_ID = process.env.TUYA_ACCESS_ID;
    this.ACCESS_SECRET = process.env.TUYA_ACCESS_SECRET;
    this.DEVICE_ID = process.env.TUYA_DEVICE_ID;
    this.BASE_URL = process.env.TUYA_DATA_CENTER || 'https://openapi.tuyaeu.com';
    
    // Validation de la configuration au démarrage
    this.#validateConfig();
  }

  /**
   * Valide que toutes les variables d'environnement sont présentes
   * @private
   */
  #validateConfig() {
    const requiredVars = ['TUYA_ACCESS_ID', 'TUYA_ACCESS_SECRET', 'TUYA_DEVICE_ID'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Obtenir un token d'accès valide (avec cache)
   */
  async getAccessToken() {
    // Vérifier si nous avons un token valide en cache
    if (this.#cachedToken && Date.now() < this.#tokenExpiry) {
      return this.#cachedToken;
    }

    try {
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      
      // Construire la signature pour l'obtention du token
      const stringToSign = `GET\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n\n/v1.0/token?grant_type=1`;
      const signStr = this.ACCESS_ID + timestamp + nonce + stringToSign;
      const signature = crypto.HmacSHA256(signStr, this.ACCESS_SECRET).toString().toUpperCase();

      const headers = {
        'client_id': this.ACCESS_ID,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp.toString(),
        'nonce': nonce,
        'Content-Type': 'application/json'
      };

      console.log('🔑 Getting access token...');
      const response = await axios.get(`${this.BASE_URL}/v1.0/token?grant_type=1`, { headers });
      
      if (response.data.success) {
        this.#cachedToken = response.data.result.access_token;
        // Le token expire dans 7200 secondes (2 heures), on le renouvelle 10 minutes avant
        this.#tokenExpiry = Date.now() + ((response.data.result.expire_time - 600) * 1000);
        console.log('✅ Access token obtained successfully');
        return this.#cachedToken;
      } else {
        throw new Error(`Failed to get access token: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('❌ Failed to get access token:', error.response?.data || error.message);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Générer une signature Tuya avec token d'accès
   */
  async generateSignature(method, url, headers = {}, body = '') {
    const token = await this.getAccessToken();
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Construction de la chaîne à signer
    const contentHash = crypto.SHA256(body).toString();
    const stringToSign = [
      method.toUpperCase(),
      contentHash,
      '',
      url.replace(this.BASE_URL, '')
    ].join('\n');
    
    const signStr = this.ACCESS_ID + token + timestamp + nonce + stringToSign;
    const signature = crypto.HmacSHA256(signStr, this.ACCESS_SECRET).toString().toUpperCase();
    
    return {
      'client_id': this.ACCESS_ID,
      'access_token': token,
      'sign': signature,
      'sign_method': 'HMAC-SHA256',
      't': timestamp.toString(),
      'nonce': nonce,
      'Content-Type': 'application/json',
      ...headers
    };
  }

  /**
   * Effectuer une requête à l'API Tuya
   */
  async request(method, endpoint, data = null) {
    try {
      const url = `${this.BASE_URL}${endpoint}`;
      const body = data ? JSON.stringify(data) : '';
      const headers = await this.generateSignature(method, endpoint, {}, body);

      console.log(`🌐 Making ${method} request to: ${endpoint}`);
      console.log('📋 Headers:', headers);

      const config = {
        method: method.toLowerCase(),
        url: url,
        headers: headers,
        ...(data && { data: data })
      };

      const response = await axios(config);
      console.log('📨 Tuya API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Tuya API Error:', error.response?.data || error.message);
      throw new Error(`Tuya API Error: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Obtenir le statut de l'appareil avec cache intelligent
   */
  async getDeviceStatus(forceRefresh = false) {
    const now = Date.now();
    
    // Utiliser le cache si valide et pas de rafraîchissement forcé
    if (!forceRefresh && this.#deviceStateCache && now < this.#stateCacheExpiry) {
      console.log('📋 Using cached device state');
      return this.#deviceStateCache;
    }
    
    console.log('🔄 Refreshing device state from API');
    const result = await this.request('GET', `/v1.0/devices/${this.DEVICE_ID}/status`);
    const deviceState = result.result || [];
    
    // Mettre à jour le cache
    this.#deviceStateCache = deviceState;
    this.#stateCacheExpiry = now + (TuyaService.STATE_CACHE_DURATION * 1000);
    
    return deviceState;
  }

  /**
   * Vérifier si une commande changerait l'état actuel
   */
  async #isCommandNecessary(commands) {
    try {
      const currentState = await this.getDeviceStatus();
      const stateMap = new Map(currentState.map(item => [item.code, item.value]));
      
      for (const command of commands) {
        const currentValue = stateMap.get(command.code);
        
        // Cas spéciaux de comparaison
        if (command.code === 'colour_data') {
          const currentColor = typeof currentValue === 'string' ? JSON.parse(currentValue) : currentValue;
          const newColor = typeof command.value === 'string' ? JSON.parse(command.value) : command.value;
          
          if (JSON.stringify(currentColor) !== JSON.stringify(newColor)) {
            return true; // Changement nécessaire
          }
        } else if (currentValue !== command.value) {
          return true; // Changement nécessaire
        }
      }
      
      console.log('⏭️ Command skipped - device already in requested state');
      return false; // Aucun changement nécessaire
    } catch (error) {
      console.log('⚠️ Could not verify current state, sending command anyway');
      return true; // En cas d'erreur, envoyer quand même
    }
  }
  
  /**
   * Envoyer des commandes à l'appareil avec optimisations
   */
  async sendCommands(commands, options = {}) {
    const { skipOptimization = false, debounce = true } = options;
    const now = Date.now();
    
    // Debouncing - éviter les requêtes trop fréquentes
    if (debounce && (now - this.#lastRequestTime) < TuyaService.MIN_REQUEST_INTERVAL) {
      const waitTime = TuyaService.MIN_REQUEST_INTERVAL - (now - this.#lastRequestTime);
      console.log(`⏳ Debouncing request, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Vérifier si la commande est nécessaire (sauf si explicitement désactivé)
    if (!skipOptimization && !(await this.#isCommandNecessary(commands))) {
      // Retourner un succès simulé si aucun changement n'est nécessaire
      return {
        success: true,
        result: true,
        optimized: true,
        message: 'No changes needed - device already in requested state'
      };
    }
    
    const data = { commands };
    console.log('🚀 Sending commands:', data);
    
    this.#lastRequestTime = Date.now();
    const result = await this.request('POST', `/v1.0/devices/${this.DEVICE_ID}/commands`, data);
    
    // Invalider le cache après un changement d'état
    this.#deviceStateCache = null;
    this.#stateCacheExpiry = 0;
    
    return result;
  }

  /**
   * Obtenir les informations de l'appareil
   */
  async getDeviceInfo() {
    const result = await this.request('GET', `/v1.0/devices/${this.DEVICE_ID}`);
    return result;
  }

  /**
   * Vérifier que la configuration est valide
   */
  isConfigured() {
    return !!(this.ACCESS_ID && this.ACCESS_SECRET && this.DEVICE_ID);
  }

  /**
   * Obtenir la valeur actuelle d'un attribut spécifique
   */
  async getCurrentValue(attributeCode) {
    const state = await this.getDeviceStatus();
    const attribute = state.find(item => item.code === attributeCode);
    return attribute ? attribute.value : null;
  }
  
  /**
   * Vérifier si l'appareil est en mode blanc
   */
  async isInWhiteMode() {
    const workMode = await this.getCurrentValue('work_mode');
    return workMode === 'white';
  }
  
  /**
   * Vérifier si l'appareil est allumé
   */
  async isLightOn() {
    const switchState = await this.getCurrentValue('switch_led');
    return switchState === true;
  }
  
  /**
   * Obtenir la luminosité actuelle
   */
  async getCurrentBrightness() {
    return await this.getCurrentValue('bright_value');
  }
  
  /**
   * Obtenir les informations de configuration (pour debug)
   */
  getConfig() {
    return {
      device_id: this.DEVICE_ID,
      base_url: this.BASE_URL,
      configured: this.isConfigured(),
      cache_active: this.#deviceStateCache !== null,
      cache_expires: new Date(this.#stateCacheExpiry).toISOString()
    };
  }
  
  /**
   * Vider le cache d'état (utile pour debug)
   */
  clearStateCache() {
    this.#deviceStateCache = null;
    this.#stateCacheExpiry = 0;
    console.log('🧹 Device state cache cleared');
  }
}