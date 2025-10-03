/**
 * Release Status Utility
 *
 * Provides functions to determine game release status from IGDB data
 *
 * Status codes from IGDB:
 * 0 = Released
 * 1 = Alpha
 * 2 = Beta
 * 3 = Early Access
 * 4 = Offline
 * 5 = Cancelled
 * 6 = Rumored
 * 7 = Delisted
 */

export type ReleaseStatus = 'released' | 'unreleased' | null;

interface ReleaseDateInfo {
  platform?: number;
  status?: number;
  date?: number;
  human?: string;
}

interface GameWithReleaseDates {
  release_dates?: ReleaseDateInfo[] | null;
}

/**
 * Get release status from IGDB game data
 * @param game - Game object with release_dates from IGDB API
 * @returns 'released' | 'unreleased' | null
 */
export function getReleaseStatus(game: GameWithReleaseDates): ReleaseStatus {
  // No release_dates data -> unknown (NULL)
  if (!game.release_dates || game.release_dates.length === 0) {
    return null;
  }

  // Check if ANY release is released/in-development (0, 1, 2, 3)
  // Status 4 (Offline) is excluded - treat as unreleased
  const hasRelease = game.release_dates.some(rd =>
    rd.status === 0 || rd.status === 1 || rd.status === 2 || rd.status === 3
  );

  return hasRelease ? 'released' : 'unreleased';
}

/**
 * Get human-readable release status label
 */
export function getReleaseStatusLabel(status: ReleaseStatus): string {
  switch (status) {
    case 'released':
      return 'Released';
    case 'unreleased':
      return 'Unreleased';
    case null:
      return 'Unknown';
  }
}

/**
 * Get release status name from IGDB status code
 */
export function getStatusName(status: number): string {
  const names: { [key: number]: string } = {
    0: 'Released',
    1: 'Alpha',
    2: 'Beta',
    3: 'Early Access',
    4: 'Offline',
    5: 'Cancelled',
    6: 'Rumored',
    7: 'Delisted'
  };
  return names[status] || 'Unknown';
}

/**
 * Check if a status code represents a released/playable game
 */
export function isPlayableStatus(status: number): boolean {
  return status === 0 || status === 1 || status === 2 || status === 3;
}

/**
 * Sort games by release status priority
 * Priority: released > null (unknown) > unreleased
 */
export function sortByReleaseStatus<T extends { release_status?: ReleaseStatus }>(
  games: T[]
): T[] {
  return [...games].sort((a, b) => {
    const statusA = a.release_status;
    const statusB = b.release_status;

    // Define priority: released (2) > null (1) > unreleased (0)
    const getPriority = (status: ReleaseStatus) => {
      if (status === 'released') return 2;
      if (status === null) return 1;
      return 0; // unreleased
    };

    return getPriority(statusB) - getPriority(statusA);
  });
}
