import { useState } from 'react';

import { Segmented } from '@/components/segmented';
import { Section } from '@/components/settings/section';
import {
  savedThemeSetting,
  setThemeSetting,
  type ThemeSetting,
} from '@/lib/theme-preference';

/** Light, dark, or whatever the phone is set to. The moon/sun button in the header flips it fast. */
export function AppearanceSection() {
  const [setting, setSetting] = useState<ThemeSetting>(savedThemeSetting);

  return (
    <Section
      title="Appearance"
      hint="System follows your phone. The moon and sun button at the top switches it any time.">
      <Segmented
        accessibilityLabel="Appearance"
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={setting}
        onChange={(next) => {
          setSetting(next);
          setThemeSetting(next);
        }}
      />
    </Section>
  );
}
