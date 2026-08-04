/**
 * src/utils/contacts.js
 * ─────────────────────────────────────────────────────────
 * Contacts permission + fetch utility for MANOJ TRADERS
 *
 * Exported functions:
 *  1. requestContactsPermissionOnce(userId) — OS prompt; re-asks periodically if denied
 *  2. getContactsPermissionStatus()         — check status silently
 *  3. resetContactsPermissionFlag(userId)   — reset one-time flag
 *  4. fetchAllContacts()                    — fetch after permission
 *  5. fetchContactsAfterPermission(userId)  — request + fetch combo
 *  6. searchContacts(query)                 — filter by name/phone
 * ─────────────────────────────────────────────────────────
 */

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Contacts     from 'react-native-contacts';

// ── Optional: uncomment when backend is ready ──
// import { syncContactsPermission } from '../api/users';

// AsyncStorage key — unique per userId so each account on a shared
// device gets its own re-ask schedule.
const flagKey = (userId) => `mt_contacts_asked_${userId}`;

// If a customer denies (including "never ask again"), re-prompt after this
// long in case it was a mistake — rather than never asking again, ever.
const RETRY_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

// ─────────────────────────────────────────────────────────
// 1. REQUEST PERMISSION (once per user, then re-ask periodically if denied)
// ─────────────────────────────────────────────────────────

/**
 * Requests READ_CONTACTS permission on Android. Once granted, never asks
 * again. If denied (by mistake or otherwise), re-prompts again after
 * RETRY_INTERVAL_MS so the customer gets another chance to allow it.
 *
 * iOS: react-native-contacts handles its own permission dialog
 * automatically on the first Contacts.getAll() call — this
 * function returns early on iOS without doing anything.
 *
 * @param {string} userId — logged-in user ID (e.g. 'user', 'ramkumar')
 * @returns {Promise<'granted'|'denied'|'never_ask_again'|'already_asked'>}
 */
export async function requestContactsPermissionOnce(userId) {
  if (!userId) return 'denied';

  if (Platform.OS !== 'android') return 'granted'; // iOS handles itself

  try {
    // Already asked before? Only skip re-asking if granted, or if the
    // retry window hasn't elapsed yet.
    const stored = await AsyncStorage.getItem(flagKey(userId));
    const record = stored ? JSON.parse(stored) : null;
    if (record) {
      if (record.status === PermissionsAndroid.RESULTS.GRANTED) return 'already_asked';
      if (Date.now() - record.askedAt < RETRY_INTERVAL_MS) return 'already_asked';
      // Retry window elapsed — fall through and prompt again.
    }

    // Show the OS permission dialog (or re-show it, if enough time passed)
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title:          'Contacts Permission',
        message:        'Manoj Traders को आपके contacts देखने की अनुमति चाहिए ताकि Admin customer sync कर सके।',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
        buttonNeutral:  'Ask Me Later',
      }
    );

    // Persist the result + timestamp so denied/never_ask_again re-prompt later
    await AsyncStorage.setItem(flagKey(userId), JSON.stringify({ status: result, askedAt: Date.now() }));

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('[Contacts] Permission GRANTED for user:', userId);
      await _syncToBackend(userId, 'granted');
      return 'granted';
    }

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      console.log('[Contacts] Permission PERMANENTLY DENIED for user:', userId);
      await _syncToBackend(userId, 'denied');
      Alert.alert(
        'Contacts Permission Blocked',
        'आपने contacts की अनुमति स्थायी रूप से बंद की है।\n\nAdmin sync के लिए Settings में जाकर Contacts permission चालू करें।',
        [
          { text: 'बाद में',        style: 'cancel' },
          { text: 'Settings खोलें', onPress: () => Linking.openSettings() },
        ],
        { cancelable: true }
      );
      return 'never_ask_again';
    }

    // DENIED (can ask again on re-install / data clear)
    console.log('[Contacts] Permission DENIED for user:', userId);
    await _syncToBackend(userId, 'denied');
    return 'denied';

  } catch (error) {
    console.warn('[Contacts] Permission request failed:', error.message);
    return 'denied';
  }
}

// ─────────────────────────────────────────────────────────
// 2. CHECK PERMISSION STATUS (no prompt)
// ─────────────────────────────────────────────────────────

/**
 * Returns the current contacts permission status WITHOUT prompting.
 * Safe to call at any time — useful for showing a badge in the UI.
 *
 * @returns {Promise<'granted'|'denied'|'unknown'>}
 */
export async function getContactsPermissionStatus() {
  if (Platform.OS !== 'android') return 'unknown';
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS
    );
    return granted ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

// ─────────────────────────────────────────────────────────
// 3. RESET ONE-TIME FLAG
// ─────────────────────────────────────────────────────────

/**
 * Clears the one-time flag for a userId.
 * Use when user revokes permission in Settings and re-opens the app.
 *
 * @param {string} userId
 */
