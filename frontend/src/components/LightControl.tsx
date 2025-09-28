import React, { useState, useEffect } from 'react';
import type { DeviceStatus } from '../types/light';
import lightService from '../services/lightService';
import './LightControl.css';

interface LightControlProps {}

const LightControl: React.FC<LightControlProps> = () => {
  const [isOn, setIsOn] = useState(false);
  const [brightness, setBrightness] = useState(50);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(255);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'colour' | 'white'>('white');

  // Récupérer l'état initial de la lumière
  useEffect(() => {
    const fetchLightStatus = async () => {
      try {
        setIsLoading(true);
        const status = await lightService.getLightStatus();
        
                {/* Luminosité (conversion automatique 1-100% -> 25-255 Tuya) */}
        status.forEach((item: DeviceStatus) => {
          switch (item.code) {
            case 'switch_led':
              setIsOn(Boolean(item.value));
              break;
            case 'bright_value':
              // Convertir de 10-255 vers 1-100
              const tuyaValue = Number(item.value);
              const percentage = Math.max(1, Math.round(1 + ((Math.max(10, tuyaValue) - 10) / 245) * 99));
              setBrightness(percentage);
              break;
            case 'work_mode':
              setMode(item.value as 'colour' | 'white');
              break;
            case 'colour_data':
              if (typeof item.value === 'string') {
                try {
                  const colorData = JSON.parse(item.value) as { h: number; s: number; v: number };
                  setHue(colorData.h);
                  setSaturation(colorData.s);
                } catch (e) {
                  console.error('Error parsing colour_data:', e);
                }
              }
              break;
          }
        });
        setError(null);
      } catch (err) {
        setError('Erreur lors de la récupération de l\'état de la lumière');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLightStatus();
  }, []);

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      await lightService.toggleLight(!isOn);
      setIsOn(!isOn);
      setError(null);
    } catch (err) {
      setError('Erreur lors du changement d\'état');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrightnessChange = async (newBrightness: number) => {
    try {
      setBrightness(newBrightness);
      const tuyaValue = Math.max(10, Math.round(10 + ((newBrightness - 1) / 99) * 245));
      console.log(`Setting brightness to ${newBrightness}% (will be converted to ${tuyaValue} for Tuya)`);
      await lightService.setBrightness(newBrightness);
      setError(null);
    } catch (err) {
      setError('Erreur lors du changement de luminosité');
      console.error('Brightness change error:', err);
    }
  };

  const handleColorChange = async (newHue: number, newSaturation?: number) => {
    try {
      const satValue = newSaturation !== undefined ? newSaturation : saturation;
      setHue(newHue);
      if (newSaturation !== undefined) setSaturation(newSaturation);
      
      console.log('Setting color:', { h: newHue, s: satValue, v: brightness });
      await lightService.setColor(newHue, satValue, brightness);
      setMode('colour');
      setError(null);
    } catch (err) {
      setError('Erreur lors du changement de couleur');
      console.error('Color change error:', err);
    }
  };

  const handleWhiteMode = async () => {
    try {
      await lightService.setWhiteMode();
      setMode('white');
      setError(null);
    } catch (err) {
      setError('Erreur lors du passage en mode blanc');
      console.error(err);
    }
  };

  const getHslColor = () => {
    return `hsl(${hue}, ${(saturation / 255) * 100}%, 50%)`;
  };

  return (
    <div className="light-control">
      <h1>🔆 Contrôle Lumière Connectée</h1>
      
      {error && <div className="error">{error}</div>}
      
      <div className="control-section">
        <h2>État</h2>
        <button 
          className={`toggle-button ${isOn ? 'on' : 'off'}`}
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? 'Chargement...' : isOn ? '💡 Allumée' : '🌙 Éteinte'}
        </button>
      </div>

      {isOn && (
        <>
          <div className="control-section">
            <h2>Luminosité</h2>
            <input
              type="range"
              min="1"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="brightness-slider"
              disabled={isLoading}
            />
            <span className="value-display">{brightness}%</span>
          </div>

          <div className="control-section">
            <h2>Mode</h2>
            <div className="mode-buttons">
              <button 
                className={mode === 'white' ? 'active' : ''}
                onClick={handleWhiteMode}
                disabled={isLoading}
              >
                ⚪ Blanc
              </button>
              <button 
                className={mode === 'colour' ? 'active' : ''}
                onClick={() => handleColorChange(hue)}
                disabled={isLoading}
              >
                🌈 Couleur
              </button>
            </div>
          </div>

          {mode === 'colour' && (
            <div className="control-section">
              <h2>Couleur</h2>
              <div className="color-controls">
                <div className="color-preview" style={{ backgroundColor: getHslColor() }}></div>
                <div className="color-sliders">
                  <label>
                    Teinte:
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hue}
                      onChange={(e) => handleColorChange(Number(e.target.value))}
                      className="hue-slider"
                      disabled={isLoading}
                    />
                    <span className="value-display">{hue}°</span>
                  </label>
                  <label>
                    Saturation:
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={saturation}
                      onChange={(e) => handleColorChange(hue, Number(e.target.value))}
                      className="saturation-slider"
                      disabled={isLoading}
                    />
                    <span className="value-display">{Math.round((saturation / 255) * 100)}%</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LightControl;