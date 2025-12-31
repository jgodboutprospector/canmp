import {
  validateFile,
  generateStoragePath,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isPdfFile,
} from '@/lib/storage';

describe('validateFile', () => {
  const createMockFile = (name: string, size: number, type: string): File => {
    const blob = new Blob([''], { type });
    Object.defineProperty(blob, 'size', { value: size });
    Object.defineProperty(blob, 'name', { value: name });
    return blob as File;
  };

  describe('file size validation', () => {
    it('should accept files under the limit', () => {
      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf'); // 1MB
      const result = validateFile(file, 'document');
      expect(result.valid).toBe(true);
    });

    it('should reject files over the default limit', () => {
      const file = createMockFile('test.pdf', 15 * 1024 * 1024, 'application/pdf'); // 15MB
      const result = validateFile(file, 'document');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should respect custom size limits', () => {
      const file = createMockFile('test.pdf', 3 * 1024 * 1024, 'application/pdf'); // 3MB
      const result = validateFile(file, 'document', 2 * 1024 * 1024); // 2MB limit
      expect(result.valid).toBe(false);
    });
  });

  describe('file type validation', () => {
    it('should accept PDF files for resume category', () => {
      const file = createMockFile('resume.pdf', 1024, 'application/pdf');
      const result = validateFile(file, 'resume');
      expect(result.valid).toBe(true);
    });

    it('should accept Word documents for resume category', () => {
      const file = createMockFile('resume.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = validateFile(file, 'resume');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid types for resume category', () => {
      const file = createMockFile('resume.exe', 1024, 'application/x-msdownload');
      const result = validateFile(file, 'resume');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should accept only PDF for lease category', () => {
      const file = createMockFile('lease.pdf', 1024, 'application/pdf');
      const result = validateFile(file, 'lease');
      expect(result.valid).toBe(true);
    });

    it('should reject non-PDF for lease category', () => {
      const file = createMockFile('lease.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = validateFile(file, 'lease');
      expect(result.valid).toBe(false);
    });

    it('should accept images for certificate category', () => {
      const file = createMockFile('cert.jpg', 1024, 'image/jpeg');
      const result = validateFile(file, 'certificate');
      expect(result.valid).toBe(true);
    });

    it('should accept images for image category', () => {
      const types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      types.forEach((type) => {
        const file = createMockFile(`image.${type.split('/')[1]}`, 1024, type);
        const result = validateFile(file, 'image');
        expect(result.valid).toBe(true);
      });
    });
  });
});

describe('generateStoragePath', () => {
  it('should generate path with folder, entity ID, and timestamp', () => {
    const path = generateStoragePath('workforce', 'abc-123', 'resume.pdf');
    expect(path).toMatch(/^workforce\/abc-123\/\d+_resume\.pdf$/);
  });

  it('should sanitize special characters in filename', () => {
    const path = generateStoragePath('folder', 'id', 'my resume (final).pdf');
    expect(path).not.toContain('(');
    expect(path).not.toContain(')');
    expect(path).not.toContain(' ');
  });

  it('should preserve underscores and dots', () => {
    const path = generateStoragePath('folder', 'id', 'my_file.name.pdf');
    expect(path).toContain('my_file.name.pdf');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should handle zero', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });
});

describe('getFileExtension', () => {
  it('should extract extension from filename', () => {
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('image.PNG')).toBe('png');
    expect(getFileExtension('file.name.with.dots.txt')).toBe('txt');
  });

  it('should return empty string for files without extension', () => {
    expect(getFileExtension('noextension')).toBe('');
  });
});

describe('isImageFile', () => {
  it('should return true for image MIME types', () => {
    expect(isImageFile('image/jpeg')).toBe(true);
    expect(isImageFile('image/png')).toBe(true);
    expect(isImageFile('image/gif')).toBe(true);
    expect(isImageFile('image/webp')).toBe(true);
  });

  it('should return false for non-image types', () => {
    expect(isImageFile('application/pdf')).toBe(false);
    expect(isImageFile('text/plain')).toBe(false);
  });
});

describe('isPdfFile', () => {
  it('should return true for PDF MIME type', () => {
    expect(isPdfFile('application/pdf')).toBe(true);
  });

  it('should return false for non-PDF types', () => {
    expect(isPdfFile('image/jpeg')).toBe(false);
    expect(isPdfFile('application/msword')).toBe(false);
  });
});
