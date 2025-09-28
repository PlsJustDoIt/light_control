// Types pour l'interface de contrôle de la lumière Tuya

export interface LightState {
  switch_led: boolean; // On/Off
  bright_value: number; // Luminosité (1-100% dans l'interface, converti en 1-255 pour Tuya)
  colour_data?: {
    h: number; // Hue (0-360)
    s: number; // Saturation (0-255)
    v: number; // Value/Brightness (0-255)
  };
  work_mode: 'colour' | 'white'; // Mode couleur ou blanc
}

export interface ApiResponse<T> {
  success: boolean;
  result: T;
  t: number;
  tid: string;
}

export interface DeviceStatus {
  code: string;
  value: string | number | boolean | object;
}