const path = require('path');
const fs = require('fs');

let cloudinary = null;
let isCloudinaryConfigured = false;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    isCloudinaryConfigured = true;
    console.log('[Storage] Connected to Cloudinary Cloud CDN.');
  } catch (err) {
    console.warn('[Storage] Failed to initialize Cloudinary:', err.message);
    isCloudinaryConfigured = false;
  }
} else {
  console.log('[Storage] No Cloudinary credentials found. Operating with local high-speed file storage (/uploads & /reports).');
}

class StorageService {
  isConfigured() {
    return isCloudinaryConfigured;
  }

  // Upload local file to Cloudinary if available, otherwise return local serving URL
  async uploadFile(localFilePath, options = {}) {
    const filename = path.basename(localFilePath);
    const folder = options.folder || 'omnicheck';
    const resourceType = options.resourceType || 'auto';

    if (isCloudinaryConfigured && cloudinary) {
      try {
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true
        });

        console.log(`[Storage] Uploaded ${filename} to Cloudinary: ${uploadResult.secure_url}`);
        return {
          storageType: 'cloudinary',
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        };
      } catch (err) {
        console.warn(`[Storage] Cloudinary upload failed for ${filename}, falling back to local URL:`, err.message);
      }
    }

    // Local serving fallback
    const relativePath = localFilePath.includes('reports')
      ? `/reports/${filename}`
      : `/uploads/${filename}`;

    return {
      storageType: 'local',
      url: relativePath,
      filename,
      bytes: fs.existsSync(localFilePath) ? fs.statSync(localFilePath).size : 0
    };
  }
}

module.exports = new StorageService();
