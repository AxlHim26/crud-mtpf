export type ItemImageDraft = {
  uri: string;
  bytes: ArrayBuffer;
  contentType: string;
};

export function validateImage(image: ItemImageDraft) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.contentType)) {
    throw new Error('Chọn ảnh JPEG, PNG hoặc WebP.');
  }
  if (!image.bytes.byteLength || image.bytes.byteLength > 500 * 1024) {
    throw new Error('Ảnh phải có dung lượng tối đa 500 KB.');
  }
}

export function encodeProductImage(image: ItemImageDraft) {
  validateImage(image);
  const bytes = new Uint8Array(image.bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${image.contentType};base64,${btoa(binary)}`;
}
