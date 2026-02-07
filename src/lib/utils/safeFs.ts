// CRITICAL: Lazy import RNFS to prevent crashes on module load
// Only import when actually needed, wrapped in try-catch
// CRITICAL: Wrap ALL RNFS operations to prevent null error code crashes
let RNFS: any = null;
let rnfsLoadAttempted = false;
const getRNFS = (): any => {
  if (RNFS === null && !rnfsLoadAttempted) {
    rnfsLoadAttempted = true;
    try {
      const rnfsModule = require('react-native-fs');
      RNFS = rnfsModule?.default || rnfsModule;

      // CRITICAL: Validate RNFS is properly initialized
      if (!RNFS || typeof RNFS !== 'object') {
        logger.warn('⚠️ [safeFs] RNFS module is invalid', 'APP');
        RNFS = null;
        return null;
      }
    } catch (error) {
      // RNFS not available - return null
      logger.warn('⚠️ [safeFs] Failed to load RNFS:', 'APP', error);
      RNFS = null;
      return null;
    }
  }
  return RNFS;
};

/**
 * Safely get cache directory path, handling null/undefined gracefully
 * This prevents crashes when RNFS is not properly initialized
 */
export function getSafeCacheDirectory(): string | null {
  try {
    const rnfs = getRNFS();
    if (rnfs && rnfs.CachesDirectoryPath && typeof rnfs.CachesDirectoryPath === 'string') {
      const path = rnfs.CachesDirectoryPath.trim();
      if (path.length > 0) {
        return path;
      }
    }
  } catch (error) {
    // Silently ignore errors
  }
  return null;
}

/**
 * Safely unlink a file path, handling null/undefined/empty paths gracefully
 * This prevents the "Parameter specified as non-null is null" crash from react-native-fs
 */
export async function safeUnlink(path?: string | null): Promise<void> {
  // Early return for invalid paths - be very strict
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return;
  }

  // Double-check path is valid before any RNFS operations
  const validPath = path.trim();
  if (validPath.length === 0 || validPath.includes('\0') || validPath.includes('\n')) {
    return;
  }

  // CRITICAL: Wrap the entire operation in a new Promise that never rejects
  // This completely isolates any RNFS promise rejections with null error codes
  return new Promise<void>(resolve => {
    // Use setTimeout to run in next tick and isolate from current call stack
    setTimeout(async () => {
      try {
        // Use safeExists to check if file exists (prevents null error code crashes)
        const exists = await safeExists(validPath);

        // CRITICAL: Only attempt unlink if file exists and RNFS is available
        // Skip unlink entirely if RNFS is not properly initialized to prevent crashes
        const rnfs = getRNFS();
        if (!rnfs || typeof rnfs.unlink !== 'function') {
          // RNFS not available - just resolve (file might not exist anyway)
          resolve();
          return;
        }

        // Only unlink if file exists and path is still valid
        if (exists && validPath && typeof validPath === 'string' && validPath.trim().length > 0) {
          // CRITICAL: Wrap RNFS.unlink in multiple layers of protection
          // This prevents null error code crashes at the native bridge level
          try {
            // Create a completely isolated promise wrapper that NEVER rejects
            const unlinkPromise = new Promise<void>(innerResolve => {
              // Use setTimeout to isolate from current call stack
              setTimeout(() => {
                try {
                  // Call RNFS.unlink but wrap it immediately in Promise.resolve
                  // This catches rejections BEFORE they reach the bridge
                  const rnfsPromise = rnfs.unlink(validPath);

                  // CRITICAL: Wrap in Promise.resolve to catch rejections
                  Promise.resolve(rnfsPromise)
                    .then(() => {
                      innerResolve();
                    })
                    .catch(error => {
                      // Catch ANY error, including null error codes
                      // Never reject - always resolve to prevent bridge crash
                      innerResolve();
                    });
                } catch (syncError) {
                  // Catch synchronous errors
                  innerResolve();
                }
              }, 0); // Isolate in next tick
            });

            // Wait for the wrapped promise with timeout
            const timeoutPromise = new Promise<void>(timeoutResolve => {
              setTimeout(() => {
                timeoutResolve();
              }, 500);
            });

            // Race between unlink and timeout - always resolve
            Promise.race([unlinkPromise, timeoutPromise])
              .then(() => {
                resolve();
              })
              .catch(() => {
                // Final safety net - always resolve
                resolve();
              });
          } catch (syncError) {
            // Catch any synchronous errors
            resolve();
          }
        } else {
          // File doesn't exist or path invalid - just resolve
          resolve();
        }
      } catch (error) {
        // Silently ignore all errors - file might not exist, be locked, or path might be invalid
        // Always resolve, never reject
        resolve();
      }
    }, 0);
  });
}

