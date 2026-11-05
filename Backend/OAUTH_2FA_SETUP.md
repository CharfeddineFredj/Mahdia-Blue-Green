# OAuth & 2FA Authentication Setup

## Installation

Install required packages:
```bash
cd Backend_blog-main
npm install passport passport-google-oauth20 passport-microsoft speakeasy qrcode
```

## Configuration

### 1. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback` (for production)
6. Copy Client ID and Client Secret to `.env`

### 2. Microsoft OAuth Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Click "New registration"
4. Add redirect URI: `http://localhost:5000/api/auth/microsoft/callback`
5. Go to Certificates & secrets → Create new client secret
6. Copy Application (client) ID and Client secret value to `.env`

### 3. Environment Variables
Update your `.env` file:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/auth/microsoft/callback

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173

# 2FA Configuration
TWO_FA_ISSUER=Mahdia Blue & Green
TWO_FA_WINDOW=2
```

## API Endpoints

### OAuth Authentication

#### Google Login
```
GET /api/auth/google
```
Redirects to Google login page

#### Google Callback
```
GET /api/auth/google/callback
```
Google redirects here after authentication

#### Microsoft Login
```
GET /api/auth/microsoft
```
Redirects to Microsoft login page

#### Microsoft Callback
```
GET /api/auth/microsoft/callback
```
Microsoft redirects here after authentication

### 2FA (Two-Factor Authentication)

#### Enable 2FA
```
POST /api/auth/2fa/enable
Headers: Authorization: Bearer {token}
```
Returns QR code and secret for authenticator app

#### Verify 2FA Setup
```
POST /api/auth/2fa/verify-setup
Headers: Authorization: Bearer {token}
Body: {
  "token": "123456"
}
```

#### Disable 2FA
```
POST /api/auth/2fa/disable
Headers: Authorization: Bearer {token}
Body: {
  "password": "user_password",
  "token": "123456"
}
```

#### Verify 2FA Token (during login)
```
POST /api/auth/2fa/verify
Body: {
  "email": "user@example.com",
  "token": "123456"
}
```

#### Generate Backup Codes
```
POST /api/auth/2fa/backup-codes
Headers: Authorization: Bearer {token}
Body: {
  "password": "user_password"
}
```

#### Use Backup Code
```
POST /api/auth/2fa/use-backup-code
Body: {
  "email": "user@example.com",
  "backupCode": "ABC123"
}
```

## Frontend Integration

### Login Flow with OAuth

```javascript
// Google Login Button
<button onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}>
  Login with Google
</button>

// Microsoft Login Button
<button onClick={() => window.location.href = 'http://localhost:5000/api/auth/microsoft'}>
  Login with Microsoft
</button>
```

### 2FA Flow

1. **Enable 2FA**: User requests to enable 2FA
2. **Show QR Code**: Display QR code for user to scan with authenticator app
3. **Verify Setup**: User enters code from app to confirm setup
4. **Login with 2FA**: After email/password, request 2FA token
5. **Backup Codes**: Generate and securely store backup codes

### Example: Enable 2FA

```javascript
const enable2FA = async () => {
  const response = await fetch('http://localhost:5000/api/auth/2fa/enable', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  // data.qrCode - Display this QR code image
  // data.secret - Store this securely (optional)
};
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (httpOnly cookies or secure storage)
3. **Keep backup codes secure** (encrypted, one-time use)
4. **Implement rate limiting** for 2FA attempts
5. **Log authentication attempts** for security monitoring
6. **Validate redirect URLs** to prevent open redirects

## Supported Authenticator Apps

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Any TOTP-compatible app
