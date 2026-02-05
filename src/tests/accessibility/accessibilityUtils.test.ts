import {
  createAccessibilityLabel,
  getAccessibilityRole,
  getAccessibilityProps,
  ensureMinimumTouchTarget,
  getAccessibilityState,
} from '../../utils/accessibility';

describe('accessibility utils', () => {
  it('creates accessibility label', () => {
    expect(createAccessibilityLabel('Submit', 'button')).toBe('Submit, button');
    expect(createAccessibilityLabel('Open', 'link', 'Opens page')).toBe('Open, link, Opens page');
  });

  it('returns accessibility role', () => {
    expect(getAccessibilityRole('button')).toBe('button');
    expect(getAccessibilityRole('input')).toBe('textbox');
  });

  it('returns accessibility props', () => {
    const props = getAccessibilityProps('Play', 'button', 'Starts');
    expect(props.accessible).toBe(true);
    expect(props.accessibilityRole).toBe('button');
    expect(props.accessibilityLabel).toContain('Play');
  });

  it('ensures minimum touch target', () => {
    const style = ensureMinimumTouchTarget({ width: 10, height: 10 });
    expect(style.minWidth).toBeGreaterThanOrEqual(10);
    expect(style.minHeight).toBeGreaterThanOrEqual(10);
  });

  it('creates accessibility state', () => {
    const state = getAccessibilityState(true, false, true);
    expect(state.accessibilityState.selected).toBe(true);
    expect(state.accessibilityState.disabled).toBe(false);
    expect(state.accessibilityState.checked).toBe(true);
  });
});
