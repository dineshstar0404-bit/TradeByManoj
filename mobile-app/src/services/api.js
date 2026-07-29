/**
 * src/services/api.js  (Task 5)
 * ─────────────────────────────────────────────────────────
 * API service for MANOJ TRADERS mobile app.
 *
 * Sends the device contacts array to the backend server via
 * POST https://myserver.com/api/uploadContacts
 *
 * Usage after fetchContactsAfterPermission():
 *
 *   import { uploadContacts } from './services/api';
 *   const result = await uploadContacts(user.userId, contacts);
 * ─────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Base URL — change to your real server before deploying ────────
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://myserver.com';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Retrieve the JWT token stored after login */
const getToken = async () => {
  try {
    return await AsyncStorage.getItem('mt_token');
  } catch {
    return null;
  }
};

/**
 * Generic fetch wrapper with:
 *  - automatic Authorization header from AsyncStorage
 *  - JSON request/response handling
 *  - consistent error shape
 */
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
    // Throw a clean error using the server's message
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

// ─────────────────────────────────────────────────────────────────
// TASK 5 — POST /api/uploadContacts
// ─────────────────────────────────────────────────────────────────

/**
 * Uploads the device contacts array to the backend.
 *
 * Called after fetchContactsAfterPermission() returns contacts.
 * The backend (contacts.js route — Task 6) saves them in MongoDB
 * linked to the userId.
 *
 * @param {string} userId   — logged-in user's ID (e.g. 'user', 'ramkumar')
 * @param {Array}  contacts — output of fetchAllContacts() from contacts.js
 *                            Each item: { id, name, phone, email, avatar, raw }
 *
 * @returns {Promise<{ success, message, userId, totalSaved, lastUpdated }>}
 *
 * @example
 *   const contacts = await fetchContactsAfterPermission(user.userId);
 *   if (contacts.length > 0) {
 *     const result = await uploadContacts(user.userId, contacts);
 *     console.log(`Uploaded ${result.totalSaved} contacts`);
 *   }
 */
export const uploadContacts = async (userId, contacts) => {
  if (!userId)            throw new Error('userId is required');
  if (!Array.isArray(contacts)) throw new Error('contacts must be an array');

  // Strip the raw field (large, not needed by server) before sending
  const sanitized = contacts.map(({ id, name, phone, email, avatar }) => ({
    id, name, phone, email, avatar,
  }));

  console.log(`[API] Uploading ${sanitized.length} contacts for user: ${userId}`);

  const result = await request('/api/uploadContacts', {
    method: 'POST',
    body:   JSON.stringify({ userId, contacts: sanitized }),
  });

  console.log(`[API] Upload success — ${result.totalSaved} contacts saved.`);
  return result;
};

// ─────────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────

/** POST /api/auth/login */
export const login = (userId, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) });

/** GET /api/auth/me */
export const getMe = () => request('/api/auth/me');

/** PUT /api/users/me/password — self-service password change */
export const changeMyPassword = (currentPassword, newPassword) =>
  request('/api/users/me/password', {
    method: 'PUT',
    body:   JSON.stringify({ currentPassword, newPassword }),
  });

/** POST /api/auth/admin-reset-password */
export const adminResetPassword = (recoveryKey, newPassword) =>
  request('/api/auth/admin-reset-password', {
    method: 'POST',
    body:   JSON.stringify({ recoveryKey, newPassword }),
  });

/** GET /api/auth/recovery-key — admin-only, requires an active logged-in session */
export const getRecoveryKeyHint = () => request('/api/auth/recovery-key');

// ─────────────────────────────────────────────────────────────────
// ITEMS (STOCK)
// ─────────────────────────────────────────────────────────────────

export const getItems   = ()                 => request('/api/items');
export const createItem = (payload)          => request('/api/items', { method: 'POST', body: JSON.stringify(payload) });
export const updateItem = (id, payload)      => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteItem = (id)               => request(`/api/items/${id}`, { method: 'DELETE' });

// ─────────────────────────────────────────────────────────────────
// BILLS
// ─────────────────────────────────────────────────────────────────

export const getBills   = (params = {})  => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/bills${qs ? '?' + qs : ''}`);
};
export const getBill    = (id)           => request(`/api/bills/${id}`);
export const deleteBill = (id)           => request(`/api/bills/${id}`, { method: 'DELETE' });

/**
 * Create bill — supports JSON body (Drive link) or multipart (photo upload).
 * For camera/gallery photo: pass a photoAsset object from expo-image-picker.
 */
export const createBill = async (payload, photoAsset = null) => {
  if (photoAsset) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) =>
      form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    );
    form.append('photo', {
      uri:  photoAsset.uri,
      name: photoAsset.fileName || 'bill.jpg',
      type: photoAsset.mimeType || 'image/jpeg',
    });
    const token = await getToken();
    const res   = await fetch(`${BASE_URL}/api/bills`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Bill creation failed');
    return data;
  }
  return request('/api/bills', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateBill = async (id, payload, photoAsset = null) => {
  if (photoAsset) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) =>
      form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    );
    form.append('photo', { uri: photoAsset.uri, name: photoAsset.fileName || 'bill.jpg', type: photoAsset.mimeType || 'image/jpeg' });
    const token = await getToken();
    const res   = await fetch(`${BASE_URL}/api/bills/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form });
    const data  = await res.json();
    if (!res.ok) throw new Error(data.message || 'Bill update failed');
    return data;
  }
  return request(`/api/bills/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

// ─────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────

export const getUsers             = ()             => request('/api/users');
export const createUser           = (payload)      => request('/api/users', { method: 'POST', body: JSON.stringify(payload) });
export const updateUser           = (id, payload)  => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const getUserContact       = (id)           => request(`/api/users/${id}/contact`);
export const getMyProfile         = ()             => request('/api/users/me/profile');
export const syncContactsPermission = (status)     => request('/api/users/me/contacts-permission', { method: 'PUT', body: JSON.stringify({ status }) });
export const updateContactVisibility = (id, vis)   => request(`/api/users/${id}/contact-visibility`, { method: 'PUT', body: JSON.stringify({ contactVisibility: vis }) });

// ─────────────────────────────────────────────────────────────────
// TRANSACTIONS & REPORTS
// ─────────────────────────────────────────────────────────────────

export const getTransactions = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/transactions${qs ? '?' + qs : ''}`);
};

export const getReport = (period, customer) => {
  const qs = new URLSearchParams({ period, ...(customer ? { customer } : {}) }).toString();
  return request(`/api/reports?${qs}`);
};
