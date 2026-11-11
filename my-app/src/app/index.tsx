import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';


import { ItemImagePicker } from '@/components/item-images/item-image-picker';
import { ItemImagePreview } from '@/components/item-images/item-image-preview';
import { encodeProductImage, type ItemImageDraft } from '@/lib/product-image';
import { AdminSessionExpired, hasAdminSession, apiUrl, loginAdmin, logoutAdmin, deleteProduct, deleteProducts, listProducts, saveProduct, type Product } from '@/lib/products';


const PAGE_SIZE = 5;
type PriceOrder = 'default' | 'ascending' | 'descending';

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD')
    .replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

function message(error: unknown) {
  return error instanceof Error ? error.message :
    typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Có lỗi xảy ra. Vui lòng thử lại.';
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [priceOrder, setPriceOrder] = useState<PriceOrder>('default');
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [image, setImage] = useState<ItemImageDraft | null>(null);
  const [user, setUser] = useState(hasAdminSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listProducts().then(
      products => { if (active) setItems(products); },
      cause => {
        if (!active) return;
        if (cause instanceof AdminSessionExpired) {
          setUser(false);
          setAuthError(cause.message);
        } else {
          setError(message(cause));
        }
      },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  function handleExpiredSession(cause: unknown) {
    if (!(cause instanceof AdminSessionExpired)) return false;
    setVisible(false);
    setRemoving(null);
    setItems([]);
    setSearch('');
    setPage(1);
    setPriceOrder('default');
    clearSelection();
    setUser(false);
    setAuthError(cause.message);
    return true;
  }

  async function login() {
    if (!apiUrl || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setAuthError('');
    setLoading(true);
    setError('');
    setItems([]);
    try {
      await loginAdmin(email.trim(), password);
      setUser(true);
      setPassword('');
    } catch (cause) {
      setAuthError(message(cause));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    if (!apiUrl || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    try {
      await logoutAdmin();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setUser(false);
      setItems([]);
      setSearch('');
      setPage(1);
      setPriceOrder('default');
      clearSelection();
      mutation.current = false;
      setBusy(false);
    }
  }

  function open(item: Product | null) {
    setEditing(item);
    setTitle(item?.name ?? '');
    setPrice(item ? String(item.price) : '');
    setQuantity(item ? String(item.soluong) : '');
    setImage(null);
    setFormError('');
    setVisible(true);
  }
  async function submit() {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setFormError('');
    try {
      const name = title.trim();
      const amount = Number(price);
      const soluong = Number(quantity);
      if (!name) throw new Error('Nhập tên sản phẩm.');
      if (!/^\d+(?:\.\d+)?$/.test(price.trim()) || amount > Number.MAX_SAFE_INTEGER) {
        throw new Error('Nhập giá hợp lệ, lớn hơn hoặc bằng 0.');
      }
      if (!/^\d+$/.test(quantity.trim()) || !Number.isSafeInteger(soluong)) {
        throw new Error('Số lượng phải là số nguyên không âm.');
      }
      const imageData = image ? encodeProductImage(image) : editing?.image;
      if (!imageData) throw new Error('Chọn ảnh sản phẩm.');
      const saved = await saveProduct({ name, price: amount, soluong, image: imageData }, editing?.id);
      setItems(previous => editing ? previous.map(item => item.id === saved.id ? saved : item) : [saved, ...previous]);
      setPage(1);
      setVisible(false);
    } catch (err) { if (!handleExpiredSession(err)) setFormError(message(err)); }
    finally { mutation.current = false; setBusy(false); }
  }
  function clearSelection() {
    setSelecting(false);
    setSelected([]);
    setConfirmBulk(false);
  }

  function toggleSelection(id: string) {
    setSelected(current => current.includes(id)
      ? current.filter(value => value !== id)
      : [...current, id]);
  }

  async function removeSelected() {
    if (!selected.length || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteProducts(selected);
      const deleted = new Set(selected);
      setItems(current => current.filter(item => !deleted.has(item.id)));
      clearSelection();
    } catch (cause) {
      setConfirmBulk(false);
      if (!handleExpiredSession(cause)) setError(message(cause));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteProduct(removing.id);
      setItems(previous => previous.filter(item => item.id !== removing.id));
      setRemoving(null);
    } catch (err) { setRemoving(null); if (!handleExpiredSession(err)) setError(message(err)); }
    finally { mutation.current = false; setBusy(false); }
  }

  const query = normalizeSearch(search.trim());
  const filteredItems = items.filter(item => normalizeSearch(item.name).includes(query));
  if (priceOrder !== 'default') {
    filteredItems.sort((a, b) => priceOrder === 'ascending' ? a.price - b.price : b.price - a.price);
  }
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  // Clamp after deletions so an empty last page is never displayed.
  if (page !== currentPage) setPage(currentPage);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(offset, offset + PAGE_SIZE);

  if (!apiUrl || !user) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loginContent}>
          <Text style={[styles.cardTitle, styles.loginTitle]}>Đăng nhập</Text>
          {!apiUrl ? <Text style={styles.error}>Thiếu cấu hình API. Xem README.md.</Text> : (
              <>
                <TextInput accessibilityLabel="Email" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
                <TextInput accessibilityLabel="Mật khẩu" placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
                {!!authError && <Text accessibilityRole="alert" style={styles.error}>{authError}</Text>}
                <ActionButton title="Đăng nhập" onPress={() => void login()} disabled={busy || !email.trim() || !password} />
              </>
            )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.content, compact && styles.mobileContent]}>
        <View style={[styles.actions, styles.toolbar]}>
          {!compact && <ActionButton title="+ Thêm mới" onPress={() => open(null)} disabled={loading || busy || !!error} />}
          <TextInput
            accessibilityLabel="Tìm kiếm sản phẩm"
            placeholder="Tìm theo tên sản phẩm"
            placeholderTextColor="#667085"
            value={search}
            onChangeText={value => { setSearch(value); setPage(1); }}
            style={[styles.input, styles.searchInput, compact && styles.mobileSearch]}
          />
          {compact && <ActionButton title="+ Thêm mới" onPress={() => open(null)} disabled={loading || busy || !!error} />}
          <ActionButton title={selecting ? (compact ? 'Bỏ chọn' : 'Bỏ chế độ chọn') : 'Chọn nhiều'} variant="secondary" onPress={selecting ? clearSelection : () => setSelecting(true)} disabled={busy || loading} />
          {selecting && (
            <ActionButton title={`Xóa đã chọn (${selected.length})`} variant="danger" onPress={() => setConfirmBulk(true)} disabled={busy || !selected.length} />
          )}
          <ActionButton title="Đăng xuất" variant="secondary" onPress={() => void logout()} disabled={busy} />
        </View>
        <View style={[styles.actions, styles.toolbar]}>
          {compact ? (
            <ActionButton
              title={`Giá: ${priceOrder === 'ascending' ? 'Tăng dần ↑' : priceOrder === 'descending' ? 'Giảm dần ↓' : 'Mặc định'} ↻`}
              accessibilityLabel="Đổi sắp xếp giá: mặc định, tăng dần, giảm dần"
              variant="secondary"
              disabled={loading || busy}
              onPress={() => {
                setPriceOrder(priceOrder === 'default' ? 'ascending' : priceOrder === 'ascending' ? 'descending' : 'default');
                setPage(1);
              }}
            />
          ) : <>
          <Text style={styles.description}>Sắp xếp:</Text>
          {([
            ['default', 'Mặc định'],
            ['ascending', 'Giá tăng dần ↑'],
            ['descending', 'Giá giảm dần ↓'],
          ] as const).map(([value, label]) => (
            <ActionButton
              key={value}
              title={label}
              accessibilityLabel={`${label}${priceOrder === value ? ', đang chọn' : ''}`}
              variant={priceOrder === value ? 'primary' : 'secondary'}
              disabled={loading || busy}
              onPress={() => { setPriceOrder(value); setPage(1); }}
            />
          ))}
          </>}
        </View>
        {selecting && selected.length > 0 && (
          <Text style={styles.pageInfo}>Đã chọn {selected.length} sản phẩm trên tất cả các trang.</Text>
        )}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {loading ? <ActivityIndicator accessibilityLabel="Đang tải danh sách" /> : (
          <FlatList
            key={`${currentPage}:${query}:${priceOrder}`}
            data={pageItems}
            extraData={selected}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={!error ? <Text style={styles.empty}>{query ? 'Không tìm thấy sản phẩm phù hợp.' : 'Chưa có sản phẩm nào. Chọn “Thêm mới” để bắt đầu.'}</Text> : undefined}
            renderItem={({ item }) => (
              <View style={[styles.card, compact && styles.mobileCard]}>
                {selecting && (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Chọn ${item.name}`}
                    accessibilityState={{ checked: selected.includes(item.id), disabled: busy }}
                    disabled={busy}
                    onPress={() => toggleSelection(item.id)}
                    style={styles.selectionControl}
                  >
                    <Text style={styles.selectionLabel}>{selected.includes(item.id) ? '☑' : '☐'}</Text>
                  </Pressable>
                )}
                <View style={[styles.productSummary, compact && styles.mobileSummary]}>
                  <View style={styles.productInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.description}>Giá: {item.price.toLocaleString('vi-VN')} ₫</Text>
                    <Text style={styles.description}>Số lượng: {item.soluong}</Text>
                  </View>
                  <View style={styles.productImage}>
                    <ItemImagePreview uri={item.image} />
                  </View>
                </View>
                {!selecting && <View style={[styles.actions, styles.productActions, compact && styles.mobileProductActions]}>
                  <ActionButton title="Sửa" accessibilityLabel={`Sửa ${item.name}`} onPress={() => open(item)} disabled={busy} />
                  <ActionButton title="Xóa" variant="danger" accessibilityLabel={`Xóa ${item.name}`} onPress={() => setRemoving(item)} disabled={busy} />
                </View>}
              </View>
            )}
          />
        )}
        {!loading && !error && filteredItems.length > 0 && (
          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, filteredItems.length)} / {filteredItems.length} sản phẩm
            </Text>
            <View style={[styles.actions, styles.toolbar]}>
              <ActionButton title="Trước" variant="secondary" accessibilityLabel="Trang trước" disabled={busy || currentPage === 1} onPress={() => setPage(currentPage - 1)} />
              <Text accessibilityLiveRegion="polite" style={styles.pageInfo}>Trang {currentPage} / {totalPages}</Text>
              <ActionButton title="Sau" variant="secondary" accessibilityLabel="Trang sau" disabled={busy || currentPage === totalPages} onPress={() => setPage(currentPage + 1)} />
            </View>
          </View>
        )}
      </View>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) setVisible(false); }}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.formDialog} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" accessibilityViewIsModal>
            <Text style={styles.cardTitle}>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
            <Text style={styles.label}>Tên *</Text>
            <TextInput accessibilityLabel="Tên" autoFocus value={title} onChangeText={setTitle} maxLength={120} editable={!busy} style={styles.input} placeholder="Nhập tên sản phẩm" placeholderTextColor="#667085" />
            <Text style={styles.label}>Giá *</Text>
            <TextInput accessibilityLabel="Giá" keyboardType="decimal-pad" value={price} onChangeText={setPrice} editable={!busy} style={styles.input} />
            <Text style={styles.label}>Số lượng *</Text>
            <TextInput accessibilityLabel="Số lượng" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} editable={!busy} style={styles.input} />
            <Text style={styles.label}>Ảnh *</Text>
            <ItemImagePicker currentUri={editing?.image} draft={image} onChange={setImage} disabled={busy} />
            {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
            <View style={[styles.actions, styles.dialogActions]}>
              <ActionButton title="Hủy" variant="secondary" onPress={() => setVisible(false)} disabled={busy} />
              <ActionButton title={busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm'} onPress={() => void submit()} disabled={busy} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={confirmBulk} transparent animationType="fade" onRequestClose={() => { if (!busy) setConfirmBulk(false); }}>
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={styles.cardTitle}>Xóa {selected.length} sản phẩm?</Text>
            <Text style={styles.description}>Các sản phẩm đã chọn sẽ bị xóa vĩnh viễn.</Text>
            <View style={[styles.actions, styles.dialogActions]}>
              <ActionButton title="Hủy" variant="secondary" onPress={() => setConfirmBulk(false)} disabled={busy} />
              <ActionButton title={busy ? 'Đang xóa…' : 'Xác nhận xóa'} variant="danger" onPress={() => void removeSelected()} disabled={busy} />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={!!removing} transparent animationType="fade" onRequestClose={() => { if (!busy) setRemoving(null); }}>
        <View style={styles.overlay}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={styles.cardTitle}>Xóa sản phẩm này?</Text>
            <Text style={styles.description}>“{removing?.name}” sẽ bị xóa vĩnh viễn.</Text>
            <View style={[styles.actions, styles.dialogActions]}>
              <ActionButton title="Hủy" variant="secondary" onPress={() => setRemoving(null)} disabled={busy} />
              <ActionButton title={busy ? 'Đang xóa…' : 'Xác nhận xóa'} variant="danger" onPress={() => void remove()} disabled={busy} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7fa' },
  mobileContent: { padding: 16, paddingBottom: 12, gap: 10 },
  mobileSearch: { flexBasis: '100%', maxWidth: '100%', flexGrow: 0 },
  mobileCard: { padding: 14, gap: 10 },
  mobileSummary: { flexBasis: 180, gap: 12 },
  mobileProductActions: { width: '100%', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eef2f6' },
  content: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center', padding: 24, gap: 16, paddingBottom: 90 },
  loginContent: { flex: 1, width: '100%', maxWidth: 420, alignSelf: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  loginTitle: { textAlign: 'center' },
  dialogActions: { justifyContent: 'flex-end' },
  searchInput: { flexGrow: 1, flexBasis: 160, maxWidth: 320, backgroundColor: '#fff' },
  toolbar: { alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  list: { gap: 16, paddingBottom: 24 },
  pagination: { gap: 8, alignItems: 'center' },
  pageInfo: { color: '#475467', textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e7ec', borderRadius: 16, padding: 20, gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  productSummary: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexShrink: 1, flexBasis: 220, gap: 16 },
  productInfo: { flex: 1, minWidth: 0, gap: 6 },
  productImage: { width: 96, flexShrink: 0 },
  selectionControl: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  selectionLabel: { fontSize: 24, color: '#175cd3' },
  productActions: { marginLeft: 'auto', alignSelf: 'flex-start', justifyContent: 'flex-end' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#101828' },
  description: { color: '#475467', lineHeight: 22 },
  empty: { color: '#667085', paddingVertical: 32, textAlign: 'center' },
  error: { color: '#b42318', lineHeight: 22 },
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 16 },
  label: { color: '#344054', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#98a2b3', borderRadius: 8, padding: 12, fontSize: 16, color: '#101828' },
  formDialog: { width: '100%', maxWidth: 520, maxHeight: '95%', flexGrow: 0, backgroundColor: '#fff', borderRadius: 20 },
  formContent: { padding: 24, gap: 12 },
});
