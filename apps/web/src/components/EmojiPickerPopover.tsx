'use client';

import { useState } from 'react';
import { Popover, UnstyledButton } from '@mantine/core';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerPopoverProps {
  value: string | null | undefined;
  onChange: (emoji: string) => void;
  size?: number;
}

export function EmojiPickerPopover({ value, onChange, size = 28 }: EmojiPickerPopoverProps) {
  const [opened, setOpened] = useState(false);

  const handleSelect = (emojiData: { native: string }) => {
    onChange(emojiData.native);
    setOpened(false);
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md">
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpened((o) => !o)}
          style={{
            fontSize: size,
            lineHeight: 1,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px solid var(--mantine-color-default-border)',
            cursor: 'pointer',
          }}
          aria-label="Pick emoji"
        >
          {value || '➕'}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p={0} style={{ border: 'none', background: 'none' }}>
        <Picker data={data} onEmojiSelect={handleSelect} theme="light" previewPosition="none" />
      </Popover.Dropdown>
    </Popover>
  );
}
