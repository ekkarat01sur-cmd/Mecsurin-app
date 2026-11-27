export function compressAvatarFileToDataUrl(
  file: File,
  maxDim = 320,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .png, .webp)'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 8 MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });
}

export function sanitizeAvatarUrlInput(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('/') ||
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
}
