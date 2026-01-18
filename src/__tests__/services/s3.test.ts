import {
  uploadToS3,
  uploadDonationPhoto,
  deleteFromS3,
  getSignedDownloadUrl,
  fileExistsInS3,
  getFileInfo,
  isValidImageType,
  getMaxFileSize,
  generateDonationPhotoKey,
} from '@/lib/services/s3';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3 Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_S3_BUCKET = 'test-bucket';
  });

  describe('File validation', () => {
    it('should validate image types correctly', () => {
      expect(isValidImageType('image/jpeg')).toBe(true);
      expect(isValidImageType('image/png')).toBe(true);
      expect(isValidImageType('image/gif')).toBe(true);
      expect(isValidImageType('image/webp')).toBe(true);
      expect(isValidImageType('image/jpg')).toBe(true);
    });

    it('should reject invalid image types', () => {
      expect(isValidImageType('application/pdf')).toBe(false);
      expect(isValidImageType('text/plain')).toBe(false);
      expect(isValidImageType('video/mp4')).toBe(false);
    });

    it('should handle case insensitive types', () => {
      expect(isValidImageType('IMAGE/JPEG')).toBe(true);
      expect(isValidImageType('Image/Png')).toBe(true);
    });

    it('should return correct max file size', () => {
      const maxSize = getMaxFileSize();
      expect(maxSize).toBe(10 * 1024 * 1024); // 10MB
    });
  });

  describe('generateDonationPhotoKey', () => {
    it('should generate correct S3 key format', () => {
      const key = generateDonationPhotoKey('donation-123', 'photo.jpg');

      expect(key).toMatch(/^donations\/donation-123\/\d+_photo\.jpg$/);
    });

    it('should sanitize filename', () => {
      const key = generateDonationPhotoKey('donation-123', 'my photo (1).jpg');

      expect(key).toContain('my_photo__1_.jpg');
      expect(key).not.toContain('(');
      expect(key).not.toContain(')');
      expect(key).not.toContain(' ');
    });

    it('should convert to lowercase', () => {
      const key = generateDonationPhotoKey('donation-123', 'PHOTO.JPG');

      expect(key).toContain('photo.jpg');
      expect(key).not.toContain('PHOTO.JPG');
    });
  });

  describe('uploadToS3', () => {
    it('should upload file successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/test-bucket/test-key');

      const buffer = Buffer.from('test file content');
      const result = await uploadToS3(buffer, 'test-key', 'image/jpeg', { custom: 'metadata' });

      expect(result.success).toBe(true);
      expect(result.key).toBe('test-key');
      expect(result.url).toContain('test-bucket');
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should handle upload errors', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Upload failed'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const buffer = Buffer.from('test file content');
      const result = await uploadToS3(buffer, 'test-key', 'image/jpeg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should include metadata in upload', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/test');

      const buffer = Buffer.from('test');
      const metadata = { donationId: 'donation-123', uploadedBy: 'user-1' };
      await uploadToS3(buffer, 'test-key', 'image/jpeg', metadata);

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Metadata).toEqual(metadata);
    });

    it('should set correct content type', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/test');

      const buffer = Buffer.from('test');
      await uploadToS3(buffer, 'test-key', 'image/png');

      const command = mockSend.mock.calls[0][0];
      expect(command.input.ContentType).toBe('image/png');
    });
  });

  describe('uploadDonationPhoto', () => {
    it('should upload donation photo with correct key and metadata', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      (getSignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/test');

      const buffer = Buffer.from('image data');
      const result = await uploadDonationPhoto(buffer, 'donation-123', 'photo.jpg', 'image/jpeg');

      expect(result.success).toBe(true);
      expect(result.key).toContain('donations/donation-123');
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Metadata).toHaveProperty('donationItemId', 'donation-123');
      expect(command.input.Metadata).toHaveProperty('originalFilename', 'photo.jpg');
    });
  });

  describe('deleteFromS3', () => {
    it('should delete file successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const result = await deleteFromS3('test-key');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should handle delete errors', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Delete failed'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const result = await deleteFromS3('test-key');

      expect(result).toBe(false);
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('should generate signed URL successfully', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com/file');

      const url = await getSignedDownloadUrl('test-key');

      expect(url).toBe('https://signed-url.com/file');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should use default expiry of 3600 seconds', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com/file');

      await getSignedDownloadUrl('test-key');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 }
      );
    });

    it('should use custom expiry when provided', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com/file');

      await getSignedDownloadUrl('test-key', 7200);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 }
      );
    });

    it('should handle signed URL generation errors', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Signature failed'));

      await expect(getSignedDownloadUrl('test-key')).rejects.toThrow('Failed to generate signed URL');
    });
  });

  describe('fileExistsInS3', () => {
    it('should return true when file exists', async () => {
      const mockSend = jest.fn().mockResolvedValue({ ContentLength: 1024 });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const exists = await fileExistsInS3('test-key');

      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('should return false when file does not exist', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('NotFound'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const exists = await fileExistsInS3('test-key');

      expect(exists).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should return file info when file exists', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        ContentLength: 2048,
        ContentType: 'image/jpeg',
      });
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com/file');

      const info = await getFileInfo('test-key');

      expect(info).not.toBeNull();
      expect(info?.key).toBe('test-key');
      expect(info?.size).toBe(2048);
      expect(info?.contentType).toBe('image/jpeg');
      expect(info?.url).toBe('https://signed-url.com/file');
    });

    it('should return null when file does not exist', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('NotFound'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const info = await getFileInfo('test-key');

      expect(info).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle S3Client initialization errors', async () => {
      (S3Client as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      await expect(uploadToS3(Buffer.from('test'), 'key', 'image/jpeg')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Network timeout'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const result = await uploadToS3(Buffer.from('test'), 'key', 'image/jpeg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });
});
