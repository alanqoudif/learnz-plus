import type { SheetFileInput } from '../services/ocrService';

export const fallbackNameFromUri = (uri?: string | null) => {
  if (!uri) {
    return 'ملف بدون اسم';
  }
  const segments = uri.split('/');
  return segments[segments.length - 1] || 'ملف بدون اسم';
};

export const buildSheetFilesFromAssets = (assets: any[]): SheetFileInput[] => {
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets
    .map(asset => {
      const uri = asset?.fileCopyUri || asset?.uri;
      if (!uri) {
        return null;
      }

      return {
        uri,
        mimeType: asset?.mimeType || asset?.type || null,
        name: asset?.name || asset?.fileName || asset?.assetId || fallbackNameFromUri(uri),
      } as SheetFileInput;
    })
    .filter((file): file is SheetFileInput => !!file?.uri);
};

