# JS Recon Downloader (Puppeteer)

Downloads all JavaScript files loaded by a website and saves only unique files (based on SHA-256 hash). Supports authenticated crawling using cookies and generates a manifest of downloaded files.

## Features

- Downloads all loaded JavaScript files
- Removes duplicate JS files using content hash
- Supports authenticated crawling with cookies
- Saves JS files with unique filenames
- Generates `_manifest.json`
- Triggers lazy-loaded JavaScript by scrolling and opening a page element

## Requirements

- Node.js 18+
- npm

## Installation

```bash
git clone <your-repo>
cd <your-repo>

npm install puppeteer
```

## Configuration

Edit these variables in the script:

```javascript
const TARGET_URL = "https://target.com";
const EXTRA_IN_SCOPE_DOMAINS = ["cdn.target.com"];

in same folder set your cookie in json format to get more js files as authenticated for cookie edtior copy cookie injson format and save it: cookies.json 
```

### Optional Authentication

Export your browser cookies as `cookies.json` and place it in the same directory as the script.

If `cookies.json` exists, the script crawls as a logged-in user.

## Run

```bash
node script.js
```

## Output

```
js_recon_output/
├── hostname_hash_filename.js
├── hostname_hash_filename.js
├── hostname_hash_filename.js
└── _manifest.json
```

## Manifest

The manifest contains:

- Original JS URL
- Hostname
- SHA-256 hash
- Saved filename
- File size
- Scan timestamp

## Workflow

1. Launch headless Chrome
2. Visit target website
3. Load cookies (optional)
4. Capture every JavaScript response
5. Download only unique JS files
6. Scroll page to trigger lazy loading
7. Open a page element to load additional bundles
8. Save JS files
9. Generate `_manifest.json`

## Notes

- Only downloads JavaScript from the target domain and allowed CDN domains.
- Duplicate JS files are skipped automatically.
- Useful for bug bounty, JavaScript reconnaissance, endpoint extraction, and secret hunting.

## Next Steps

After downloading the JS files, you can analyze them with:

```bash
LinkFinder
SecretFinder
Semgrep
TruffleHog
JSLuice
grep
ripgrep
```

Example:

```bash
grep -R "api" js_recon_output/
```

```bash
grep -R "token" js_recon_output/
```

```bash
semgrep scan js_recon_output/
```

## Disclaimer

Use only on systems you are authorized to test (e.g., bug bounty programs or assets you own).
