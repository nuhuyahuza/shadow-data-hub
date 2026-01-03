# Quick Start Guide - Production Deployment

## 🚀 Pre-Deployment Checklist

### 1. Database Setup
```bash
# Run migrations
php artisan migrate

# Seed data packages
php artisan db:seed --class=DataPackageSeeder

# Create admin user (via tinker)
php artisan tinker
# Then run:
# $user = User::where('phone', 'YOUR_PHONE_NUMBER')->first();
# $user->update(['role' => 'admin']);
```

### 2. Environment Configuration

Copy required variables to your `.env` file (see `ENV_CONFIGURATION.md` for full list):

```env
# SMS Provider (choose one)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Payment Gateway (choose one)
PAYMENT_GATEWAY=paystack
PAYSTACK_PUBLIC_KEY=your_public_key
PAYSTACK_SECRET_KEY=your_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# VTU Vendor
VENDOR_API_ENDPOINT=https://api.vendor.example.com
VENDOR_API_KEY=your_api_key
VENDOR_API_SECRET=your_api_secret

# Production Settings
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
```

### 3. Service Integration

#### SMS Provider Integration
1. Choose provider (Twilio, Nexmo, or Termii)
2. Install SDK: `composer require twilio/sdk` (or equivalent)
3. Uncomment and implement methods in `app/Services/OtpService.php`:
   - `sendViaTwilio()`
   - `sendViaNexmo()`
   - `sendViaTermii()`

#### Payment Gateway Integration
1. Choose gateway (Paystack or Flutterwave)
2. Install SDK: `composer require paystack/paystack-php` (or equivalent)
3. Implement payment initiation in `app/Http/Controllers/WalletController.php::fund()`
4. Webhook handler is already implemented with security

#### VTU Vendor Integration
1. Get vendor API credentials
2. Implement API calls in `app/Services/VendorService.php`:
   - `purchaseData()` - Main purchase method
   - `getBalance()` - Balance checking

### 4. Security Configuration

#### Webhook Security
- Webhook signature verification is implemented
- Add webhook secret to `.env`
- Optionally enable IP whitelist in `WalletController::webhook()`

#### Rate Limiting
- Already configured for all endpoints
- Adjust limits in `routes/api.php` if needed

### 5. Monitoring Setup

#### Error Tracking (Recommended)
Add to `.env`:
```env
SENTRY_LARAVEL_DSN=your_sentry_dsn
```

#### Health Checks
- Health endpoint: `/health`
- Laravel health endpoint: `/up`

### 6. Scheduled Tasks

Add to your server's crontab:
```bash
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

This will run:
- Daily OTP cleanup at 2 AM

### 7. Production Optimizations

#### Cache & Queue (Recommended)
```env
CACHE_STORE=redis
QUEUE_CONNECTION=redis
```

#### Database
- Switch from SQLite to MySQL/PostgreSQL
- Configure connection pooling
- Set up regular backups

## ✅ What's Already Done

- ✅ Database migrations with indexes
- ✅ Service configurations
- ✅ Error handling
- ✅ Rate limiting
- ✅ Webhook security
- ✅ Security headers
- ✅ Health check endpoint
- ✅ OTP cleanup command
- ✅ Comprehensive logging

## 🔴 Critical Remaining Tasks

1. **Integrate SMS Provider** - Choose and integrate one provider
2. **Integrate Payment Gateway** - Choose and integrate one gateway
3. **Integrate VTU Vendor** - Connect to your vendor API
4. **Run Migrations** - Execute database migrations
5. **Seed Data** - Seed data packages
6. **Create Admin User** - Set first user as admin
7. **Test End-to-End** - Test complete user flow

## 📚 Documentation Files

- `PRODUCTION_READINESS_CHECKLIST.md` - Complete checklist
- `PRODUCTION_IMPROVEMENTS_COMPLETED.md` - What's been completed
- `ENV_CONFIGURATION.md` - Environment variables guide
- `QUICK_START_GUIDE.md` - This file

## 🆘 Support

For issues or questions:
1. Check the production readiness checklist
2. Review error logs: `storage/logs/laravel.log`
3. Check health endpoint: `/health`
4. Review vendor logs in admin panel (if accessible)

