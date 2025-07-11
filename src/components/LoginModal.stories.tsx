import type { Meta, StoryObj } from '@storybook/react';
import { LoginModal } from './LoginModal';

const meta: Meta<typeof LoginModal> = {
  title: 'Authentication/LoginModal',
  component: LoginModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
    onLoginSuccess: { action: 'login success' },
  },
};

export default meta;
type Story = StoryObj<typeof LoginModal>;

export const Login: Story = {
  args: {
    isOpen: true,
  },
};

export const Signup: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement as HTMLElement;
    const signupLink = canvas.querySelector('button:has-text("Sign up")');
    if (signupLink) {
      signupLink.click();
    }
  },
};

export const WithError: Story = {
  args: {
    isOpen: true,
  },
  render: (args) => (
    <LoginModal
      {...args}
      onLoginSuccess={() => {
        throw new Error('Login failed');
      }}
    />
  ),
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};