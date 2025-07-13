import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

const ActivityFeedSkeleton: React.FC = () => {
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Box 
          key={index} 
          sx={{ 
            p: 2, 
            bgcolor: 'background.paper', 
            borderRadius: 1,
            display: 'flex',
            gap: 2
          }}
        >
          {/* Avatar skeleton */}
          <Skeleton 
            variant="circular" 
            width={40} 
            height={40} 
            sx={{ flexShrink: 0 }}
          />
          
          <Box sx={{ width: '100%' }}>
            {/* Username and timestamp */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" width={60} />
            </Box>
            
            {/* Activity content */}
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="75%" />
            
            {/* Game image placeholder */}
            <Skeleton 
              variant="rectangular" 
              width={120} 
              height={60} 
              sx={{ mt: 1, borderRadius: 1 }} 
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

export default ActivityFeedSkeleton;