/**
 * Safely read directory, handling null/undefined/empty paths gracefully
 * Returns empty array on error to prevent crashes
 */
export async function safeReadDir(dirPath?: string | null): Promise<any[]> {
  // Early return for invalid paths
  if (!dirPath || typeof dirPath !== 'string' || dirPath.trim() === '') {
    return [];
  }

  const validPath = dirPath.trim();
  if (validPath.length === 0 || validPath.includes('\0') || validPath.includes('\n')) {
    return [];
  }

  try {
    const rnfs = getRNFS();
    if (!rnfs || typeof rnfs.readDir !== 'function') {
      // RNFS not available - return empty array
      return [];
    }

    // Wrap readDir in promise to catch any rejections
    const files = await Promise.resolve(rnfs.readDir(validPath)).catch(readError => {
      // Silently catch any promise rejections
      return [];
    });

    // Validate that we got an array
    if (Array.isArray(files)) {
      // Filter out any files with null/undefined paths to prevent issues later
      return files.filter(file => {
        return file && file.path && typeof file.path === 'string' && file.path.trim().length > 0;
      });
    }
    return [];
  } catch (error) {
    // Silently ignore errors - directory might not exist or be inaccessible
    // Return empty array to prevent crashes
    return [];
  }
}

/**
 * Safely check if a file exists, handling null/undefined/empty paths and null error codes gracefully
 * This prevents the "Parameter specified as non-null is null" crash from react-native-fs
 */
export async function safeExists(path?: string | null): Promise<boolean> {
  // Early return for invalid paths
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return false;
  }

  const validPath = path.trim();
  if (validPath.length === 0 || validPath.includes('\0') || validPath.includes('\n')) {
    return false;
  }

  // CRITICAL: Wrap in a new Promise that never rejects with null error codes
  return new Promise<boolean>(resolve => {
    setTimeout(async () => {
      try {
        const rnfs = getRNFS();
        if (!rnfs || typeof rnfs.exists !== 'function') {
          // RNFS not available - return false
          resolve(false);
          return;
        }

        // Wrap exists promise to catch any rejections with null error codes
        const existsPromise = rnfs.exists(validPath);

        // Use Promise.resolve to catch any rejections
        const result = await Promise.resolve(existsPromise).catch(error => {
          // Silently catch ANY rejection, even with null error codes
          // Always return false on error
          return false;
        });

        // Validate result is a boolean
        if (typeof result === 'boolean') {
          resolve(result);
        } else {
          resolve(false);
        }
      } catch (error) {
        // Silently ignore all errors - always resolve with false
        resolve(false);
      }
    }, 0);
  });
}

/**
 * Copy an asset to destination safely, handling null/undefined/empty paths gracefully
 * This prevents crashes from invalid paths in react-native-fs
 */
export async function safeCopy(assetPath?: string | null, destPath?: string | null): Promise<void> {
  // Early return for invalid paths
  if (!assetPath || typeof assetPath !== 'string' || assetPath.trim() === '') {
    return;
  }

  if (!destPath || typeof destPath !== 'string' || destPath.trim() === '') {
    return;
  }

  // CRITICAL: Wrap in a new Promise that never rejects with null error codes
  return new Promise<void>(resolve => {
    setTimeout(async () => {
      try {
        const rnfs = getRNFS();
        if (!rnfs || typeof rnfs.copyFileAssets !== 'function') {
          // RNFS not available - just resolve
          resolve();
          return;
        }

        const copyPromise = rnfs.copyFileAssets(assetPath, destPath);

        // Use Promise.resolve to catch any rejections with null error codes
        await Promise.resolve(copyPromise).catch(error => {
          // Silently catch ANY rejection, even with null error codes
          // Always resolve on error
        });

        resolve();
      } catch (error) {
        // Silently ignore errors - asset may not exist, destination may be locked, etc.
        // Always resolve, never reject
        resolve();
      }
    }, 0);
  });
}
