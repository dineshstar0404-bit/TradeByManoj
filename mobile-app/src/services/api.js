import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Prefer an explicit build-time URL, then the URL configured in app.json.
// This avoids shipping builds that silently send every request to myserver.com.
const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'https://trade-by-manoj.vercel.app'
).replace(/\/+$/, '');

const getToken = async () => {
  try {
    return await AsyncStorage.getItem('mt_token');
  } catch {
    return null;
  }
};

const request = async (endpoint, options = {}) => {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const uploadContacts = async (userId, contacts) => {
  if (!userId) throw new Error('userId is required');
  if (!Array.isArray(contacts)) throw new Error('contacts must be an array');

  const sanitized = contacts.map(({ id, name, phone, email, avatar }) => ({
    id, name, phone, email, avatar,
  }));

  return request('/api/uploadContacts', {
    method: 'POST',
    body: JSON.stringify({ userId, contacts: sanitized }),
  });
};

export const login = (userId, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) });
export const getMe = () => request('/api/auth/me');
export const changeMyPassword = (currentPassword, newPassword) =>
  request('/api/users/me/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
export const adminResetPassword = (recoveryKey, newPassword) =>
  request('/api/auth/admin-reset-password', {
    method: 'POST',
    body: JSON.stringify({ recoveryKey, newPassword }),
  });
export const getRecoveryKeyHint = () => request('/api/auth/recovery-key');

export const getItems = () => request('/api/items');
export const createItem = (payload) => request('/api/items', { method: 'POST', body: JSON.stringify(payload) });
export const updateItem = (id, payload) => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteItem = (id) => request(`/api/items/${id}`, { method: 'DELETE' });

export const getBills = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/bills${qs ? `?${qs}` : ''}`);
};
export const getBill = (id) => request(`/api/bills/${id}`);
export const deleteBill = (id) => request(`/api/bills/${id}`, { method: 'DELETE' });

export const createBill = async (payload, photoAsset = null) => {
  if (!photoAsset) return request('/api/bills', { method: 'POST', body: JSON.stringify(payload) });

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) =>
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  );
  form.append('photo', {
    uri: photoAsset.uri,
    name: photoAsset.fileName || 'bill.jpg',
    type: photoAsset.mimeType || 'image/jpeg',
  });
  const token = await getToken();
  const response = await fetch(`${BASE_URL}/api/bills`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Bill creation failed');
  return data;
};

export const updateBill = async (id, payload, photoAsset = null) => {
  if (!photoAsset) return request(`/api/bills/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) =>
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  );
  form.append('photo', {
    uri: photoAsset.uri,
    name: photoAsset.fileName || 'bill.jpg',
    type: photoAsset.mimeType || 'image/jpeg',
  });
  const token = await getToken();
  const response = await fetch(`${BASE_URL}/api/bills/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Bill update failed');
  return data;
};

export const addBillPayment = (billId, payload) =>
  request(`/api/bills/${billId}/payments`, { method: 'POST', body: JSON.stringify(payload) });
export const removeBillPayment = (billId, paymentId) =>
  request(`/api/bills/${billId}/payments/${paymentId}`, { method: 'DELETE' });

export const getBillNumberSettings = () => request('/api/settings/bill-number');
export const updateBillNumberSettings = (payload) =>
  request('/api/settings/bill-number', { method: 'PUT', body: JSON.stringify(payload) });

export const getUsers = () => request('/api/users');
export const createUser = (payload) => request('/api/users', { method: 'POST', body: JSON.stringify(payload) });
export const updateUser = (id, payload) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const getUserContact = (id) => request(`/api/users/${id}/contact`);
export const getMyProfile = () => request('/api/users/me/profile');
export const syncContactsPermission = (status) =>
  request('/api/users/me/contacts-permission', { method: 'PUT', body: JSON.stringify({ status }) });
export const updateContactVisibility = (id, visibility) =>
  request(`/api/users/${id}/contact-visibility`, {
    method: 'PUT',
    body: JSON.stringify({ contactVisibility: visibility }),
  });

export const getTransactions = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/transactions${qs ? `?${qs}` : ''}`);
};

export const getReport = (period, customer) => {
  const qs = new URLSearchParams({ period, ...(customer ? { customer } : {}) }).toString();
  return request(`/api/reports?${qs}`);
};
