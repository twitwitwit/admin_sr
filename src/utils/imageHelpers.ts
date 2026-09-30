/**
 * Universal image & picture resolver for connected Passenger App and Driver App records.
 * Handles web URLs, base64 data URIs, raw base64 payloads, Android PhotoPicker content:// URIs,
 * and Cloud Storage document references.
 */

const PASSENGER_PORTRAIT_POOL = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
];

const DRIVER_PORTRAIT_POOL = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
];

const hashSeed = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
};

/**
 * Checks if a string is a raw base64 encoded image without the data:image/... prefix
 */
export const normalizeBase64OrUrl = (val: unknown): string | undefined => {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('data:image/')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx !== -1) {
      const header = trimmed.slice(0, commaIdx + 1);
      const body = trimmed.slice(commaIdx + 1).replace(/\s+/g, '');
      return body ? `${header}${body}` : undefined;
    }
    return undefined;
  }
  const cleanRaw = trimmed.replace(/\s+/g, '');
  // Raw JPEG base64 starts with /9j/
  if (cleanRaw.startsWith('/9j/') && cleanRaw.length > 50) {
    return `data:image/jpeg;base64,${cleanRaw}`;
  }
  // Raw PNG base64 starts with iVBORw0KGgo
  if (cleanRaw.startsWith('iVBORw0KGgo') && cleanRaw.length > 50) {
    return `data:image/png;base64,${cleanRaw}`;
  }
  // Raw WebP base64 starts with UklGR
  if (cleanRaw.startsWith('UklGR') && cleanRaw.length > 50) {
    return `data:image/webp;base64,${cleanRaw}`;
  }
  return trimmed;
};

/**
 * Returns true if the URL is a local mobile URI (Android PhotoPicker content://, file://, ph://)
 */
export const isMobileDeviceUri = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const lower = val.trim().toLowerCase();
  return (
    lower.startsWith('content://') ||
    lower.startsWith('file://') ||
    lower.startsWith('ph://') ||
    lower.startsWith('android.resource://')
  );
};

/**
 * Returns true if the URL can be rendered directly inside an HTML <img> element in the browser.
 */
export const isWebRenderableImageUrl = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const normalized = normalizeBase64OrUrl(val);
  if (!normalized) return false;
  if (normalized.startsWith('data:image/') || normalized.startsWith('blob:')) return true;
  if (isMobileDeviceUri(normalized)) return false;
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/')) {
    const lower = normalized.toLowerCase();
    if (lower.endsWith('.pdf')) return false;
    return true;
  }
  return false;
};

/**
 * Returns true if the URL is one of the hardcoded ?w=150 default stock URLs written by the mobile app when no custom photo was uploaded
 */
export const isGenericMobilePlaceholderUrl = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return (
    trimmed === 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' ||
    trimmed === 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
  );
};

/**
 * Returns true if the avatar URL is a custom uploaded image (e.g. data:image/..., blob:, or non-stock URL)
 * rather than one of the stock Unsplash fallback portraits.
 */
export const isCustomUploadedAvatar = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return true;
  if (trimmed.includes('images.unsplash.com')) return false;
  return isWebRenderableImageUrl(trimmed);
};

/**
 * Resolves profile avatar & mobile photo URI from any connected Passenger or Driver document
 */
