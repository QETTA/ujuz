import { Text as RNText, type TextProps } from 'react-native';

export function StyledText({
  maxFontSizeMultiplier = 1.5,
  accessibilityRole = 'text',
  ...props
}: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityRole={accessibilityRole}
      {...props}
    />
  );
}
