/**
 * Answer Mapping Utilities
 * Pure functions for mapping API answer strings to option IDs
 */

interface Option {
  id: string;
  text: string;
}

/**
 * Maps API answer string (e.g., "Paris", "a", "option_a") to option ID (a, b, c, d)
 *
 * @param answerStr - Answer string from API (fill_in_answer or correct_answer)
 * @param options - Array of option objects with id and text
 * @returns Option ID ('a', 'b', 'c', 'd') or null if no match
 *
 * @example
 * mapAnswerToOptionId("Paris", [{id: "a", text: "London"}, {id: "c", text: "Paris"}])
 * // Returns: "c"
 *
 * mapAnswerToOptionId("a", options) // Returns: "a"
 */
export const mapAnswerToOptionId = (
  answerStr: string | null | undefined,
  options: Option[] | null | undefined
): string | null => {
  if (!answerStr || !options || options.length === 0) {
    return null;
  }

  const normalized = String(answerStr).toLowerCase().trim();

  // 1. Direct letter match (a, b, c, d)
  if (['a', 'b', 'c', 'd'].includes(normalized)) {
    return normalized;
  }

  // 2. Pattern match for "option a", "option_a", "option a.", "a." etc.
  // This helps with "Option D" issues
  const optionMatch = normalized.match(/(?:option[_\s]?)?([a-d])(?:\.|$)/);
  if (optionMatch && optionMatch[1]) {
    return optionMatch[1];
  }

  // 3. Text match - try exact match first, then partial
  const match = options.find(opt => {
    const optText = opt.text.toLowerCase().trim();

    // Exact match
    if (optText === normalized) {
      return true;
    }

    // Partial match (option text contains answer or vice versa)
    if (normalized.length > 0 && optText.includes(normalized)) {
      return true;
    }

    if (optText.length > 0 && normalized.includes(optText)) {
      return true;
    }

    return false;
  });

  return match?.id || null;
};

/**
 * Maps API question options to UI format
 * Handles both object format {a: "text", b: "text"} and array format
 */
export const normalizeOptions = (apiOptions: any): Option[] => {
  if (!apiOptions) return [];

  // Array format
  if (Array.isArray(apiOptions)) {
    return apiOptions.map((opt, index) => ({
      id: String.fromCharCode(97 + index), // a, b, c, d
      text: typeof opt === 'string' ? opt : opt.text || opt.option || '',
    }));
  }

  // Object format {option_a: "...", option_b: "...", ...}
  if (apiOptions.option_a !== undefined) {
    return [
      { id: 'a', text: apiOptions.option_a || '' },
      { id: 'b', text: apiOptions.option_b || '' },
      { id: 'c', text: apiOptions.option_c || '' },
      { id: 'd', text: apiOptions.option_d || '' },
    ];
  }

  // Object format {a: "...", b: "...", ...}
  return [
    { id: 'a', text: apiOptions.a || '' },
    { id: 'b', text: apiOptions.b || '' },
    { id: 'c', text: apiOptions.c || '' },
    { id: 'd', text: apiOptions.d || '' },
  ];
};
