import type { SheetNotice } from '@/components/action-sheet';

/** A plain message with one OK button. */
export const info = (title: string, message: string): SheetNotice => ({
  title,
  message,
  cancelLabel: 'OK',
});

/** "Are you sure?" with a confirm button (red when it removes something) and a way back out. */
export const confirm = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}): SheetNotice => ({
  title,
  message,
  actions: [{ label: confirmLabel, destructive, onPress: onConfirm }],
  cancelLabel,
});
