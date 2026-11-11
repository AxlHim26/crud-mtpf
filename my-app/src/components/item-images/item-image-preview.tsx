import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

export function ItemImagePreview({ uri }: { uri?: string }) {
  if (!uri) return null;
  return (
    <Image
      source={uri}
      style={styles.image}
      contentFit="contain"
      cachePolicy="none"
      accessibilityLabel="Ảnh của mục"
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', maxWidth: 240, alignSelf: 'center', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: '#f4f7fa' },
});
