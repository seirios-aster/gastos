import { useState } from 'react';

import type { SheetNotice } from '@/components/action-sheet';

/**
 * State for a message or confirmation shown in an ActionSheet. Spread `sheetProps` onto the
 * <ActionSheet>. The text is kept after closing so the sheet doesn't go blank while it fades out.
 */
export function useSheetNotice() {
  const [notice, setNotice] = useState<SheetNotice | null>(null);
  const [open, setOpen] = useState(false);

  return {
    notify: (next: SheetNotice) => {
      setNotice(next);
      setOpen(true);
    },
    sheetProps: {
      visible: open,
      title: notice?.title ?? '',
      message: notice?.message,
      actions: notice?.actions ?? [],
      cancelLabel: notice?.cancelLabel,
      onClose: () => setOpen(false),
    },
  };
}
