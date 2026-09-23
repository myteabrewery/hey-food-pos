import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "hey_food_pos_device_id";

/**
 * An opaque per-installation identifier, generated once and kept for the life
 * of the install. Sent as `deviceId` on every login (dev spec 5.5) — recorded
 * on the session, but NOT validated against any device registry (real device
 * binding, dev spec 5.5's other half, does not exist yet and is a
 * deliberately separate follow-up).
 *
 * NOT cryptographically random on purpose: this is not a secret and not a
 * credential, only something that distinguishes one tablet install from
 * another for a future device-management view — collision risk is
 * irrelevant to what it is used for, so `Math.random()` is fine and avoids
 * adding a crypto/uuid dependency for it.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;
  } catch {
    // SecureStore can throw (no keychain available, etc.) — fall through to a fresh, unpersisted id.
  }
  const generated = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  } catch {
    // Best-effort persistence: worst case, a new id is generated again next launch.
  }
  return generated;
}
