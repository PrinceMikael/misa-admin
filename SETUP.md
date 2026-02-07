# Admin Dashboard Setup Guide

## Step 1: Create Admin Account in Firebase

### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **misa-a5173**
3. Click **Authentication** → **Users** → **Add User**
4. Enter:
   - **Email**: `jackson@primaxtz.com`
   - **Password**: `qwertyuiop`
5. Click **Add User**
6. **Copy the User UID** (you'll need it for the next step)

### Step 2: Add User Document in Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **Start Collection**
3. Collection ID: `users`
4. Click **Next**
5. Document ID: **Paste the User UID you copied** (IMPORTANT!)
6. Add these fields:

```
email: "jackson@primaxtz.com"
role: "PARISH_ADMIN"
parishId: "parish_001"  (you can change this)
displayName: "Jackson Admin"
createdAt: [Click "Add field" → Type: Timestamp → Click clock icon]
```

7. Click **Save**

### Step 3: Deploy Firestore Rules

From the `misa` project directory (not misa-admin), run:

```bash
cd ~/React/misa
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Step 4: Start Admin Dashboard

```bash
cd ~/React/misa-admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Login with:
- **Email**: jackson@primaxtz.com
- **Password**: qwertyuiop

---

## Option B: Using Firebase CLI Script

Create a script to add the user programmatically:

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Download Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate New Private Key**
3. Save as `serviceAccountKey.json` in the project root

### 3. Run Setup Script

```bash
node setup-admin.js
```

---

## What to Do After Login

1. **Set Up Parish Details**
   - Go to **Parish Details**
   - Fill in your church information
   - Add location coordinates
   - Upload church image

2. **Add Mass Schedules**
   - Go to **Mass Schedules**
   - Click **Add Schedule**
   - Create schedules for each day

3. **Test Mass Intentions**
   - Go to public app (misa)
   - Submit a test Mass intention
   - Check **Mass Intentions** in admin dashboard
   - Approve/reject/complete intentions

---

## Troubleshooting

### "Invalid email or password"
- Make sure you created the user in Firebase Authentication
- Check that email and password match exactly

### "Loading..." forever
- Check that you created the user document in Firestore
- Make sure the document ID matches the Firebase Auth UID
- Check that `parishId` field exists

### Can't save parish details
- Make sure Firestore security rules are deployed
- Check that `parishId` in user document matches

---

## Quick Test Credentials

**Admin Account**:
- Email: jackson@primaxtz.com
- Password: qwertyuiop
- Parish ID: parish_001

**Note**: Change the password after first login for security!
