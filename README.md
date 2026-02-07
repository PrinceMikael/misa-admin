# Misa Admin Dashboard

Parish management dashboard for the Misa Catholic parish platform.

## Features

✅ **Authentication** - Secure login for parish administrators
✅ **Dark/Light Mode** - Toggle between themes
✅ **Parish Management** - Add and edit church details, location, contact info
✅ **Mass Schedules** - Create, edit, and delete Mass schedules
✅ **Mass Intentions** - View and manage submitted Mass intentions
✅ **Dashboard** - Overview with key statistics

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Material Symbols Icons
- **Backend**: Firebase (Authentication, Firestore)
- **State Management**: React Context API

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
misa-admin/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── login/             # Login page
│   │   ├── dashboard/         # Main dashboard
│   │   ├── parish/            # Parish details management
│   │   ├── schedules/         # Mass schedules management
│   │   ├── intentions/        # Mass intentions viewer
│   │   └── settings/          # Settings page
│   ├── components/            # Reusable components
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── ProtectedRoute.tsx # Auth protection
│   │   └── DashboardLayout.tsx
│   ├── contexts/              # React contexts
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── ThemeContext.tsx   # Theme state
│   ├── lib/                   # Firebase configuration
│   └── types/                 # TypeScript types
```

## Setting Up Parish Admin Accounts

### Using Firebase Console

1. Go to Firebase Console → Authentication
2. Add new user with email/password
3. Go to Firestore Database
4. Create document in `users` collection with the SAME user UID:

```json
{
  "email": "admin@parish.com",
  "role": "PARISH_ADMIN",
  "parishId": "your-parish-id",
  "displayName": "Parish Admin Name",
  "createdAt": [Timestamp]
}
```

**Note**: The document ID must match the Firebase Auth UID!

## How to Use the Dashboard

### 1. Login

- Use your parish admin email and password
- First-time users will be redirected to login

### 2. Parish Details

- Navigate to **Parish Details**
- Fill in all required information:
  - Parish name (English & Swahili)
  - Diocese
  - Address
  - Location coordinates (get from Google Maps: right-click → click coordinates)
  - Contact information
- Upload parish image
- Click **Save Changes**

### 3. Mass Schedules

- Navigate to **Mass Schedules**
- Click **Add Schedule**
- Fill in schedule details:
  - Day of week
  - Time
  - Language
  - Priest name (optional)
  - Location (optional)
- Click **Add Schedule** to save
- Edit or delete schedules as needed

### 4. Mass Intentions

- Navigate to **Mass Intentions**
- View all submitted intentions
- Filter by status: Pending, Approved, Completed, Rejected
- Actions:
  - **Approve** - Accept the intention
  - **Reject** - Decline the intention
  - **Mark as Completed** - Mark approved intention as done
  - **Move to Pending** - Return to pending status

### 5. Dashboard

- View key statistics:
  - Total Mass schedules
  - Pending intentions count
  - Approved intentions count
- See today's Mass schedules
- View recent Mass intentions

## Dark Mode

Click the theme toggle button in the sidebar to switch between light and dark modes.

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## Security Notes

- Parish admins can only manage their own parish data
- Protected routes require authentication
- Firebase security rules enforce data access control

## Support

For issues or questions, contact your diocese administrator.
