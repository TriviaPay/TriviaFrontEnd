import React from 'react';
import { View } from 'react-native';

const LottieView = React.forwardRef((props, ref) => {
  return <View {...props} />;
});

LottieView.reset = jest.fn();

export default LottieView;
