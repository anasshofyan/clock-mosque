'use client';

import { MosqueData, KajianData } from '../types/config';
import { storage } from '../utils/storage';

export interface MosqueConfig {
  mosque: MosqueData;
  settings: {
    theme: 'light' | 'dark';
    announcements: KajianData[];
    prayerTimeAdjustments: {
      fajr: number;
      dhuhr: number;
      asr: number;
      maghrib: number;
      isha: number;
    };
  };
}

class ConfigService {
  private static instance: ConfigService;
  private readonly MOSQUE_KEY = 'mosque_info';
  private readonly KAJIAN_KEY = 'kajian_list';
  private readonly CONFIG_INITIALIZED_KEY = 'config_initialized';
  private initialized: boolean = false;

  private constructor() {}

  private async initializeConfigIfNeeded() {
    if (this.initialized) return;
    
    // Cek apakah kode berjalan di browser
    if (typeof window === 'undefined') {
      this.initialized = true;
      return;
    }
    
    const isInitialized = storage.getItem(this.CONFIG_INITIALIZED_KEY);
    if (!isInitialized) {
      try {
        // Menggunakan API endpoint untuk mendapatkan konfigurasi
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const config = await response.json();

        storage.setItem(this.MOSQUE_KEY, JSON.stringify(config.mosque));
        storage.setItem(this.KAJIAN_KEY, JSON.stringify(config.settings.announcements));
        storage.setItem(this.CONFIG_INITIALIZED_KEY, 'true');
        
        console.log('Config initialized from API:', config);
        this.initialized = true;
      } catch (error) {
        console.error('Error initializing config:', error);
        // Jika gagal memuat dari API, gunakan data default
        const defaultConfig = {
          mosque: {
            name: 'Masjid Default',
            location: 'Lokasi Default',
            cityCode: '1301',
            about: ''
          },
          settings: {
            announcements: []
          }
        };
        storage.setItem(this.MOSQUE_KEY, JSON.stringify(defaultConfig.mosque));
        storage.setItem(this.KAJIAN_KEY, JSON.stringify(defaultConfig.settings.announcements));
        storage.setItem(this.CONFIG_INITIALIZED_KEY, 'true');
        this.initialized = true;
      }
    } else {
      this.initialized = true;
    }
  }

  public static async getInstance(): Promise<ConfigService> {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
      // Hanya initialize jika di browser
      if (typeof window !== 'undefined') {
        await ConfigService.instance.initializeConfigIfNeeded();
      }
    }
    return ConfigService.instance;
  }

  private async saveConfigToAPI(config: MosqueConfig) {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save config');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  public async loadConfig(): Promise<{mosqueData: MosqueData | null, kajianList: KajianData[]}> {
    await this.initializeConfigIfNeeded();
    
    // Cek apakah kode berjalan di browser
    if (typeof window === 'undefined') {
      return {
        mosqueData: null,
        kajianList: []
      };
    }
    
    const mosqueData = storage.getItem(this.MOSQUE_KEY);
    const kajianList = storage.getItem(this.KAJIAN_KEY);

    return {
      mosqueData: mosqueData ? JSON.parse(mosqueData) : null,
      kajianList: kajianList ? JSON.parse(kajianList) : []
    };
  }

  public async saveMosqueInfo(data: MosqueData): Promise<void> {
    const config = await this.getConfig();
    config.mosque = data;

    // Simpan ke storage
    if (typeof window !== 'undefined') {
      storage.setItem(this.MOSQUE_KEY, JSON.stringify(data));
    }

    // Simpan ke API/file JSON
    await this.saveConfigToAPI(config);
  }

  public async addKajian(kajian: Omit<KajianData, 'id' | 'isActive'>): Promise<void> {
    const config = await this.getConfig();
    const newKajian: KajianData = {
      ...kajian,
      id: Date.now().toString(),
      isActive: true
    };

    config.settings.announcements.push(newKajian);

    // Simpan ke storage
    if (typeof window !== 'undefined') {
      storage.setItem(this.KAJIAN_KEY, JSON.stringify(config.settings.announcements));
    }

    // Simpan ke API/file JSON
    await this.saveConfigToAPI(config);
  }

  public async toggleKajianStatus(id: string): Promise<void> {
    const config = await this.getConfig();
    const updatedAnnouncements = config.settings.announcements.map(kajian =>
      kajian.id === id ? { ...kajian, isActive: !kajian.isActive } : kajian
    );

    config.settings.announcements = updatedAnnouncements;

    // Simpan ke storage
    if (typeof window !== 'undefined') {
      storage.setItem(this.KAJIAN_KEY, JSON.stringify(updatedAnnouncements));
    }

    // Simpan ke API/file JSON
    await this.saveConfigToAPI(config);
  }

  private async getKajianList(): Promise<KajianData[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    const kajianList = storage.getItem(this.KAJIAN_KEY);
    return kajianList ? JSON.parse(kajianList) : [];
  }

  public async getConfig(): Promise<MosqueConfig> {
    const config = await this.loadConfig();
    const defaultMosque: MosqueData = {
      name: '',
      location: '',
      cityCode: '',
      about: ''
    };

    const kajianList = await this.getKajianList();

    return {
      mosque: config.mosqueData || defaultMosque,
      settings: {
        theme: 'light',
        announcements: kajianList,
        prayerTimeAdjustments: {
          fajr: 0,
          dhuhr: 0,
          asr: 0,
          maghrib: 0,
          isha: 0
        }
      }
    };
  }

  public async refreshConfigFromAPI(): Promise<MosqueConfig> {
    try {
      // Force fetch dari API dengan bypass cache
      const response = await fetch('/api/config', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch config from API');
      }

      const config = await response.json();

      // Update localStorage dengan data terbaru
      if (typeof window !== 'undefined') {
        storage.setItem(this.MOSQUE_KEY, JSON.stringify(config.mosque));
        storage.setItem(this.KAJIAN_KEY, JSON.stringify(config.settings.announcements));
      }

      console.log('Config refreshed from API:', config);
      return config;
    } catch (error) {
      console.error('Error refreshing config from API:', error);
      // Fallback ke config yang ada di localStorage
      return this.getConfig();
    }
  }

  public async getMosqueInfo(): Promise<MosqueData> {
    const config = await this.getConfig();
    return config.mosque;
  }

  public async getAnnouncements() {
    const config = await this.getConfig();
    // Hanya return kajian yang aktif
    return config.settings.announcements.filter(a => a.isActive);
  }

  public async getAllAnnouncements() {
    const config = await this.getConfig();
    return config.settings.announcements;
  }

  public async getPrayerTimeAdjustments() {
    const config = await this.getConfig();
    return config.settings.prayerTimeAdjustments;
  }

  public async updateMosqueInfo(data: MosqueData): Promise<void> {
    await this.saveMosqueInfo(data);
  }

  public async updatePassword(newPassword: string): Promise<void> {
    try {
      const response = await fetch('/api/admin/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        throw new Error('Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }
}

// Export getInstance method instead of instance
export const getConfigService = () => ConfigService.getInstance();
export default getConfigService; 