export const resolveConnectedProfilePicture = (
  raw: Record<string, any>,
  seedKey: string,
  role: 'PASSENGER' | 'DRIVER' = 'PASSENGER'
): { avatar: string; mobilePhotoUri?: string } => {
  const profileObj = raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
  const userObj = raw.user && typeof raw.user === 'object' ? raw.user : {};

  // Also check if a driver uploaded a profile/selfie/license photo inside requirements/documents/items
  const rawDocsArray: any[] = Array.isArray(raw.documents)
    ? raw.documents
    : Array.isArray(raw.requirements)
    ? raw.requirements
    : Array.isArray(raw.items)
    ? raw.items
    : [];
  const profileDocItem = rawDocsArray.find((item) => {
    const t = String(item?.type || item?.documentType || '').toUpperCase();
    return ['PROFILE_PHOTO', 'SELFIE', 'DRIVER_PHOTO', 'AVATAR', 'ID_PHOTO'].includes(t);
  });

  const candidates = [
    raw.photoBase64,
    raw.avatarBase64,
    raw.imageBase64,
    raw.profileImageBase64,
    raw.profilePhotoBase64,
    raw.base64,
    raw.dataUrl,
    raw.avatar,
    raw.avatarUrl,
    raw.photoURL,
    raw.photoUrl,
    raw.photoUri,
    raw.profilePic,
    raw.profilePicture,
    raw.profileImageUrl,
    raw.profileImage,
    raw.profilePhoto,
    raw.imageUrl,
    raw.imageUri,
    raw.picture,
    raw.uri,
    raw.localUri,
    profileObj.avatar,
    profileObj.avatarUrl,
    profileObj.photoUrl,
    profileObj.photoUri,
    profileObj.photoBase64,
    userObj.avatar,
    userObj.avatarUrl,
    userObj.photoUrl,
    userObj.photoUri,
    profileDocItem?.photoUri,
    profileDocItem?.fileUrl,
    profileDocItem?.base64,
  ];

  let mobilePhotoUri: string | undefined;
  let firstStockUrl: string | undefined;

  for (const c of candidates) {
    const norm = normalizeBase64OrUrl(c);
    if (!norm) continue;
    if (isMobileDeviceUri(norm)) {
      if (!mobilePhotoUri) mobilePhotoUri = norm;
      continue;
    }
    if (isWebRenderableImageUrl(norm)) {
      // Prefer custom uploaded images (data:image/ or non-stock URLs) over default Unsplash URLs
      if (isCustomUploadedAvatar(norm)) {
        return { avatar: norm, mobilePhotoUri };
      }
      if (!firstStockUrl && !isGenericMobilePlaceholderUrl(norm)) {
        firstStockUrl = norm;
      }
    }
  }

  // Also scan any requirement item for a mobile content:// URI if none was on top-level
  if (!mobilePhotoUri && rawDocsArray.length > 0) {
    for (const item of rawDocsArray) {
      const u = normalizeBase64OrUrl(item?.photoUri || item?.fileUrl);
      if (u && isMobileDeviceUri(u)) {
        mobilePhotoUri = u;
        break;
      }
    }
  }

  if (firstStockUrl && !mobilePhotoUri) {
    return { avatar: firstStockUrl, mobilePhotoUri };
  }

  const pickSeed = mobilePhotoUri || seedKey || raw.email || raw.name || 'swiftride';
  const fallbackAvatar = getFallbackAvatarUrl(String(pickSeed), role);

  return {
    avatar: fallbackAvatar,
    mobilePhotoUri,
  };
};

/**
 * Returns a deterministic high-resolution portrait fallback URL for a given ID/seed and role.
 */
export const getFallbackAvatarUrl = (
  seedKey: string = 'swiftride',
  role: 'PASSENGER' | 'DRIVER' = 'PASSENGER'
): string => {
  const pool = role === 'DRIVER' ? DRIVER_PORTRAIT_POOL : PASSENGER_PORTRAIT_POOL;
  return pool[hashSeed(String(seedKey || 'swiftride')) % pool.length];
};

/**
 * Extracts a short readable label from a mobile content:// URI or cloud file URL
 */
export const formatUploadedSourceLabel = (uri?: string): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith('content://')) {
    const parts = uri.split('/');
    const mediaId = parts[parts.length - 1];
    return `Android PhotoPicker Media #${mediaId}`;
  }
  if (uri.startsWith('file://')) {
    const parts = uri.split('/');
    return `Mobile File: ${parts[parts.length - 1]}`;
  }
  if (uri.startsWith('data:image/')) {
    return 'Synced Base64 Image';
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const u = new URL(uri);
      const pathParts = u.pathname.split('/').filter(Boolean);
      return pathParts[pathParts.length - 1] || u.hostname;
    } catch {
      return uri;
    }
  }
  return undefined;
};

/**
 * Compresses an uploaded image File into a compact Base64 data URI (< 120KB)
 * so it can be stored directly inside Firestore documents and rendered across all connected apps.
 */
export const compressImageFileToBase64 = (
  file: File,
  maxWidth = 720,
  maxHeight = 720,
  quality = 0.78
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
};
