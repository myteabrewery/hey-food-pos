import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OutletRef } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { loginStaff } from "../api/auth";
import { PosApiError } from "../api/http";
import { getOrCreateDeviceId } from "../session/device-id";
import type { PosSession } from "../session/session-store";

export interface LoginScreenProps {
  onLoggedIn: (session: PosSession) => void;
}

const PIN_LENGTH = 6;
const KEYPAD_ROWS: Array<Array<string | null>> = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [null, "0", "back"],
];

type Stage =
  | { kind: "pin" }
  | { kind: "chooseOutlet"; pin: string; deviceId: string; outlets: OutletRef[] };

/**
 * Real staff PIN login (dev spec 5.5), replacing the old one-button demo
 * stub. A bold numeric keypad, no staff picker: the login contract is just
 * `{ businessId, pin, deviceId }` — the PIN alone identifies the person
 * business-wide (packages/api-client/src/auth.ts), so there is nothing else
 * to pick before typing it.
 *
 * `outlet_staff` (exactly one assigned outlet) and most `area_manager`s go
 * straight through on a correct PIN. An `area_manager` with MORE than one
 * assigned outlet gets a second screen (`chooseOutlet`) — a deliberate,
 * narrow deviation from "the device knows its outlet" (dev spec 5.5): that
 * assumption depends on real device binding, which doesn't exist yet. The
 * SAME PIN is resubmitted with the chosen outlet, never re-typed.
 * `hq_admin` is rejected outright with a message pointing at the HQ app —
 * that role's device is the web dashboard (blueprint's own device table),
 * not POS.
 */
export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>({ kind: "pin" });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (enteredPin: string, outletId?: string) => {
      setBusy(true);
      setError(null);
      try {
        const deviceId = await getOrCreateDeviceId();
        const result = await loginStaff(enteredPin, deviceId, outletId);
        if (result.status === "choose_outlet") {
          setStage({ kind: "chooseOutlet", pin: enteredPin, deviceId, outlets: result.outlets });
          setPin("");
          return;
        }
        onLoggedIn({
          token: result.token,
          staffId: result.staff.id,
          staffName: result.staff.name,
          role: result.staff.role,
          outletId: result.outlet.id,
          outletName: result.outlet.name,
        });
      } catch (caught) {
        setError(describeLoginFailure(caught));
        setPin("");
        setStage({ kind: "pin" });
      } finally {
        setBusy(false);
      }
    },
    [onLoggedIn],
  );

  function handleDigit(digit: string) {
    if (busy || stage.kind !== "pin") return;
    setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  }

  function handleBackspace() {
    if (busy) return;
    setPin((current) => current.slice(0, -1));
  }

  function handleChooseOutlet(outletId: string) {
    if (busy || stage.kind !== "chooseOutlet") return;
    void submit(stage.pin, outletId);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>HEY FOOD</Text>
        <Text style={styles.productName}>OUTLET POS</Text>

        {stage.kind === "pin" ? (
          <>
            <View style={styles.dotsRow} accessibilityLabel={`PIN entry, ${pin.length} of ${PIN_LENGTH} digits`}>
              {Array.from({ length: PIN_LENGTH }, (_, index) => (
                <View key={index} style={[styles.dot, index < pin.length && styles.dotFilled]} />
              ))}
            </View>
            {error && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
            )}
            {busy && <Text style={styles.stubCaption}>Checking…</Text>}

            <View style={styles.keypad}>
              {KEYPAD_ROWS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key, keyIndex) =>
                    key === null ? (
                      <View key={keyIndex} style={styles.keypadKey} />
                    ) : key === "back" ? (
                      <Pressable
                        key={keyIndex}
                        style={({ pressed }) => [styles.keypadKey, styles.backspaceKey, pressed && styles.keypadKeyPressed]}
                        onPress={handleBackspace}
                        disabled={busy || pin.length === 0}
                        accessibilityRole="button"
                        accessibilityLabel="Backspace"
                      >
                        <Text style={styles.backspaceText}>⌫</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        key={keyIndex}
                        style={({ pressed }) => [styles.keypadKey, pressed && styles.keypadKeyPressed]}
                        onPress={() => handleDigit(key)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Digit ${key}`}
                      >
                        <Text style={styles.keypadText}>{key}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.outletPicker}>
            <Text style={styles.outletPickerPrompt}>Which outlet is this device for right now?</Text>
            {stage.outlets.map((outlet) => (
              <Pressable
                key={outlet.id}
                style={({ pressed }) => [styles.outletButton, pressed && styles.outletButtonPressed]}
                onPress={() => handleChooseOutlet(outlet.id)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={outlet.name}
              >
                <Text style={styles.outletButtonText}>{outlet.name}</Text>
              </Pressable>
            ))}
            <Text style={styles.stubCaption}>
              Asked once per login, until this device is permanently bound to an outlet.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** A PosApiError from the login call, as a message a staff member glancing at the tablet can act on. */
function describeLoginFailure(caught: unknown): string {
  if (caught instanceof PosApiError) {
    if (caught.status === 0) return "Can't reach the server. Check the connection and try again.";
    return caught.message; // "Incorrect PIN.", "This account has been deactivated...", "HQ Admins should use...", etc. — all already staff-facing text.
  }
  return "Something went wrong. Try again.";
}

const posSpacing = SPACING_BY_APP.pos;
// Local to this screen only: a light red readable on the navy background.
// DANGER_COLORS (design-tokens) is tuned for light surfaces (e.g. the Cancel
// dialog), not this one — not a new shared token, just this screen's choice.
const ERROR_TEXT_COLOR = "#FCA5A5";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingHorizontal: posSpacing.tapPaddingPx,
  },
  wordmark: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.display.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 1,
  },
  productName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "700",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 2,
    marginTop: SPACING_SCALE[0], // 4px
  },
  dotsRow: {
    flexDirection: "row",
    gap: SPACING_SCALE[3], // 16px
    marginTop: SPACING_SCALE[6], // 48px
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BRAND_COLORS.onNavyMuted,
  },
  dotFilled: {
    backgroundColor: BRAND_COLORS.teal,
    borderColor: BRAND_COLORS.teal,
  },
  errorText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "700",
    color: ERROR_TEXT_COLOR,
    textAlign: "center",
    marginTop: SPACING_SCALE[3], // 16px
  },
  stubCaption: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
    marginTop: SPACING_SCALE[2], // 12px
    textAlign: "center",
  },
  keypad: {
    marginTop: SPACING_SCALE[6], // 48px
    gap: SPACING_SCALE[3], // 16px
    width: "100%",
  },
  keypadRow: {
    flexDirection: "row",
    gap: SPACING_SCALE[3], // 16px
  },
  keypadKey: {
    flex: 1,
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.onNavyMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyPressed: {
    backgroundColor: BRAND_COLORS.teal,
    borderColor: BRAND_COLORS.teal,
  },
  keypadText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.display.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
  },
  backspaceKey: {
    borderColor: "transparent",
  },
  backspaceText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.onNavyMuted,
  },
  outletPicker: {
    marginTop: SPACING_SCALE[6], // 48px
    width: "100%",
    gap: SPACING_SCALE[3], // 16px
  },
  outletPickerPrompt: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "700",
    color: BRAND_COLORS.white,
    textAlign: "center",
    marginBottom: SPACING_SCALE[2], // 12px
  },
  outletButton: {
    width: "100%",
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: posSpacing.tapPaddingPx,
  },
  outletButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  outletButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
  },
});
