# Storage Bucket Policies Setup for Avatar Uploads

Since storage policies cannot be created via SQL migrations (they require ownership of the storage.objects table), you need to set these up manually in the Supabase Dashboard.

## Steps to Configure Storage Policies

### 1. Navigate to Storage in Supabase Dashboard
- Go to your Supabase project dashboard
- Click on "Storage" in the left sidebar
- Find the `user-avatars` bucket (created by the migration)

### 2. Configure Bucket Settings
- Click on the `user-avatars` bucket
- Go to "Policies" tab
- Enable RLS (Row Level Security) if not already enabled

### 3. Create the Following Policies

#### SELECT Policy (Public Read)
- **Name**: `Public can view avatars`
- **Policy Definition**:
  ```sql
  true
  ```
- **Target Roles**: `anon`, `authenticated`
- **Description**: Anyone can view uploaded avatars

#### INSERT Policy (Upload Own Avatar)
- **Name**: `Users can upload own avatar`
- **Policy Definition**:
  ```sql
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.user
    WHERE provider_id = auth.uid()
  )
  ```
- **Target Roles**: `authenticated`
- **Description**: Users can upload to their own folder only

#### UPDATE Policy (Update Own Avatar)
- **Name**: `Users can update own avatar`
- **Policy Definition**:
  ```sql
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.user
    WHERE provider_id = auth.uid()
  )
  ```
- **Target Roles**: `authenticated`
- **Description**: Users can update files in their own folder

#### DELETE Policy (Delete Own Avatar)
- **Name**: `Users can delete own avatar`
- **Policy Definition**:
  ```sql
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.user
    WHERE provider_id = auth.uid()
  )
  ```
- **Target Roles**: `authenticated`
- **Description**: Users can delete files from their own folder

## Alternative: Using Supabase CLI

If you have the Supabase CLI installed, you can also set these policies programmatically:

```javascript
// In a Node.js script or Supabase Edge Function
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// This would require service role access and appropriate permissions
// Contact Supabase support if you need help with programmatic policy creation
```

## Verification

After setting up the policies, test them by:
1. Uploading an avatar as an authenticated user
2. Trying to upload to another user's folder (should fail)
3. Viewing an avatar as an unauthenticated user (should work)
4. Deleting your own avatar (should work)
5. Trying to delete another user's avatar (should fail)

## Notes
- The bucket is already configured as `public` for read access
- The 5MB file size limit is enforced at the bucket level
- Only JPEG, PNG, GIF, and WebP images are allowed
- Files are organized by user ID folders (e.g., `/123/avatar.jpg`)