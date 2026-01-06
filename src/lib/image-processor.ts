import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;
const THUMBNAIL_SIZE = 300;

// Use temp directory for image storage (MVP)
const STORAGE_DIR = path.join(os.tmpdir(), 'tuzu-home-scan');

async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

export interface ProcessedImage {
  id: string;
  originalPath: string;
  thumbnailPath: string;
  originalFilename: string;
}

export async function processAndStoreImage(
  buffer: Buffer,
  originalFilename: string,
  sessionId: string
): Promise<ProcessedImage> {
  await ensureStorageDir();

  const imageId = uuidv4();
  const sessionDir = path.join(STORAGE_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  // Get image metadata to determine orientation
  const metadata = await sharp(buffer).metadata();
  const isHEIC = originalFilename.toLowerCase().endsWith('.heic');

  // Process main image
  let imageProcessor = sharp(buffer);

  // Handle HEIC conversion (sharp handles this automatically)
  // Resize to max dimension while preserving aspect ratio
  if (metadata.width && metadata.height) {
    const maxDim = Math.max(metadata.width, metadata.height);
    if (maxDim > MAX_DIMENSION) {
      imageProcessor = imageProcessor.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }

  // Auto-orient based on EXIF data and convert to JPEG
  imageProcessor = imageProcessor
    .rotate() // Auto-rotate based on EXIF
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

  const processedBuffer = await imageProcessor.toBuffer();
  const originalPath = path.join(sessionDir, `${imageId}.jpg`);
  await fs.writeFile(originalPath, processedBuffer);

  // Create thumbnail
  const thumbnailBuffer = await sharp(processedBuffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 70 })
    .toBuffer();

  const thumbnailPath = path.join(sessionDir, `${imageId}_thumb.jpg`);
  await fs.writeFile(thumbnailPath, thumbnailBuffer);

  return {
    id: imageId,
    originalPath,
    thumbnailPath,
    originalFilename,
  };
}

export async function getImageBuffer(imagePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(imagePath);
  } catch {
    return null;
  }
}

export async function deleteSessionImages(sessionId: string): Promise<void> {
  const sessionDir = path.join(STORAGE_DIR, sessionId);
  try {
    await fs.rm(sessionDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist
  }
}

export function getPublicImagePath(storagePath: string): string {
  // Convert absolute path to relative path for serving
  return storagePath.replace(STORAGE_DIR, '/api/images');
}
