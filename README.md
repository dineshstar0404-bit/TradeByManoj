# मनोज ट्रेडर्स — MANOJ TRADERS

Customer & Sales Management Platform

## Quick Deploy

### Backend
```bash
cd backend
cp .env.example .env        # fill MONGO_URI, JWT_SECRET, CLOUDINARY_*, ADMIN_RECOVERY_KEY
npm install
npm run seed:admin           # creates admin account
npm start                    # runs on PORT 5000
```

### Mobile App
```bash
cd mobile-app
cp .env.example .env        # set EXPO_PUBLIC_API_BASE_URL=https://your-server.com
npm install
npx expo start              # dev
npx eas build               # production APK
```

## Default Credentials (after seed:admin)
- Admin: userId=admin / password=admin123
- Change password using forgot password flow with ADMIN_RECOVERY_KEY from .env

## Env Variables Required
See backend/.env.example and mobile-app/.env.example
