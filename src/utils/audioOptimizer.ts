/**
 * Audio Optimization System
 * Prevents conflicts, manages cleanup, and optimizes performance
 * Works with existing AudioManager without breaking it
 */

/**
 * Audio instance registry
 * Prevents multiple instances
 */
class AudioInstanceRegistry {
  private static instance: AudioInstanceRegistry | null = null;
  private instances: Map<string, any> = new Map();
  private preloadedSounds: Set<string> = new Set();

  static getInstance(): AudioInstanceRegistry {
    if (!AudioInstanceRegistry.instance) {
      AudioInstanceRegistry.instance = new AudioInstanceRegistry();
    }
    return AudioInstanceRegistry.instance;
  }

  register(name: string, instance: any): void {
    if (this.instances.has(name)) {
      // Cleanup existing instance
      const existing = this.instances.get(name);
      if (existing && typeof existing.cleanup === 'function') {
        existing.cleanup();
      }
    }
    this.instances.set(name, instance);
  }

  get(name: string): any {
    return this.instances.get(name);
  }

  unregister(name: string): void {
    const instance = this.instances.get(name);
    if (instance && typeof instance.cleanup === 'function') {
      instance.cleanup();
    }
    this.instances.delete(name);
  }

  markPreloaded(soundName: string): void {
    this.preloadedSounds.add(soundName);
  }

  isPreloaded(soundName: string): boolean {
    return this.preloadedSounds.has(soundName);
  }

  cleanupAll(): void {
    this.instances.forEach((instance, name) => {
      if (instance && typeof instance.cleanup === 'function') {
        instance.cleanup();
      }
    });
    this.instances.clear();
    this.preloadedSounds.clear();
  }
}

/**
 * Audio preloading strategy
 */
export const preloadCriticalSounds = async (
  soundNames: string[],
  audioManager: any
): Promise<void> => {
  const registry = AudioInstanceRegistry.getInstance();

  // Preload sounds in batches to avoid blocking
  const batchSize = 3;
  for (let i = 0; i < soundNames.length; i += batchSize) {
    const batch = soundNames.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async soundName => {
        try {
          if (!registry.isPreloaded(soundName) && audioManager && audioManager.preloadSound) {
            await audioManager.preloadSound(soundName);
            registry.markPreloaded(soundName);
          }
        } catch (error) {
          // Silent fail - preloading is non-critical
        }
      })
    );

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

/**
 * Get or create audio manager instance
 * Prevents multiple instances
 */
export const getAudioManagerInstance = (audioManagerClass: any, name: string = 'default'): any => {
  const registry = AudioInstanceRegistry.getInstance();

  let instance = registry.get(name);
  if (!instance) {
    instance = audioManagerClass.getInstance
      ? audioManagerClass.getInstance()
      : new audioManagerClass();
    registry.register(name, instance);
  }

  return instance;
};

/**
 * Cleanup audio manager
 */
export const cleanupAudioManager = (name: string = 'default'): void => {
  const registry = AudioInstanceRegistry.getInstance();
  registry.unregister(name);
};

/**
 * Cleanup all audio managers
 */
export const cleanupAllAudio = (): void => {
  const registry = AudioInstanceRegistry.getInstance();
  registry.cleanupAll();
};

export default {
  preloadCriticalSounds,
  getAudioManagerInstance,
  cleanupAudioManager,
  cleanupAllAudio,
};
