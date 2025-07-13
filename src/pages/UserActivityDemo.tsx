import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Button,
  FormControlLabel,
  Switch
} from '@mui/material';
import ActivityFeed from '../components/user/ActivityFeed';
import TabPanel from '../components/user/ActivityFeed/TabPanel';
import { useActivityFeed } from '../hooks/useActivityFeed';

function a11yProps(index: number) {
  return {
    id: `user-tab-${index}`,
    'aria-controls': `user-tabpanel-${index}`,
  };
}

const UserActivityDemo: React.FC = () => {
  const [value, setValue] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const userId = "user123";
  
  // Use the activity feed hook
  const {
    isLoading,
    error,
    refresh,
    retry
  } = useActivityFeed({
    userId,
    isActive: isActive && value === 2,
    initialPageSize: 10
  });

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const simulateLoading = () => {
    refresh();
  };

  const simulateError = () => {
    // This is just for demo purposes
    // In a real app, you would handle errors through the API
    throw new Error("Simulated error in activity feed");
  };

  const clearError = () => {
    retry();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Activity Feed Demo
      </Typography>
      
      <Paper sx={{ mb: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Demo Controls
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={simulateLoading}
            disabled={isLoading}
          >
            Simulate Loading
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={simulateError}
            disabled={!!error}
          >
            Simulate Error
          </Button>
          {error && (
            <Button 
              variant="outlined" 
              onClick={clearError}
            >
              Clear Error
            </Button>
          )}
          <FormControlLabel
            control={
              <Switch 
                checked={isActive} 
                onChange={(e) => setIsActive(e.target.checked)} 
              />
            }
            label="Activity Tab Active"
          />
        </Box>
      </Paper>
      
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="user profile tabs"
          >
            <Tab label="Overview" {...a11yProps(0)} />
            <Tab label="Reviews" {...a11yProps(1)} />
            <Tab label="Activity" {...a11yProps(2)} />
            <Tab label="Collections" {...a11yProps(3)} />
          </Tabs>
        </Box>
        
        <TabPanel value={value} index={0}>
          <Typography>Overview content would go here</Typography>
        </TabPanel>
        
        <TabPanel value={value} index={1}>
          <Typography>Reviews content would go here</Typography>
        </TabPanel>
        
        <TabPanel value={value} index={2}>
          <ActivityFeed 
            userId={userId}
            isActive={isActive && value === 2}
          />
        </TabPanel>
        
        <TabPanel value={value} index={3}>
          <Typography>Collections content would go here</Typography>
        </TabPanel>
      </Paper>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Component Usage
        </Typography>
        <Paper sx={{ p: 2 }}>
          <pre style={{ overflow: 'auto', backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
{`import ActivityFeed from '../components/user/ActivityFeed';

// Inside your component:
<ActivityFeed 
  userId="user123"
  isActive={activeTab === 'activity'}
  isLoading={isLoading}
  error={error}
  onRetry={handleRetry}
/>`}
          </pre>
        </Paper>
      </Box>
    </Container>
  );
};

export default UserActivityDemo;