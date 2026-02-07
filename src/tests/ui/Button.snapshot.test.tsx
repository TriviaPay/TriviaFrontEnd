import React from 'react';
import { render } from '@testing-library/react-native';
import { Button } from '../../ui/components/Button';

describe('Button snapshots', () => {
  it('primary md', () => {
    const { toJSON } = render(<Button>Submit</Button>);
    expect(toJSON()).toMatchSnapshot();
  });

  it('outline lg disabled', () => {
    const { toJSON } = render(
      <Button variant="outline" size="lg" disabled>
        Outline
      </Button>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
