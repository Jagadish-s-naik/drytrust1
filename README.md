# DryTrust — QR Trust Label for Coastal Dry Fish

> **Startup Hackathon Product Specification (Upgraded Model)**  
> Verifiable trust stamps, dual hygiene & product quality scoring, evidence caps, sensory buyer checks, and instant QR verification for women-led dry fish processing units across coastal Karnataka.

---

## 1. Product Overview & Upgrade Architecture

### The Problem
Small, predominantly women-led dry-fish micro-enterprises along the Karnataka coastline (Malpe, Mangaluru, Honnavar, Karwar, etc.) dry fish in open spaces. Traditional trust labels suffered from three key weaknesses:
1. **Self-reported scores were easy to fake.**
2. **Yes/No hygiene checklists hid critical processing details.**
3. **Product QUALITY was not measured, only hygiene.**

### The Upgraded Solution
DryTrust addresses these weaknesses with a transparent, scientific model:
- **Dual Score Engine (Hygiene + Quality)**:
  - **Hygiene Score (H, 0–100)**: 5 hygiene checklist criteria (85 pts max) + 3 live photos (15 pts). Gallery uploads earn only 8 photo pts.
  - **Quality Score (Q, 0–100)**: Freshness at landing, salting grade, drying days vs. fish type typical ranges, drying method (solar tent / mechanical / sun), and calibrated moisture reading.
  - **Overall Score**: `round(0.6 * H + 0.4 * Q) - (5 * reports) + (10 if verified)`.
- **Strict Evidence Caps (Cannot Fake Gold)**:
  - **< 3 Photos**: Capped at **49 max** (*Needs improvement*).
  - **Unverified (Self-Declared)**: Capped at **79 max** (*Silver*). **Gold strictly REQUIRES on-site field officer verification.**
- **Sensory Buyer "Check It Yourself" Guide**: Transparent 4-step sensory evaluation (Smell, Look, Feel, Insects) directly on the public verification page.
- **Officer On-Site Audit Drawer**: Side-by-side comparison of seller self-declarations vs. officer audits, highlighting discrepancies.
- **Compact QR Payload**: Embeds all commercial, hygiene, and quality parameters into a short base64url payload with zero photos in the QR code, ensuring instant offline parsing.

> **Important Regulatory Notice:**  
> All thresholds, moisture limits, and typical drying duration ranges in `src/score.js` are placeholder values. Confirm limits with the Fisheries Department / ICAR-CIFT before real commercial use.

---

## 2. Upgraded Scoring Model

```
HYGIENE SCORE (H, 0-100)
├── Raised rack drying: 25 pts
├── Clean mesh/tarp cover: 15 pts
├── Pest/fly protection: 15 pts
├── Clean perimeter (15m): 15 pts
├── Sealed packaging: 15 pts
└── 3 Photo Slots:
    ├── All 3 photos live camera capture: 15 pts
    ├── All 3 photos present, any from gallery: 8 pts
    └── Fewer than 3 photos: 0 pts

PRODUCT QUALITY SCORE (Q, 0-100)
├── Freshness at Landing (max 20 pts):
│   ├── Same day landing: 20 pts
│   ├── Iced 1 day: 12 pts
│   └── Older catch: 0 pts
├── Salting Level (max 15 pts):
│   ├── Standard salting: 15 pts
│   ├── Light salting: 12 pts
│   ├── Heavy salting: 10 pts
│   └── No salt (fresh-dried): 5 pts
├── Drying Duration (max 20 pts):
│   ├── Within species typical range: 20 pts
│   │   (Anchovy 2-3d, Bombil 3-5d, Mackerel 3-5d, Sardine 3-4d, Prawn 2-4d, Other 2-6d)
│   └── Outside typical range: 8 pts
├── Drying Method (max 15 pts):
│   ├── Mechanical dryer: 15 pts
│   ├── Solar tent dryer: 13 pts
│   └── Open sun: 5 pts
└── Moisture % Probe Reading (max 30 pts):
    ├── Officer tested:
    │   ├── <= 15% (Limit): 30 pts
    │   ├── <= 20% (Limit + 5%): 15 pts
    │   └── > 20%: 0 pts
    ├── Seller tested (Halved points):
    │   ├── <= 15%: 15 pts
    │   ├── <= 20%: 7.5 pts
    │   └── > 20%: 0 pts
    └── Not measured: 0 pts ("Not measured")

OVERALL SCORE & CAPS
├── Raw: round(0.6 * H + 0.4 * Q) - 5 * reports + (10 if verified)
├── Clamp: 0 to 100
├── Cap 1: If fewer than 3 photos: overall capped at 49 (Needs improvement)
└── Cap 2: If unverified by officer: overall capped at 79 (Silver, Self-declared)
```

Quality Bands:
- **Gold**: ≥ 80 (*Requires officer verification*)
- **Silver**: 50 – 79
- **Needs Improvement**: < 50

---

## 3. Getting Started & Running Locally

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### Installation & Launch
```bash
# Clone or navigate to the project directory
cd Drytrust

# Install dependencies (only minimal allowed packages)
npm install

# Start the Vite development server
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Running Score Engine Tests
To verify the upgraded pure scoring engine, evidence caps, moisture calculations, and QR payload serialization:
```bash
node scripts/score.test.js
```

### Building for Production
```bash
npm run build
```

---

## 4. Demo Credentials

### Officer / Admin Login
- **URL**: `#/admin/login`
- **Password**: `admin123`

### Seeded Coastal Seller Accounts
All seeded accounts use the demo PIN **`1234`**:

| Coastal Unit Name | Owner / Lead | Town | Mobile Number | PIN |
| :--- | :--- | :--- | :--- | :--- |
| **Mogaveera Mahila Sangha** | Radhika Mogaveera | Malpe | `9845012345` | `1234` |
| **Coastal Catch Dried Foods** | Sunita Kharvi | Honnavar | `9845012346` | `1234` |
| **Netravati Fisherwomen Co-op** | Devaki Salian | Mangaluru | `9845012347` | `1234` |
| **Karwar Sun Dried Crafts** | Parvati Tandel | Karwar | `9845012348` | `1234` |

---

## 5. Seed Batches & Verified Coverage

DryTrust seeds 9 batches across coastal units spanning the past 3 weeks:
- **3 Gold Verified Batches** (`DT-M01A10`, `DT-K03G12`, `DT-N04G14`) with complete officer audits and tested moisture.
- **3 Silver Self-Declared Batches** (`DT-M01B11`, `DT-C02A01`, `DT-K03H13`) capped at 79 points.
- **2 Needs Improvement Batches** (`DT-C02B02`, `DT-N04H15`) illustrating photo and hygiene caps.
- **1 Batch with Buyer Quality Report** (`DT-C02C03`) demonstrating active penalty calculation.

---

## 6. Known Limits

- **LocalStorage Architecture**: DryTrust stores data in `localStorage` under a versioned storage key (`dt_version: 'v2.0'`). All storage calls are isolated in `src/data.js` for future backend replacement.
- **Limited View**: When scanned on a secondary device, the compact QR payload reconstructs the full batch specs, dual scores, and use-by dates without transferring heavy photos over the QR matrix.
- **Demo Transactions**: Order placement produces simulated orders and financial deductions without executing real payment transactions.
