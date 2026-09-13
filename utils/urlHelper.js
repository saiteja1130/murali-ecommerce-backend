import path from 'path';

export const getBaseUrl = (req) => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.trim().replace(/\/+$/, '');
  }

  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
    return `${proto}://${host}`;
  }

  return `http://localhost:${process.env.PORT || 5000}`;
};
export const toFullImageUrl = (req, imagePath, folder = '') => {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const trimmed = imagePath.trim();
  if (!trimmed) return '';

  if (/^(https?:\/\/|data:)/i.test(trimmed)) {
    return trimmed;
  }

  const baseUrl = getBaseUrl(req);

  if (trimmed.startsWith('/uploads/')) {
    return `${baseUrl}${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `${baseUrl}/${trimmed}`;
  }

  if (folder) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const cleanFile = trimmed.replace(/^\/+/, '');
    return `${baseUrl}/uploads/${cleanFolder}/${cleanFile}`;
  }

  return `${baseUrl}/uploads/${trimmed.replace(/^\/+/, '')}`;
};
export const toLocalFilePath = (imageUrl, folder = '') => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  try {
    let relativePath = imageUrl;
    if (/^https?:\/\//i.test(imageUrl)) {
      const urlObj = new URL(imageUrl);
      relativePath = urlObj.pathname;
    }

    if (relativePath.includes('/uploads/')) {
      const cleanRelative = relativePath.substring(relativePath.indexOf('/uploads/'));
      return path.join(process.cwd(), cleanRelative);
    }

    if (folder) {
      const cleanFile = path.basename(relativePath);
      return path.join(process.cwd(), 'uploads', folder, cleanFile);
    }

    return null;
  } catch (err) {
    return null;
  }
};
