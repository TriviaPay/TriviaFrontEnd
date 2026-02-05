# Locust Load Testing Guide

This guide details how to run load tests for the TriviaCoin mobile app backend using **Locust**, optimized for environments where refresh tokens are not stored.

## Prerequisites

1. **Python 3.8+** installed.
2. **Locust** installed: `pip install locust`

## 🔐 Authentication Strategies

Since refresh tokens aren't available, use one of these two methods to simulate authenticated users.

### Method 1: Bypass Secret Header (Recommended for Scalability)
This is the most "Senior" way to load test. You add a hidden door to your backend that bypasses Descope verification if a secret key is present.

**1. Environment Variables:**
Set a secret string on your machine:
```powershell
$env:LOCUST_LOAD_TEST_SECRET="my-super-secret-key-123"
```

**2. Backend Implementation (Suggestion):**
Add this middleware to your Node.js/Express (or equivalent) backend:
```javascript
// Middleware to bypass Descope for load testing
const authMiddleware = (req, res, next) => {
  const secret = req.headers['x-load-test-secret'];
  
  if (secret === process.env.LOAD_TEST_BYPASS_SECRET) {
    // Mock a valid user object
    req.user = { id: req.headers['x-mock-user-id'] || 'load-test-default-user' };
    return next();
  }
  
  // Normal Descope verification logic here...
};
```

### Method 2: Manual Access Tokens (Quick/Manual)
If you just want a quick test, copy a few valid Session JWTs from your browser/app logs.

**1. Environment Variables:**
```powershell
$env:LOCUST_ACCESS_TOKENS="eyJhbGci..., eyJh..."
```
*Note: These tokens eventually expire, so this is only for short tests.*

---

## 🏃 Running Locally

To start the Locust web interface:

```bash
locust -f locustfile.py
```

1. Open `http://localhost:8089`.
2. Enter **Users** (e.g. 100) and **Spawn Rate** (e.g. 10).
3. Enter **Host**: `https://trivia-back-end.vercel.app`.
4. Click **Start swarming**.

### Headless Mode (CLI)
```bash
locust -f locustfile.py --headless -u 50 -r 5 --run-time 5m
```

## 📊 Monitoring Tips

- **Response Time (p95)**: Your app should ideally serve requests in < 200ms.
- **Success Rate**: In "Anonymous Mode", expect failures on protected APIs. In "Bypass/Auth Mode", you should see 100% success.
- **Database CPU**: If DB CPU hits > 80% with only 100 users, check for missing indexes on your queries.

## Troubleshooting

- **401 Errors**: Check if your tokens expired or if your backend environment variable for the `BYPASS_SECRET` matches your Locust environment variable.
- **Connection Errors**: Check if you are hitting Vercel's rate limits or your local firewall.
