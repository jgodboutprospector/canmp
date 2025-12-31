import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '@/components/ui/FileUpload';

// Mock the storage module
jest.mock('@/lib/storage', () => ({
  validateFile: jest.fn().mockReturnValue({ valid: true }),
  formatFileSize: jest.fn((size) => `${Math.round(size / 1024)} KB`),
  isImageFile: jest.fn((type) => type.startsWith('image/')),
  isPdfFile: jest.fn((type) => type === 'application/pdf'),
}));

describe('FileUpload', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
    mockOnUpload.mockResolvedValue(true);
  });

  it('should render upload zone with label', () => {
    render(<FileUpload onUpload={mockOnUpload} label="Upload Resume" />);
    expect(screen.getByText('Upload Resume')).toBeInTheDocument();
  });

  it('should render hint text', () => {
    render(<FileUpload onUpload={mockOnUpload} hint="PDF files only" />);
    expect(screen.getByText('PDF files only')).toBeInTheDocument();
  });

  it('should show default hint when none provided', () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    expect(screen.getByText(/Drag & drop or click to select/)).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<FileUpload onUpload={mockOnUpload} disabled />);
    // The file input should be disabled
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('should show success state after successful upload', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);

    // Create a mock file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Trigger file selection
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Upload successful!')).toBeInTheDocument();
    });
  });

  it('should call onUpload with selected file', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file);
    });
  });

  it('should show error when upload fails', async () => {
    mockOnUpload.mockResolvedValue(false);
    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Failed to upload file')).toBeInTheDocument();
    });
  });

  it('should show loading state during upload', async () => {
    // Make upload take some time
    mockOnUpload.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 100)));

    render(<FileUpload onUpload={mockOnUpload} />);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Uploading/)).toBeInTheDocument();
  });
});
