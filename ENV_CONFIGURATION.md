# Environment Configuration Guide

## Required Environment Variables

Add these to your `.env` file:

```env
# SMS Provider Configuration
# Supported: twilio, nexmo, termii, hellio
SMS_PROVIDER=twilio

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Nexmo/Vonage Configuration (Alternative)
NEXMO_API_KEY=your_api_key
NEXMO_API_SECRET=your_api_secret
NEXMO_FROM_NUMBER=your_from_number

# Termii Configuration (Alternative)
TERMII_API_KEY=your_api_key
TERMII_FROM_NUMBER=your_from_number

# Hellio SMS Configuration (Alternative)
HELLIO_USERNAME=your_hellio_username
HELLIO_PASSWORD=your_hellio_password
HELLIO_SENDER_ID=your_sender_id
HELLIO_RECIPIENT_EMAIL=support@helliomessaging.com
HELLIO_VERIFY_ENABLED=false

# Payment Gateway Configuration
# Supported: paystack, flutterwave
PAYMENT_GATEWAY=paystack

# Paystack Configuration
PAYSTACK_PUBLIC_KEY=your_public_key
PAYSTACK_SECRET_KEY=your_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Flutterwave Configuration (Alternative)
FLUTTERWAVE_PUBLIC_KEY=your_public_key
FLUTTERWAVE_SECRET_KEY=your_secret_key
FLUTTERWAVE_WEBHOOK_SECRET=your_webhook_secret

# VTU Vendor API Configuration
VENDOR_API_ENDPOINT=https://api.vendor.example.com
VENDOR_API_KEY=your_api_key
VENDOR_API_SECRET=your_api_secret
VENDOR_API_TIMEOUT=30

# Production Settings
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database (Production)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=shadow_data_hub
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Error Tracking (Optional but Recommended)
SENTRY_LARAVEL_DSN=your_sentry_dsn
SENTRY_TRACES_SAMPLE_RATE=1.0

# Queue (Recommended for Production)
QUEUE_CONNECTION=redis

# Cache (Recommended for Production)
CACHE_STORE=redis
```

## Getting Started

1. Copy `.env.example` to `.env` (if not exists)
2. Add all required variables above
3. Run `php artisan key:generate`
4. Run `php artisan migrate`
5. Run `php artisan db:seed --class=DataPackageSeeder`


