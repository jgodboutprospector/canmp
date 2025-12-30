import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/login/page';

// Mock the AuthProvider
jest.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

describe('LoginPage', () => {
  it('should render login form elements', () => {
    render(<LoginPage />);

    // Check email input exists
    expect(screen.getByPlaceholderText('you@newmainerproject.org')).toBeInTheDocument();
    // Check password input exists by type
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(1);
    // Check sign in button
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show CANMP branding', () => {
    render(<LoginPage />);

    expect(screen.getByText('CANMP')).toBeInTheDocument();
    expect(screen.getByText('Case Management System')).toBeInTheDocument();
  });

  it('should have email input with required attribute', () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@newmainerproject.org');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeRequired();
  });

  it('should have password input with required attribute', () => {
    render(<LoginPage />);

    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();
  });

  it('should update email value on input', () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@newmainerproject.org');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should update password value on input', () => {
    render(<LoginPage />);

    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput).toHaveValue('password123');
  });

  it('should show sign in to your account text', () => {
    render(<LoginPage />);

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('should have a form element', () => {
    render(<LoginPage />);

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
  });
});
