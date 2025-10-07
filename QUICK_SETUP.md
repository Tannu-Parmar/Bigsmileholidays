# Quick Setup Guide for Razorpay Integration

## 🚨 Current Status
The application is running but Razorpay is not configured yet. You can still use the bypass password functionality.

## ✅ What's Working
- ✅ Application is running on http://localhost:3001
- ✅ Bypass password functionality (password: `Bigsmile@2504`)
- ✅ Form submission with payment tracking
- ✅ Database integration

## ⚠️ What Needs Setup
- ⚠️ Razorpay API keys for live payment processing

## 🔧 Quick Setup Steps

### 1. Create Environment File
Create a file named `.env.local` in your project root with:

```env
# Razorpay Configuration (Get these from https://dashboard.razorpay.com/)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id_here

# Copy your existing environment variables from ENVIRONMENT.md
MONGODB_URI=mongodb+srv://it_db_user:Bigsmile%402504@cluster0.bmln0cf.mongodb.net/passportdata
GOOGLE_SERVICE_ACCOUNT_EMAIL=storedata@scandata-471517.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC7DVLvp3mWI5kY\nYm+omXP/WugXJcA56INh5lpXMTa2HxL3jAvuzUg7B9fnQIi3g4QhBG9nIJqadlZO\n...snip...\n-----END PRIVATE KEY-----\n
GOOGLE_SHEETS_SPREADSHEET_ID=1pkAzy1oasgx-piZLOT9cvn8nOnuMgZ0c7oP_m5lh7s8
GOOGLE_SHEETS_SHEET_NAME=records
NEXT_PUBLIC_SHEET_URL=https://docs.google.com/spreadsheets/d/1pkAzy1oasgx-piZLOT9cvn8nOnuMgZ0c7oP_m5lh7s8/edit
APP_ACCESS_PASSWORD=Bigsmile@2504
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Get Razorpay API Keys
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or log in
3. Go to Settings → API Keys
4. Generate Test API Keys
5. Replace the placeholder values in `.env.local`

### 3. Restart the Server
After adding the environment variables:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## 🧪 Testing the Application

### Test Bypass Functionality (Works Now)
1. Open http://localhost:3001
2. Fill out the form
3. Click Submit
4. In payment modal, click "Admin Bypass"
5. Enter password: `Bigsmile@2504`
6. Click "Bypass Payment"
7. Form should submit successfully

### Test Payment Functionality (After Setup)
1. Set up Razorpay API keys
2. Fill out the form
3. Click Submit
4. In payment modal, click "Pay ₹100"
5. Complete Razorpay payment
6. Form should submit with payment details

## 📊 What Gets Saved
Each form submission now includes:
- ✅ All document data (passport, aadhar, pan, photo)
- ✅ Payment status (paid/bypassed)
- ✅ Payment amount
- ✅ Payment ID (if paid via Razorpay)
- ✅ Transaction reference
- ✅ Bypass password usage flag

## 🔒 Security Features
- ✅ Payment verification using Razorpay signatures
- ✅ Bypass password protection
- ✅ Secure API endpoints
- ✅ Environment variable validation
- ✅ Error handling and user feedback

The application is ready to use! You can test the bypass functionality immediately, and set up Razorpay when you're ready for live payments.
