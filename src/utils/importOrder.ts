/**
 * Import Ordering Utility
 * Ensures consistent import ordering across the codebase
 */

/**
 * Sort imports according to best practices:
 * 1. React and React Native
 * 2. Third-party libraries
 * 3. Internal utilities
 * 4. Types and interfaces
 * 5. Relative imports
 */
export const sortImports = (imports: string[]): string[] => {
  const reactImports: string[] = [];
  const reactNativeImports: string[] = [];
  const thirdPartyImports: string[] = [];
  const internalImports: string[] = [];
  const typeImports: string[] = [];
  const relativeImports: string[] = [];

  imports.forEach(imp => {
    if (imp.startsWith('import React') || (imp.startsWith('import {') && imp.includes('React'))) {
      reactImports.push(imp);
    } else if (imp.includes('react-native')) {
      reactNativeImports.push(imp);
    } else if (imp.startsWith('import type') || (imp.includes(':') && imp.includes('import'))) {
      typeImports.push(imp);
    } else if (imp.startsWith('import') && (imp.includes("'../") || imp.includes("'./"))) {
      relativeImports.push(imp);
    } else if (imp.startsWith('import') && !imp.includes("'../") && !imp.includes("'./")) {
      thirdPartyImports.push(imp);
    } else {
      internalImports.push(imp);
    }
  });

  return [
    ...reactImports,
    ...reactNativeImports,
    ...thirdPartyImports,
    ...internalImports,
    ...typeImports,
    ...relativeImports,
  ];
};
