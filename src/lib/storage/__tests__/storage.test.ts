/**
 * Storage Service Unit Tests
 * Tests for the storage module abstraction layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { LocalStorageProvider } from '../local-provider';
import {
  validateFile,
  generateStoragePath,
  calculateChecksum,
  toBuffer,
} from '../storage-service';
import { StorageError, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../types';
import type { UploadOptions } from '../types';

describe('Storage Types and Utilities', () => {
  describe('validateFile', () => {
    it('should accept valid file', () => {
      expect(() => validateFile(1024, 'image/jpeg')).not.toThrow();
    });

    it('should reject file exceeding max size', () => {
      expect(() => validateFile(MAX_FILE_SIZE + 1, 'image/jpeg')).toThrow(StorageError);
      expect(() => validateFile(MAX_FILE_SIZE + 1, 'image/jpeg')).toThrow('exceeds maximum');
    });

    it('should reject invalid MIME type', () => {
      expect(() => validateFile(1024, 'application/exe')).toThrow(StorageError);
      expect(() => validateFile(1024, 'application/exe')).toThrow('not allowed');
    });

    it('should accept all allowed MIME types', () => {
      for (const mimeType of ALLOWED_MIME_TYPES) {
        expect(() => validateFile(1024, mimeType)).not.toThrow();
      }
    });
  });

  describe('generateStoragePath', () => {
    it('should generate path for homework photo', () => {
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'homework.jpg',
        mimeType: 'image/jpeg',
      };
      const path = generateStoragePath(options);
      expect(path).toMatch(/^homework\/user123\/\d+-homework\.jpg$/);
    });

    it('should generate path with parentId', () => {
      const options: UploadOptions = {
        type: 'MINDMAP_EXPORT',
        userId: 'user123',
        filename: 'map.png',
        mimeType: 'image/png',
        parentId: 'mindmap456',
      };
      const path = generateStoragePath(options);
      expect(path).toMatch(/^mindmaps\/user123\/mindmap456\/\d+-map\.png$/);
    });

    it('should sanitize filename', () => {
      const options: UploadOptions = {
        type: 'PDF_DOCUMENT',
        userId: 'user123',
        filename: 'My File (1).pdf',
        mimeType: 'application/pdf',
      };
      const path = generateStoragePath(options);
      expect(path).toMatch(/^documents\/user123\/\d+-My_File__1_\.pdf$/);
    });

    it('should use misc directory for unknown types', () => {
      const options: UploadOptions = {
        type: 'UNKNOWN_TYPE' as any,
        userId: 'user123',
        filename: 'file.txt',
        mimeType: 'text/plain',
      };
      const path = generateStoragePath(options);
      expect(path).toMatch(/^misc\/user123\/\d+-file\.txt$/);
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate SHA-256 checksum', async () => {
      const buffer = Buffer.from('test data');
      const checksum = await calculateChecksum(buffer);
      expect(checksum).toBe('916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9');
    });

    it('should return different checksums for different data', async () => {
      const buffer1 = Buffer.from('data1');
      const buffer2 = Buffer.from('data2');
      const checksum1 = await calculateChecksum(buffer1);
      const checksum2 = await calculateChecksum(buffer2);
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('toBuffer', () => {
    it('should pass through Buffer', async () => {
      const buffer = Buffer.from('test');
      const result = await toBuffer(buffer);
      expect(result).toBe(buffer);
    });

    it('should convert Blob to Buffer', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const result = await toBuffer(blob);
      expect(result.toString()).toBe('hello');
    });
  });
});

describe('LocalStorageProvider', () => {
  const testDir = join(tmpdir(), `storage-test-${Date.now()}`);
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    provider = new LocalStorageProvider({
      provider: 'local',
      localPath: testDir,
    });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should require localPath', () => {
      expect(() => new LocalStorageProvider({ provider: 'local' })).toThrow(StorageError);
      expect(() => new LocalStorageProvider({ provider: 'local' })).toThrow('localPath is required');
    });
  });

  describe('upload', () => {
    it('should upload file and return metadata', async () => {
      const buffer = Buffer.from('test content');
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
      };

      const result = await provider.upload(buffer, options);

      expect(result.id).toBeDefined();
      expect(result.filename).toBe('test.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(buffer.length);
      expect(result.type).toBe('HOMEWORK_PHOTO');
      expect(result.userId).toBe('user123');
      expect(result.checksum).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should create metadata sidecar file', async () => {
      const buffer = Buffer.from('test content');
      const options: UploadOptions = {
        type: 'PDF_DOCUMENT',
        userId: 'user123',
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
      };

      const result = await provider.upload(buffer, options);
      const metaPath = join(testDir, result.path + '.meta.json');
      const metaContent = await readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      expect(meta.id).toBe(result.id);
      expect(meta.filename).toBe('doc.pdf');
    });

    it('should reject invalid MIME type', async () => {
      const buffer = Buffer.from('test');
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'test.exe',
        mimeType: 'application/exe',
      };

      await expect(provider.upload(buffer, options)).rejects.toThrow(StorageError);
    });

    it('should reject oversized files', async () => {
      const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'large.jpg',
        mimeType: 'image/jpeg',
      };

      await expect(provider.upload(buffer, options)).rejects.toThrow('exceeds maximum');
    });
  });

  describe('download', () => {
    it('should download uploaded file', async () => {
      const content = Buffer.from('downloadable content');
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'download.jpg',
        mimeType: 'image/jpeg',
      };

      const uploaded = await provider.upload(content, options);
      const downloaded = await provider.download(uploaded.id);

      expect(downloaded.toString()).toBe(content.toString());
    });

    it('should throw for non-existent file', async () => {
      await expect(provider.download('non-existent-id')).rejects.toThrow(StorageError);
      await expect(provider.download('non-existent-id')).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('should delete uploaded file', async () => {
      const buffer = Buffer.from('to be deleted');
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'delete-me.jpg',
        mimeType: 'image/jpeg',
      };

      const uploaded = await provider.upload(buffer, options);
      await provider.delete(uploaded.id);

      const exists = await provider.exists(uploaded.id);
      expect(exists).toBe(false);
    });

    it('should throw for non-existent file', async () => {
      await expect(provider.delete('non-existent-id')).rejects.toThrow(StorageError);
    });
  });

  describe('list', () => {
    it('should list uploaded files', async () => {
      const buffer = Buffer.from('list test');

      await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'file1.jpg',
        mimeType: 'image/jpeg',
      });

      await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'file2.jpg',
        mimeType: 'image/jpeg',
      });

      const result = await provider.list();
      expect(result.files.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should filter by userId', async () => {
      const buffer = Buffer.from('filter test');

      await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user1',
        filename: 'file1.jpg',
        mimeType: 'image/jpeg',
      });

      await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user2',
        filename: 'file2.jpg',
        mimeType: 'image/jpeg',
      });

      const result = await provider.list({ userId: 'user1' });
      expect(result.files.length).toBe(1);
      expect(result.files[0].userId).toBe('user1');
    });

    it('should filter by type', async () => {
      const buffer = Buffer.from('type filter test');

      await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      await provider.upload(buffer, {
        type: 'PDF_DOCUMENT',
        userId: 'user123',
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
      });

      const result = await provider.list({ type: 'HOMEWORK_PHOTO' });
      expect(result.files.length).toBe(1);
      expect(result.files[0].type).toBe('HOMEWORK_PHOTO');
    });

    it('should limit results', async () => {
      const buffer = Buffer.from('limit test');

      for (let i = 0; i < 5; i++) {
        await provider.upload(buffer, {
          type: 'HOMEWORK_PHOTO',
          userId: 'user123',
          filename: `file${i}.jpg`,
          mimeType: 'image/jpeg',
        });
      }

      const result = await provider.list({ limit: 2 });
      expect(result.files.length).toBe(2);
      expect(result.total).toBe(5);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const buffer = Buffer.from('exists test');
      const uploaded = await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'exists.jpg',
        mimeType: 'image/jpeg',
      });

      const exists = await provider.exists(uploaded.id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await provider.exists('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return file metadata', async () => {
      const buffer = Buffer.from('metadata test');
      const options: UploadOptions = {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'meta.jpg',
        mimeType: 'image/jpeg',
        metadata: { customField: 'value' },
      };

      const uploaded = await provider.upload(buffer, options);
      const metadata = await provider.getMetadata(uploaded.id);

      expect(metadata.id).toBe(uploaded.id);
      expect(metadata.filename).toBe('meta.jpg');
      expect(metadata.metadata).toEqual({ customField: 'value' });
    });

    it('should throw for non-existent file', async () => {
      await expect(provider.getMetadata('non-existent')).rejects.toThrow(StorageError);
    });
  });

  describe('getUrl', () => {
    it('should return API route URL', async () => {
      const buffer = Buffer.from('url test');
      const uploaded = await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'url.jpg',
        mimeType: 'image/jpeg',
      });

      const url = await provider.getUrl(uploaded.id);
      expect(url).toBe(`/api/storage/${uploaded.id}`);
    });

    it('should add download param when requested', async () => {
      const buffer = Buffer.from('download test');
      const uploaded = await provider.upload(buffer, {
        type: 'HOMEWORK_PHOTO',
        userId: 'user123',
        filename: 'download.jpg',
        mimeType: 'image/jpeg',
      });

      const url = await provider.getUrl(uploaded.id, { download: true });
      expect(url).toBe(`/api/storage/${uploaded.id}?download=true`);
    });
  });
});