export async function resetContactsPermissionFlag(userId) {
  if (!userId) return;
  await AsyncStorage.removeItem(flagKey(userId));
}

// ─────────────────────────────────────────────────────────
// 4. FETCH ALL CONTACTS
// ─────────────────────────────────────────────────────────

/**
 * Fetches ALL contacts from the device using react-native-contacts.
 *
 * Assumes permission is already granted before calling this.
 * Each returned contact is normalized to a clean, flat object
 * so the rest of the app doesn't have to deal with the raw
 * react-native-contacts schema.
 *
 * Raw contact schema from react-native-contacts:
 *  {
 *    recordID, displayName, givenName, familyName,
 *    phoneNumbers: [{ label, number }],
 *    emailAddresses: [{ label, email }],
 *    thumbnailPath, ...
 *  }
 *
 * Normalized output per contact:
 *  {
 *    id:        string   — recordID
 *    name:      string   — displayName or givenName + familyName
 *    phone:     string   — first mobile/main phone number (or '')
 *    email:     string   — first email address (or '')
 *    avatar:    string   — thumbnailPath (or '')
 *    raw:       object   — original react-native-contacts object
 *  }
 *
 * @returns {Promise<Array>} — sorted A→Z by name, empty array on error
 */
export async function fetchAllContacts() {
  try {
    let rawContacts = [];

    if (Platform.OS === 'ios') {
      // iOS: react-native-contacts triggers its own permission dialog
      // on the first call — no separate PermissionsAndroid needed.
      rawContacts = await Contacts.getAll();

    } else {
      // Android: verify permission before fetching
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      if (!granted) {
        console.warn('[Contacts] fetchAllContacts called without permission.');
        return [];
      }
      rawContacts = await Contacts.getAll();
    }

    // Normalize and sort A→Z by name
    const normalized = rawContacts
      .map(_normalizeContact)
      .filter((c) => c.name.trim().length > 0) // skip blank-name entries
      .sort((a, b) => a.name.localeCompare(b.name, 'hi'));

    console.log(`[Contacts] Fetched ${normalized.length} contacts.`);
    return normalized;

  } catch (error) {
    console.warn('[Contacts] fetchAllContacts failed:', error.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// 5. REQUEST PERMISSION THEN FETCH (convenience combo)
// ─────────────────────────────────────────────────────────

/**
 * Convenience function — requests permission (once) then immediately
 * fetches all contacts if permission was granted.
 *
 * Ideal for the DashboardScreen useEffect:
 *
 *   const contacts = await fetchContactsAfterPermission(user.userId);
 *
 * @param {string} userId
 * @returns {Promise<Array>} — normalized contacts, or [] if denied
 */
export async function fetchContactsAfterPermission(userId) {
  const status = await requestContactsPermissionOnce(userId);

  // 'granted'      → new grant, fetch now
  // 'already_asked'→ permission was asked before; check current state
  if (status === 'granted') {
    return fetchAllContacts();
  }

  if (status === 'already_asked') {
    // Check what the current state actually is
    const current = await getContactsPermissionStatus();
    if (current === 'granted') return fetchAllContacts();
  }

  // denied / never_ask_again / unknown → return empty
  return [];
}

// ─────────────────────────────────────────────────────────
// 6. SEARCH / FILTER CONTACTS
// ─────────────────────────────────────────────────────────

/**
 * Filters a contacts array by name or phone number.
 * Case-insensitive, works with both Hindi and English text.
 *
 * @param {Array}  contacts — output of fetchAllContacts()
 * @param {string} query    — search string
 * @returns {Array} — matching contacts
 */
export function searchContacts(contacts, query) {
  if (!query || !query.trim()) return contacts;
  const q = query.trim().toLowerCase();
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
  );
}

// ─────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Normalizes a single raw react-native-contacts object into the
 * flat shape used throughout Manoj Traders.
 */
function _normalizeContact(raw) {
  // Best available name
  const name =
    raw.displayName?.trim() ||
    [raw.givenName, raw.familyName].filter(Boolean).join(' ').trim() ||
    'Unknown';

  // First available phone number (prefer mobile)
  const phoneEntry =
    raw.phoneNumbers?.find((p) => p.label === 'mobile') ||
    raw.phoneNumbers?.[0];
  const phone = phoneEntry?.number?.replace(/[\s\-()]/g, '') || '';

  // First available email
  const email = raw.emailAddresses?.[0]?.email || '';

  return {
    id:     raw.recordID,
    name,
    phone,
    email,
    avatar: raw.thumbnailPath || '',
    raw,   // keep original for advanced use
  };
}

/**
 * Syncs the permission result to the Manoj Traders backend
 * so Admin can see each user's contacts permission status.
 */
async function _syncToBackend(userId, status) {
  try {
    // ── Uncomment when backend is ready ──
    // await syncContactsPermission(status);
    console.log(`[Contacts] Synced "${status}" to backend for user: ${userId}`);
  } catch (err) {
    console.warn('[Contacts] Backend sync failed:', err.message);
  }
}

