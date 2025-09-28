// Service pour communiquer avec le backend
import type { ApiResponse, DeviceStatus } from '../types/light';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class LightService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Récupérer l'état actuel de la lumière
  async getLightStatus(): Promise<DeviceStatus[]> {
    return this.request<DeviceStatus[]>('/api/light/status');
  }

  // Allumer/éteindre la lumière
  async toggleLight(isOn: boolean): Promise<ApiResponse<boolean>> {
    return this.request<ApiResponse<boolean>>('/api/light/toggle', {
      method: 'POST',
      body: JSON.stringify({ switch_led: isOn }),
    });
  }

  // Changer la luminosité
  async setBrightness(brightness: number): Promise<ApiResponse<boolean>> {
      // Convertir de 1-100% vers 25-255 (Tuya documentation officielle)
  const tuyaBrightness = Math.max(25, Math.round(((brightness / 100) * (255 - 25)) + 25));
    return this.request<ApiResponse<boolean>>('/api/light/brightness', {
      method: 'POST',
      body: JSON.stringify({ bright_value: tuyaBrightness }),
    });
  }

  // Changer la couleur
  async setColor(hue: number, saturation: number, value: number): Promise<ApiResponse<boolean>> {
    return this.request<ApiResponse<boolean>>('/api/light/color', {
      method: 'POST',
      body: JSON.stringify({
        hue: hue,
        saturation: saturation,
        brightness: value
      }),
    });
  }

  // Passer en mode blanc
  async setWhiteMode(): Promise<ApiResponse<boolean>> {
    return this.request<ApiResponse<boolean>>('/api/light/white', {
      method: 'POST',
      body: JSON.stringify({ work_mode: 'white' }),
    });
  }

  // Obtenir la configuration du device (pour debug)
  async getDeviceConfig(): Promise<any> {
    return this.request<any>('/api/light/device/config');
  }

  // Vider le cache (pour debug)
  async clearCache(): Promise<ApiResponse<boolean>> {
    return this.request<ApiResponse<boolean>>('/api/light/cache/clear', {
      method: 'POST',
    });
  }
}

export default new LightService();