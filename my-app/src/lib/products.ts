export type ProductData = { name: string; price: number; soluong: number; image: string };
export type Product = ProductData & { id: string };

export const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const sessionKey = `crud-admin-session:${apiUrl}`;

function readToken() {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage.getItem(sessionKey) ?? undefined;
  } catch {
    return undefined;
  }
}

let token = readToken();

export function hasAdminSession() {
  return !!token;
}

function setToken(value?: string) {
  token = value;
  if (typeof window === 'undefined') return;
  try {
    if (value) window.sessionStorage.setItem(sessionKey, value);
    else window.sessionStorage.removeItem(sessionKey);
  } catch {
    // Keep the in-memory session when storage is unavailable.
  }
}

export class AdminSessionExpired extends Error {}

async function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  if (!apiUrl) throw new Error('Thiếu cấu hình API.');
  const response = await fetch(new URL(path, apiUrl), {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (response.status === 401 && path !== '/login') {
    setToken();
    throw new AdminSessionExpired('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Yêu cầu thất bại.');
  return result as T;
}

export async function loginAdmin(email: string, password: string) {
  const result = await request<{ token: string }>('/login', 'POST', { email, password });
  setToken(result.token);
}

export async function logoutAdmin() {
  try { await request<void>('/logout', 'POST'); }
  finally { setToken(); }
}

export const listProducts = () => request<Product[]>('/products');
export const saveProduct = (data: ProductData, id?: string) =>
  request<Product>(id ? `/products/${id}` : '/products', id ? 'PUT' : 'POST', data);
export const deleteProduct = (id: string) => request<void>(`/products/${id}`, 'DELETE');

export const deleteProducts = (ids: string[]) => request<void>('/products/bulk-delete', 'POST', { ids });
