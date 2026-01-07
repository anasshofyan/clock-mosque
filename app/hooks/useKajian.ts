'use client';

import { useState } from 'react';
import { KajianData } from '../types/config';
import { getConfigService } from '../services/ConfigService';

export function useKajian() {
  const [announcements, setAnnouncements] = useState<KajianData[]>([]);

  const loadAnnouncements = async (forceRefresh = false) => {
    try {
      const config = await getConfigService();

      // Force refresh dari API jika diminta
      if (forceRefresh) {
        await config.refreshConfigFromAPI();
      }

      const activeAnnouncements = await config.getAnnouncements();
      console.log('Loading announcements:', activeAnnouncements);
      setAnnouncements(activeAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const addKajian = async (kajian: Omit<KajianData, 'id' | 'isActive'>) => {
    try {
      const config = await getConfigService();
      await config.addKajian(kajian);
      await loadAnnouncements();
    } catch (error) {
      console.error('Error adding kajian:', error);
      throw error;
    }
  };

  const toggleKajianStatus = async (id: string) => {
    try {
      const config = await getConfigService();
      await config.toggleKajianStatus(id);
      await loadAnnouncements();
    } catch (error) {
      console.error('Error toggling kajian status:', error);
      throw error;
    }
  };

  return {
    announcements,
    addKajian,
    toggleKajianStatus,
    loadAnnouncements
  };
} 