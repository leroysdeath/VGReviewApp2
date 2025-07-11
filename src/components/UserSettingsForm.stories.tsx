import type { Meta, StoryObj } from '@storybook/react';
import { UserSettingsForm } from './UserSettingsForm';

const meta: Meta<typeof UserSettingsForm> = {
  title: 'Profile/UserSettingsForm',
  component: UserSettingsForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSave: { action: 'saved' },
  },
};

export default meta;
type Story = StoryObj<typeof UserSettingsForm>;

export const Default: Story = {
  args: {
    user: {
      username: 'GamerPro',
      email: 'gamer@example.com',
      bio: 'Passionate gamer with a love for RPGs and strategy games. Always looking for new gaming experiences!',
      avatarUrl: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  },
};

export const WithoutAvatar: Story = {
  args: {
    user: {
      username: 'NewGamer',
      email: 'newgamer@example.com',
      bio: 'Just getting started with gaming. Looking for recommendations!'
    }
  },
};

export const WithError: Story = {
  args: {
    user: {
      username: 'GamerPro',
      email: 'gamer@example.com',
      bio: 'Passionate gamer with a love for RPGs and strategy games.'
    }
  },
  render: (args) => (
    <UserSettingsForm
      {...args}
      onSave={async () => {
        throw new Error('Failed to save settings');
      }}
    />
  ),
};

export const WithSuccess: Story = {
  args: {
    user: {
      username: 'GamerPro',
      email: 'gamer@example.com',
      bio: 'Passionate gamer with a love for RPGs and strategy games.'
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement as HTMLElement;
    const currentPasswordInput = canvas.querySelector('input[id="currentPassword"]') as HTMLInputElement;
    if (currentPasswordInput) {
      currentPasswordInput.value = 'password123';
      currentPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    const saveButton = canvas.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (saveButton) {
      saveButton.click();
    }
  },
};