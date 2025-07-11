import type { Meta, StoryObj } from '@storybook/react';
import { UserProfileCard } from './UserProfileCard';
import { BrowserRouter } from 'react-router-dom';

const meta: Meta<typeof UserProfileCard> = {
  title: 'Profile/UserProfileCard',
  component: UserProfileCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ maxWidth: '800px', width: '100%' }}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  argTypes: {
    onEditProfile: { action: 'editProfile' },
  },
};

export default meta;
type Story = StoryObj<typeof UserProfileCard>;

export const CurrentUser: Story = {
  args: {
    userId: '123',
    username: 'GamerPro',
    avatarUrl: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Passionate gamer with a love for RPGs and strategy games. Always looking for new gaming experiences!',
    joinDate: 'January 2023',
    stats: {
      gamesPlayed: 87,
      gamesCompleted: 42,
      reviewsWritten: 36,
      averageRating: 8.4,
      achievements: 156,
      followers: 24,
      following: 36
    },
    isCurrentUser: true
  },
};

export const OtherUser: Story = {
  args: {
    userId: '456',
    username: 'GameMaster',
    avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Professional game reviewer and streamer. Follow me for the latest gaming news and reviews!',
    joinDate: 'March 2022',
    stats: {
      gamesPlayed: 124,
      gamesCompleted: 98,
      reviewsWritten: 112,
      averageRating: 7.9,
      achievements: 243,
      followers: 1250,
      following: 85
    },
    isCurrentUser: false
  },
};

export const NoAvatar: Story = {
  args: {
    userId: '789',
    username: 'NewGamer',
    bio: 'Just getting started with gaming. Looking for recommendations!',
    joinDate: 'June 2023',
    stats: {
      gamesPlayed: 12,
      gamesCompleted: 5,
      reviewsWritten: 3,
      averageRating: 8.0,
      achievements: 15,
      followers: 2,
      following: 10
    },
    isCurrentUser: true
  },
};