# Authenticated Crawling with Katana

## Overview

The most reliable way to crawl an authenticated web application with **Katana** is by using your **authenticated session cookies**. This allows Katana to access pages that are only available after logging in.

---

## Step 1: Log In

Open the target application in your browser and log in with your test account.

Example:

```text
https://app.target.com
```

---

## Step 2: Copy Session Cookies

1. Press **F12** to open Developer Tools.
2. Navigate to **Application** → **Storage** → **Cookies**.
3. Select the target domain.
4. Copy the required session cookies.

Example:

```text
sessionid=abc123xyz
csrftoken=def456
```

If multiple cookies are required, combine them:

```text
sessionid=abc123xyz; csrftoken=def456; remember_me=ghi789
```

---

## Step 3: Run Katana

```bash
katana \
-u https://app.target.com \
-H "Cookie: sessionid=abc123xyz; csrftoken=def456" \
-js-crawl \
-jsluice \
-headless \
-system-chrome \
-d 8 \
-o katana_auth.txt
```

---

## Flag Explanation

| Flag             | Description                                         |
| ---------------- | --------------------------------------------------- |
| `-u`             | Starting URL                                        |
| `-H`             | Sends your authenticated cookies with every request |
| `-js-crawl`      | Crawls JavaScript-generated links                   |
| `-jsluice`       | Extracts endpoints from JavaScript files            |
| `-headless`      | Uses a headless browser for rendering               |
| `-system-chrome` | Uses your installed Chrome browser                  |
| `-d 8`           | Sets crawl depth to 8                               |
| `-o`             | Saves discovered URLs to a file                     |

---

## Step 4: Verify Authentication

Before running a full crawl, verify that your session cookies are still valid.

```bash
curl -H "Cookie: sessionid=abc123xyz; csrftoken=def456" \
https://app.target.com/dashboard
```

If the response displays your authenticated dashboard instead of a login page or redirect, your cookies are valid and Katana will crawl authenticated content successfully.

---

## Output

Discovered URLs will be saved to:

```text
katana_auth.txt
```

---

## Notes

* Use a dedicated test account whenever possible.
* Refresh the session cookies if they expire.
* Increase the crawl depth (`-d`) for larger applications.
* Review the output for hidden endpoints, API routes, and JavaScript-generated paths.
