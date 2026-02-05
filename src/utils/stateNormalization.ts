/**
 * State Normalization Utilities
 * Helps normalize Redux state for better performance
 * Prevents nested state updates and improves selector performance
 */

/**
 * Normalize array of items by ID
 * Converts array to object keyed by ID for O(1) lookups
 *
 * @example
 * ```ts
 * const items = [
 *   { id: '1', name: 'Item 1' },
 *   { id: '2', name: 'Item 2' },
 * ];
 *
 * const normalized = normalizeById(items);
 * // Result: { '1': { id: '1', name: 'Item 1' }, '2': { id: '2', name: 'Item 2' } }
 * ```
 */
export const normalizeById = <T extends { id: string | number }>(
  items: T[]
): Record<string | number, T> => {
  return items.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string | number, T>
  );
};

/**
 * Denormalize normalized state back to array
 *
 * @example
 * ```ts
 * const normalized = { '1': { id: '1', name: 'Item 1' }, '2': { id: '2', name: 'Item 2' } };
 * const items = denormalize(normalized);
 * // Result: [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }]
 * ```
 */
export const denormalize = <T>(normalized: Record<string | number, T>): T[] => {
  return Object.values(normalized);
};

/**
 * Update normalized state with new items
 * Merges new items into existing normalized state
 *
 * @example
 * ```ts
 * const existing = { '1': { id: '1', name: 'Item 1' } };
 * const newItems = [{ id: '2', name: 'Item 2' }, { id: '1', name: 'Updated Item 1' }];
 * const updated = updateNormalized(existing, newItems);
 * ```
 */
export const updateNormalized = <T extends { id: string | number }>(
  existing: Record<string | number, T>,
  newItems: T[]
): Record<string | number, T> => {
  const normalized = normalizeById(newItems);
  return { ...existing, ...normalized };
};

/**
 * Remove items from normalized state
 *
 * @example
 * ```ts
 * const existing = { '1': { id: '1' }, '2': { id: '2' } };
 * const updated = removeFromNormalized(existing, ['1']);
 * // Result: { '2': { id: '2' } }
 * ```
 */
export const removeFromNormalized = <T>(
  existing: Record<string | number, T>,
  ids: (string | number)[]
): Record<string | number, T> => {
  const result = { ...existing };
  ids.forEach(id => {
    delete result[id];
  });
  return result;
};

/**
 * Select item from normalized state by ID
 * O(1) lookup instead of O(n) array search
 *
 * @example
 * ```ts
 * const normalized = { '1': { id: '1', name: 'Item 1' } };
 * const item = selectById(normalized, '1');
 * ```
 */
export const selectById = <T>(
  normalized: Record<string | number, T>,
  id: string | number
): T | undefined => {
  return normalized[id];
};

/**
 * Select multiple items from normalized state by IDs
 *
 * @example
 * ```ts
 * const normalized = { '1': { id: '1' }, '2': { id: '2' }, '3': { id: '3' } };
 * const items = selectByIds(normalized, ['1', '3']);
 * // Result: [{ id: '1' }, { id: '3' }]
 * ```
 */
export const selectByIds = <T>(
  normalized: Record<string | number, T>,
  ids: (string | number)[]
): T[] => {
  return ids.map(id => normalized[id]).filter(item => item !== undefined);
};

export default {
  normalizeById,
  denormalize,
  updateNormalized,
  removeFromNormalized,
  selectById,
  selectByIds,
};
