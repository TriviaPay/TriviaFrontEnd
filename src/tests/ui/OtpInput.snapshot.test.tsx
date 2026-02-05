import React from 'react';
import { render } from '@testing-library/react-native';
import OtpInput from '../../components/OtpInput';

describe('OtpInput snapshots', () => {
  it('default variant', () => {
    const { toJSON } = render(<OtpInput onComplete={() => {}} email="a@b.com" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('profile variant with error', () => {
    const { toJSON } = render(
      <OtpInput onComplete={() => {}} variant="profile" error="Invalid code" />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
