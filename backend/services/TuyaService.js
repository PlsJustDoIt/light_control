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
  
  // Constantes de classe
  static DATA_CENTERS = {
    US: 'https://openapi.tuyaus.com',
    EU: 'https://openapi.tuyaeu.com', 
    CN: 'https://openapi.tuyacn.com',
    IN: 'https://openapi.tuyain.com'
  };
  
  static TOKEN_REFRESH_BUFFER = 600; // 10 minutes en secondes
  
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
   * Obtenir le statut de l'appareil
   */
  async getDeviceStatus() {
    const result = await this.request('GET', `/v1.0/devices/${this.DEVICE_ID}/status`);
    return result.result || [];
  }

  /**
   * Envoyer des commandes à l'appareil
   */
  async sendCommands(commands) {
    const data = { commands };
    console.log('🚀 Sending commands:', data);
    const result = await this.request('POST', `/v1.0/devices/${this.DEVICE_ID}/commands`, data);
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
   * Obtenir les informations de configuration (pour debug)
   */
  getConfig() {
    return {
      device_id: this.DEVICE_ID,
      base_url: this.BASE_URL,
      configured: this.isConfigured()
    };
  }
}