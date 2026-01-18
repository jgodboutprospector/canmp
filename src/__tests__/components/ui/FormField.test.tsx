import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/FormField';

describe('FormField', () => {
  it('should render label correctly', () => {
    render(
      <FormField label="Username">
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should show required indicator when required is true', () => {
    render(
      <FormField label="Email" required={true}>
        <input type="email" />
      </FormField>
    );

    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass('text-red-500');
  });

  it('should not show required indicator when required is false', () => {
    render(
      <FormField label="Email" required={false}>
        <input type="email" />
      </FormField>
    );

    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('should not show required indicator by default', () => {
    render(
      <FormField label="Email">
        <input type="email" />
      </FormField>
    );

    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('should show error message when error prop is provided', () => {
    render(
      <FormField label="Password" error="Password is required">
        <input type="password" />
      </FormField>
    );

    const errorMessage = screen.getByText('Password is required');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-red-600');
  });

  it('should show hint text when hint prop is provided and no error', () => {
    render(
      <FormField label="Username" hint="Must be at least 3 characters">
        <input type="text" />
      </FormField>
    );

    const hintText = screen.getByText('Must be at least 3 characters');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toHaveClass('text-gray-500');
  });

  it('should not show hint when error is present', () => {
    render(
      <FormField
        label="Username"
        hint="Must be at least 3 characters"
        error="Username is required"
      >
        <input type="text" />
      </FormField>
    );

    expect(screen.queryByText('Must be at least 3 characters')).not.toBeInTheDocument();
    expect(screen.getByText('Username is required')).toBeInTheDocument();
  });

  it('should associate label with input via htmlFor', () => {
    render(
      <FormField label="Email" htmlFor="email-input">
        <input id="email-input" type="email" />
      </FormField>
    );

    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('should render children correctly', () => {
    render(
      <FormField label="Test Field">
        <input type="text" data-testid="test-input" />
      </FormField>
    );

    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <FormField label="Test Field" className="custom-class">
        <input type="text" />
      </FormField>
    );

    const formFieldDiv = container.firstChild as HTMLElement;
    expect(formFieldDiv).toHaveClass('custom-class');
  });

  it('should have default spacing classes', () => {
    const { container } = render(
      <FormField label="Test Field">
        <input type="text" />
      </FormField>
    );

    const formFieldDiv = container.firstChild as HTMLElement;
    expect(formFieldDiv).toHaveClass('space-y-1');
  });

  it('should show error icon with error message', () => {
    const { container } = render(
      <FormField label="Field" error="Error message">
        <input type="text" />
      </FormField>
    );

    // Look for the AlertCircle icon (rendered as svg)
    const errorContainer = screen.getByText('Error message').parentElement;
    const svg = errorContainer?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <FormField label="Multiple Inputs">
        <input type="text" data-testid="input-1" />
        <input type="text" data-testid="input-2" />
      </FormField>
    );

    expect(screen.getByTestId('input-1')).toBeInTheDocument();
    expect(screen.getByTestId('input-2')).toBeInTheDocument();
  });

  it('should work with different input types', () => {
    const { rerender } = render(
      <FormField label="Text Input">
        <input type="text" data-testid="input" />
      </FormField>
    );

    expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');

    rerender(
      <FormField label="Textarea">
        <textarea data-testid="textarea" />
      </FormField>
    );

    expect(screen.getByTestId('textarea')).toBeInTheDocument();

    rerender(
      <FormField label="Select">
        <select data-testid="select">
          <option>Option 1</option>
        </select>
      </FormField>
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('should style label correctly', () => {
    render(
      <FormField label="Styled Label">
        <input type="text" />
      </FormField>
    );

    const label = screen.getByText('Styled Label');
    expect(label).toHaveClass('text-sm', 'font-medium', 'text-gray-700');
  });

  it('should handle long error messages', () => {
    const longError = 'This is a very long error message that should still display correctly without breaking the layout';

    render(
      <FormField label="Field" error={longError}>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText(longError)).toBeInTheDocument();
  });

  it('should handle long hint messages', () => {
    const longHint = 'This is a very long hint message that provides detailed guidance about what to enter in this field';

    render(
      <FormField label="Field" hint={longHint}>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText(longHint)).toBeInTheDocument();
  });

  it('should not break with empty strings', () => {
    render(
      <FormField label="" hint="" error="">
        <input type="text" />
      </FormField>
    );

    // Should render without errors
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should combine custom className with default classes', () => {
    const { container } = render(
      <FormField label="Test" className="my-custom-class">
        <input type="text" />
      </FormField>
    );

    const formFieldDiv = container.firstChild as HTMLElement;
    expect(formFieldDiv).toHaveClass('space-y-1');
    expect(formFieldDiv).toHaveClass('my-custom-class');
  });
});
