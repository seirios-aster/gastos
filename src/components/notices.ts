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

/** Asked before deleting the picked expenses; the Undo toast can bring them all back. */
export const confirmDeleteExpenses = (count: number, onConfirm: () => void): SheetNotice =>
  confirm({
    title: count === 1 ? 'Delete this expense?' : `Delete ${count} expenses?`,
    message: 'You can undo this for a few seconds afterwards.',
    confirmLabel: count === 1 ? 'Delete' : `Delete ${count}`,
    cancelLabel: 'Keep them',
    destructive: true,
    onConfirm,
  });

/** Asked before stopping the picked recurring items. There is no undo, but nothing logged is lost. */
export const confirmStopRecurring = (count: number, onConfirm: () => void): SheetNotice =>
  confirm({
    title: count === 1 ? 'Stop this recurring expense?' : `Stop ${count} recurring expenses?`,
    message: 'Expenses already logged stay in your history.',
    confirmLabel: 'Stop repeating',
    cancelLabel: 'Keep them',
    destructive: true,
    onConfirm,
  });

/** Asked before deleting a loan; its payments go with it and there is no undo. */
export const confirmDeleteLoan = (person: string, onConfirm: () => void): SheetNotice =>
  confirm({
    title: 'Delete this loan?',
    message: `The loan with ${person} and every payment on it will be removed.`,
    confirmLabel: 'Delete loan',
    cancelLabel: 'Keep it',
    destructive: true,
    onConfirm,
  });

/** Asked before removing a recorded payment, which raises the loan's balance again. */
export const confirmRemovePayment = (onConfirm: () => void): SheetNotice =>
  confirm({
    title: 'Remove this payment?',
    message: 'The amount goes back onto what is still owed.',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep it',
    destructive: true,
    onConfirm,
  });
