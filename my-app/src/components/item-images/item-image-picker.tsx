import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';

import { type ItemImageDraft, validateImage } from '@/lib/product-image';
import { ItemImagePreview } from './item-image-preview';

type Props = {
  currentUri?: string;
  draft: ItemImageDraft | null;
  onChange: (draft: ItemImageDraft | null) => void;
  disabled?: boolean;
};

export function ItemImagePicker({ currentUri, draft, onChange, disabled }: Props) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  async function chooseImage() {
    setPicking(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.5,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      let selected: ItemImageDraft;
      if (asset.file) {
        selected = {
          uri: asset.uri,
          bytes: await asset.file.arrayBuffer(),
          contentType: asset.file.type,
        };
      } else {
        // Native ImagePicker exposes JPEG data through base64.
        if (!asset.base64) throw new Error('Không đọc được ảnh đã chọn.');
        const bytes = Uint8Array.from(atob(asset.base64), character => character.charCodeAt(0));
        selected = {
          uri: `data:image/jpeg;base64,${asset.base64}`,
          bytes: bytes.buffer,
          contentType: 'image/jpeg',
        };
      }
      validateImage(selected);
      onChange(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không chọn được ảnh.');
    } finally {
      setPicking(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <ItemImagePreview uri={draft?.uri ?? currentUri} />
      <ActionButton title={draft || currentUri ? 'Chọn ảnh khác' : 'Chọn ảnh'} onPress={() => void chooseImage()} disabled={disabled || picking} />
      {draft && <ActionButton title="Bỏ ảnh vừa chọn" variant="secondary" onPress={() => onChange(null)} disabled={disabled || picking} />}
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
