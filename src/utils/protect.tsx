/**
 * Protect utility - Simple wrapper for JSX elements
 * Used to wrap component returns for consistency
 */

import React from 'react';

/**
 * Wraps a JSX element (pass-through function)
 * @param element - The JSX element to wrap
 * @returns The same JSX element
 */
export const protect = <T extends React.ReactElement>(element: T): T => {
  return element;
};
