import type { Meta, StoryObj } from '@storybook/react';
import { UserDashboard } from './UserDashboard';
import { BrowserRouter } from 'react-router-dom';

// Sample data for demonstration
const sampleActivity = [
  {
    id: '1',
    type: 'review' as const,
    gameId: '1',
    gameTitle: 'The Witcher 3: Wild Hunt',
    gameCover: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '2 days ago',
    rating: 9.5
  },
  {
    id: '2',
    type: 'completed' as const,
    gameId: '2',
    gameTitle: 'Cyberpunk 2077',
    gameCover: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '1 week ago'
  },
  {
    id: '3',
    type: 'achievement' as const,
    gameId: '3',
    gameTitle: 'Elden Ring',
    gameCover: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '2 weeks ago',
    achievementName: 'Master of Blades'
  },
  {
    id: '4',
    type: 'wishlist' as const,
    gameId: '4',
    gameTitle: 'God of War Ragnarök',
    gameCover: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '3 weeks ago'
  },
  {
    id: '5',
    type: 'started' as const,
    gameId: '5',
    gameTitle: 'Horizon Forbidden West',
    gameCover: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '1 month ago'
  },
  {
    id: '6',
    type: 'rating' as const,
    gameId: '6',
    gameTitle: 'Hades',
    gameCover: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '1 month ago',
    rating: 9.0
  }
];

const sampleFavoriteGames = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    coverUrl: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 9.5
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    coverUrl: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 7.8
  },
  {
    id: '3',
    title: 'Elden Ring',
    coverUrl: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 9.7
  },
  {
    id: '4',
    title: 'God of War Ragnarök',
    coverUrl: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 9.2
  }
];

const meta: Meta<typeof UserDashboard> = {
  title: 'Profile/UserDashboard',
  component: UserDashboard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="bg-gray-900 p-4">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  argTypes: {
    onLogout: { action: 'logout' },
  },
};

export default meta;
type Story = StoryObj<typeof UserDashboard>;

export const Default: Story = {
  args: {
    user: {
      id: '123',
      username: 'GamerPro',
      avatarUrl: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
      bio: 'Passionate gamer with a love for RPGs and strategy games. Always looking for new gaming experiences!',
      joinDate: 'January 2023'
    },
    stats: {
      gamesPlayed: 87,
      gamesCompleted: 42,
      reviewsWritten: 36,
      averageRating: 8.4,
      achievements: 156,
      followers: 24,
      following: 36
    },
    recentActivity: sampleActivity,
    favoriteGames: sampleFavoriteGames
  },
};

export const ActivityTab: Story = {
  args: {
    ...Default.args,
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement as HTMLElement;
    const activityTab = canvas.querySelector('button:has-text("Activity")');
    if (activityTab) {
      activityTab.click();
    }
  },
};

export const GamesTab: Story = {
  args: {
    ...Default.args,
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement as HTMLElement;
    const gamesTab = canvas.querySelector('button:has-text("Games")');
    if (gamesTab) {
      gamesTab.click();
    }
  },
};

export const SettingsTab: Story = {
  args: {
    ...Default.args,
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement as HTMLElement;
    const settingsTab = canvas.querySelector('button:has-text("Settings")');
    if (settingsTab) {
      settingsTab.click();
    }
  },
};