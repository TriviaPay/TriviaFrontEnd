# Typography System - Usage Guide

## 📖 Overview

The TriviaPay typography system uses:
- **Architects Daughter (Bold)** for all headings
- **Aoboshi One (Regular)** for all body/normal text

All fonts are responsive and scale automatically based on screen size.

## 🚀 Quick Start

### Import Typography

```typescript
// Import from theme/typography (single source of truth)
import { typography, typographyVariants } from '../theme/typography';

// Option 3: Import fonts directly
import { FONTS } from '../theme/fonts';
```

### Basic Usage

```typescript
import { Text } from 'react-native';
import { typography } from '../theme/typography';

// Using typography styles
<Text style={typography.h1}>Heading 1</Text>
<Text style={typography.body}>Body text</Text>
<Text style={typography.button}>Button Text</Text>
```

## 📝 Typography Styles Available

### Headings (Architects Daughter Bold)
- `typography.h1` - Largest heading (32px base)
- `typography.h2` - Second heading (28px base)
- `typography.h3` - Third heading (24px base)
- `typography.h4` - Fourth heading (20px base)
- `typography.h5` - Fifth heading (18px base)
- `typography.h6` - Smallest heading (16px base)
- `typography.display1` - Large display text (48px base)
- `typography.display2` - Display text (40px base)
- `typography.display3` - Display text (36px base)
- `typography.display4` - Display text (28px base)

### Body Text (Aoboshi One Regular)
- `typography.body` - Standard body text (16px base)
- `typography.bodyLarge` - Large body text (18px base)
- `typography.bodySmall` - Small body text (14px base)
- `typography.caption` - Caption text (12px base)
- `typography.small` - Smallest text (10px base)

### Buttons (Aoboshi One)
- `typography.button` - Standard button text
- `typography.buttonLarge` - Large button text
- `typography.buttonSmall` - Small button text

### Form Elements (Aoboshi One)
- `typography.label` - Form labels
- `typography.input` - Input field text
- `typography.placeholder` - Placeholder text

### Special Styles
- `typography.overline` - Uppercase overline text
- `typography.subtitle` - Subtitle text
- `typography.subtitle2` - Secondary subtitle
- `typography.code` - Monospace code text

## 🎨 Typography Variants

Pre-configured variants for common use cases:

```typescript
import { typographyVariants } from '../theme/typography';

// Screen titles
<Text style={typographyVariants.screenTitle}>Screen Title</Text>

// Card titles
<Text style={typographyVariants.cardTitle}>Card Title</Text>

// Form elements
<Text style={typographyVariants.formLabel}>Label</Text>
<Text style={typographyVariants.formError}>Error message</Text>

// Navigation
<Text style={typographyVariants.navTitle}>Nav Title</Text>

// Buttons
<Text style={typographyVariants.primaryButton}>Button</Text>
```

## 🔧 Custom Typography

### Create Custom Style

```typescript
import { createTypographyStyle } from '../theme/typography';

const customStyle = createTypographyStyle(
  20,              // fontSize
  '700',           // fontWeight
  'heading',       // 'heading' or 'body'
  1.5,             // lineHeight multiplier (optional)
  0.5              // letterSpacing (optional)
);

<Text style={customStyle}>Custom Text</Text>
```

### Direct Font Usage

```typescript
import { FONTS } from '../theme/fonts';

<Text style={{
  fontFamily: FONTS.heading,  // Architects Daughter Bold
  fontSize: 24,
  fontWeight: '700',
}}>
  Custom Heading
</Text>

<Text style={{
  fontFamily: FONTS.body,     // Aoboshi One Regular
  fontSize: 16,
  fontWeight: '400',
}}>
  Custom Body Text
</Text>
```

## 📱 Responsive Scaling

All typography styles automatically scale based on:
- Screen width
- Device pixel ratio
- Minimum readable size (12px)
- Maximum reasonable size

### Manual Responsive Size

```typescript
import { getResponsiveFontSize } from '../theme/typography';

const fontSize = getResponsiveFontSize(20); // Base 20px, scales responsively
```

## 💡 Best Practices

1. **Use Typography System** - Always use typography styles instead of hardcoding fonts
2. **Headings** - Use `typography.h1` through `typography.h6` for all headings
3. **Body Text** - Use `typography.body`, `typography.bodyLarge`, or `typography.bodySmall`
4. **Buttons** - Use `typography.button` variants
5. **Consistency** - Use typography variants for consistency across the app

## 🔄 Migration from Old Fonts

If you're migrating from old font usage (like JotiOne-Regular), replace:

```typescript
// Old way
<Text style={{ fontFamily: 'JotiOne-Regular' }}>Text</Text>

// New way
<Text style={typography.body}>Text</Text>
// or
<Text style={typography.h1}>Heading</Text>
```

## 📚 Examples

### Screen Component

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { typography } from '../theme/typography';

const MyScreen = () => {
  return (
    <View>
      <Text style={typography.h1}>Screen Title</Text>
      <Text style={typography.body}>Body content goes here</Text>
      <Text style={typography.caption}>Caption text</Text>
    </View>
  );
};
```

### Button Component

```typescript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { typography } from '../theme/typography';

const MyButton = ({ title, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={typography.button}>{title}</Text>
    </TouchableOpacity>
  );
};
```

### Form Input

```typescript
import React from 'react';
import { TextInput, Text, View } from 'react-native';
import { typography } from '../theme/typography';

const MyInput = ({ label, ...props }) => {
  return (
    <View>
      <Text style={typography.label}>{label}</Text>
      <TextInput style={typography.input} {...props} />
    </View>
  );
};
```

## ✅ Summary

- **Headings**: Use `typography.h1` through `typography.h6` (Architects Daughter Bold)
- **Body Text**: Use `typography.body` variants (Aoboshi One Regular)
- **Responsive**: All fonts scale automatically
- **Consistent**: Use typography system for consistency
- **Easy**: Import and use, no configuration needed

