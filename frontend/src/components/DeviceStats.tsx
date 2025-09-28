import React, { useState, useEffect } from 'react';
import lightService from '../services/lightService';

interface DeviceConfig {
  device_id: string;
  base_url: string;
  configured: boolean;
  cache_active: boolean;
  cache_expires: string;
}

interface DeviceStatus {
  code: string;
  value: any;
}

const DeviceStats: React.FC = () => {
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [status, setStatus] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await lightService.getDeviceConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const statusData = await lightService.getLightStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const clearCache = async () => {
    try {
      await lightService.clearCache();
      await loadConfig(); // Refresh config to see cache status
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  useEffect(() => {
    if (showStats) {
      loadConfig();
      loadStatus();
    }
  }, [showStats]);

  if (!showStats) {
    return (
      <div className="device-stats-toggle">
        <button
          onClick={() => setShowStats(true)}
          className="stats-toggle-btn"
          title="Show device statistics and optimizations"
        >
          📊 Stats
        </button>
      </div>
    );
  }

  return (
    <div className="device-stats">
      <div className="stats-header">
        <h3>🔧 Device Statistics & Optimizations</h3>
        <button 
          onClick={() => setShowStats(false)}
          className="close-btn"
        >
          ✕
        </button>
      </div>

      <div className="stats-content">
        <div className="config-section">
          <h4>📋 Configuration</h4>
          {loading ? (
            <p>Loading...</p>
          ) : config ? (
            <div className="config-grid">
              <div className="config-item">
                <span className="label">Device ID:</span>
                <span className="value">{config.device_id}</span>
              </div>
              <div className="config-item">
                <span className="label">API Endpoint:</span>
                <span className="value">{config.base_url}</span>
              </div>
              <div className="config-item">
                <span className="label">Configured:</span>
                <span className={`status ${config.configured ? 'online' : 'offline'}`}>
                  {config.configured ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="config-item">
                <span className="label">Cache Active:</span>
                <span className={`status ${config.cache_active ? 'active' : 'inactive'}`}>
                  {config.cache_active ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
              {config.cache_active && (
                <div className="config-item">
                  <span className="label">Cache Expires:</span>
                  <span className="value">
                    {new Date(config.cache_expires).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p>Failed to load configuration</p>
          )}
        </div>

        <div className="status-section">
          <h4>💡 Current Device State</h4>
          <div className="status-grid">
            {status.map((item, index) => (
              <div key={index} className="status-item">
                <span className="code">{item.code}:</span>
                <span className="value">
                  {typeof item.value === 'object' 
                    ? JSON.stringify(item.value) 
                    : String(item.value)
                  }
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="actions-section">
          <h4>🛠️ Debug Actions</h4>
          <div className="action-buttons">
            <button onClick={loadConfig} disabled={loading} className="refresh-btn">
              🔄 Refresh Config
            </button>
            <button onClick={loadStatus} className="refresh-btn">
              📡 Refresh Status
            </button>
            <button onClick={clearCache} className="clear-btn">
              🧹 Clear Cache
            </button>
          </div>
        </div>

        <div className="info-section">
          <h4>💡 Optimizations Enabled</h4>
          <ul className="optimization-list">
            <li>✅ State caching (30s duration)</li>
            <li>✅ Request debouncing (500ms minimum interval)</li>
            <li>✅ Duplicate command detection</li>
            <li>✅ Intelligent mode switching</li>
            <li>✅ Brightness change optimization</li>
          </ul>
        </div>
      </div>

      <style>{`
        .device-stats-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }

        .stats-toggle-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .stats-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .device-stats {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 400px;
          max-height: 80vh;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          overflow-y: auto;
          z-index: 1000;
          backdrop-filter: blur(20px);
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stats-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
        }

        .stats-content {
          padding: 16px;
        }

        .stats-content h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #4ade80;
        }

        .config-grid, .status-grid {
          display: grid;
          gap: 8px;
          margin-bottom: 20px;
        }

        .config-item, .status-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
        }

        .label, .code {
          font-weight: 500;
          color: #94a3b8;
        }

        .value {
          font-family: monospace;
          color: white;
        }

        .status.online, .status.active {
          color: #10b981;
        }

        .status.offline, .status.inactive {
          color: #ef4444;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .refresh-btn, .clear-btn {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s ease;
        }

        .clear-btn {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .refresh-btn:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .clear-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .optimization-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .optimization-list li {
          padding: 4px 0;
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default DeviceStats;