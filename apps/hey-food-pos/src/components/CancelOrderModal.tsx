import { useEffect, useRef, useState } from "react";
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CancelReason } from "@hey-food/api-client";
import { BRAND_COLORS, DANGER_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import type { StaffCancelRequest } from "../orders/transitions";
import { CANCEL_REASON_OPTIONS } from "../orders/transitions";

export interface CancelOrderModalProps {
  displayId: string;
  onDismiss: () => void;
  onConfirm: (request: StaffCancelRequest) => void;
}

const MAX_DETAIL_LENGTH = 200;

/**
 * Cancel-with-reason confirmation (dev spec Section 5.2). The reason is
 * required and feeds HQ's cancellation reporting, so the destructive
 * button stays disabled until one is picked; the free-text field appears
 * only for "Other". This IS the design system's mandatory confirmation
 * step for destructive actions (Section 6), not a second dialog on top of
 * it — nothing is cancelled until "Cancel order" is tapped inside here.
 *
 * Mounted only while open (the parent renders it conditionally), so the
 * picked reason and typed text reset every time it opens instead of
 * leaking from a previous, dismissed attempt.
 *
 * "Other" with no text is allowed: api-client's CancelOrderRequest marks
 * `otherDetail` optional, and blocking a cancellation mid-rush on a
 * missing sentence costs more than the reporting detail is worth. Flagged.
 */
export function CancelOrderModal({ displayId, onDismiss, onConfirm }: CancelOrderModalProps) {
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [detail, setDetail] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // The Modal is statusBarTranslucent (full-screen), so a dialog tall enough to
  // fill the space above the keyboard would otherwise run under the status bar.
  const insets = useSafeAreaInsets();

  // Track the on-screen keyboard's real height. KeyboardAvoidingView does NOT
  // work here on Android: a Modal is its own window, which Android doesn't
  // resize for the keyboard, so the keyboard simply sat on top of the "Other"
  // text field and both buttons (seen on a real device). Instead the backdrop
  // gets bottom padding equal to the keyboard's height, so the dialog is laid
  // out in only the space above it. iOS reports "will" events early enough to
  // animate with the keyboard; Android only has "did".
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handleConfirm() {
    if (reason === null) {
      return;
    }
    const trimmed = detail.trim();
    onConfirm({
      actor: "staff",
      reason,
      ...(reason === "other" && trimmed ? { otherDetail: trimmed } : {}),
    });
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View
        style={[
          styles.backdrop,
          { paddingTop: posSpacing.tapPaddingPx + insets.top, paddingBottom: posSpacing.tapPaddingPx + keyboardHeight },
        ]}
      >
        <View style={styles.dialog}>
          {/* Only the reasons + text field scroll. Keep/Cancel sit below, outside
              the scroll area, so they stay on screen above the keyboard however
              short the remaining space is. When the text field appears the list
              scrolls to the end, so the field is the thing in view. */}
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.dialogContent}
            onContentSizeChange={() => {
              if (reason === "other") {
                scrollRef.current?.scrollToEnd({ animated: true });
              }
            }}
          >
            <Text style={styles.title}>Cancel order #{displayId}?</Text>
            <Text style={styles.subtitle}>Pick a reason. This is reported to HQ.</Text>

            <View style={styles.reasons} accessibilityRole="radiogroup">
              {CANCEL_REASON_OPTIONS.map((option) => {
                const selected = reason === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                    onPress={() => setReason(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={option.label}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.reasonText}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {reason === "other" && (
              <TextInput
                style={styles.detailInput}
                value={detail}
                onChangeText={setDetail}
                placeholder="What happened? (optional)"
                placeholderTextColor={BRAND_COLORS.muted}
                multiline
                maxLength={MAX_DETAIL_LENGTH}
                accessibilityLabel="Other reason details"
                autoFocus
              />
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.keepButton, pressed && styles.keepButtonPressed]}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Keep order"
            >
              <Text style={styles.keepButtonText}>KEEP ORDER</Text>
            </Pressable>

            <Pressable
              style={[styles.cancelButton, reason === null && styles.cancelButtonDisabled]}
              onPress={handleConfirm}
              disabled={reason === null}
              accessibilityRole="button"
              accessibilityState={{ disabled: reason === null }}
              accessibilityLabel={`Cancel order ${displayId}`}
            >
              <Text style={styles.cancelButtonText}>CANCEL ORDER</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: posSpacing.tapPaddingPx,
  },
  dialog: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "100%",
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
  },
  dialogContent: {
    padding: posSpacing.tapPaddingPx,
    gap: SPACING_SCALE[2], // 12px
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  reasons: {
    gap: SPACING_SCALE[1], // 8px
  },
  reasonRow: {
    minHeight: MIN_TAP_TARGET_PX.pos,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[2], // 12px
    paddingHorizontal: SPACING_SCALE[2], // 12px
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.line,
  },
  reasonRowSelected: {
    borderColor: DANGER_COLORS.solid,
    backgroundColor: DANGER_COLORS.tint,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: BRAND_COLORS.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: DANGER_COLORS.solid,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: DANGER_COLORS.solid,
  },
  reasonText: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  detailInput: {
    minHeight: MIN_TAP_TARGET_PX.pos * 2,
    borderWidth: 2,
    borderColor: BRAND_COLORS.line,
    borderRadius: RADIUS.md,
    padding: SPACING_SCALE[2], // 12px
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING_SCALE[2], // 12px
    paddingHorizontal: posSpacing.tapPaddingPx,
    paddingBottom: posSpacing.tapPaddingPx,
    paddingTop: SPACING_SCALE[1], // 8px
  },
  keepButton: {
    flex: 1,
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  keepButtonPressed: {
    backgroundColor: BRAND_COLORS.soft,
  },
  keepButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
    letterSpacing: 0.5,
  },
  cancelButton: {
    flex: 1,
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    backgroundColor: DANGER_COLORS.solid,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonDisabled: {
    opacity: 0.4,
  },
  cancelButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
  },
});
