# Textile Billing System
### GST-compliant billing web app for any textile organization

---

## Quick start (local)

```bash
# 1. Start MongoDB (open MongoDB Compass → connect to localhost:27017)

# 2. Backend
cd backend && npm install
node scripts/seed.js     # Creates DB + test data
npm run dev              # http://localhost:5000

# 3. Frontend
cd frontend && npm install
npm run dev              # http://localhost:5173
```

**Login:** admin@company.com / Admin@1234

---

## Features

| Feature | Who | Details |
|---|---|---|
| Dashboard | All | Stats, agent performance, recent invoices |
| Create invoice | All | 4-step form, live GST calc (SGST/CGST/IGST) |
| Invoice list | All | Search, filter by status/agent |
| PDF download | All | Generates GST-compliant A4 invoice PDF |
| Email invoice | All | Sends PDF as email attachment |
| WhatsApp share | All | Opens WhatsApp with pre-filled message |
| Update status | Admin | paid / pending / overdue |
| Agents | Admin | Add, activate/deactivate |
| Company settings | Admin | Name, GST, bank, T&C |

---

## Phase 3 — PDF Generation

Uses **Puppeteer** (headless Chrome) to render HTML → PDF.

### How it works
```
GET /api/invoices/:id/pdf
→ Fetches invoice + company from MongoDB
→ Builds HTML template (matches Om Textile bill format)
→ Puppeteer renders to A4 PDF
→ Streams PDF to browser for download
```

### First time setup
Puppeteer downloads Chromium automatically:
```bash
cd backend && npm install   # Puppeteer installs Chromium (~170MB)
```

### PDF template includes
- Company header (name, address, GST, mobile)
- TAX INVOICE title bar
- Invoice reference numbers (order, challan, invoice, dates, E-Way)
- Billed to / Shipped to addresses with GSTIN
- Transport details (transporter, mode, vehicle)
- Item table (description, HSN, pieces, qty, rate, amount)
- GST summary (SGST+CGST or IGST)
- Amount in words (Indian numbering: crore/lakh/thousand)
- Bank details
- Terms & conditions
- Authorised signatory footer

---

## Phase 4 — Sharing

### Email (via Nodemailer)

**Setup:**
```env
# backend/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
```

**Gmail App Password** (required — regular password won't work):
1. Go to myaccount.google.com → Security
2. Enable 2-Step Verification
3. App passwords → Generate → Copy the 16-char code
4. Paste as SMTP_PASS

**How it works:**
```
POST /api/invoices/:id/send-email  { email: "customer@example.com" }
→ Generates PDF
→ Sends email with PDF attachment
→ Deletes temp PDF after send
```

### WhatsApp share

No API needed — opens WhatsApp Web with a pre-filled message:
```
POST /api/invoices/:id/whatsapp  { phone: "9876543210" }
→ Returns: { url: "https://wa.me/919876543210?text=..." }
→ Frontend opens this URL in new tab
→ User sees WhatsApp with invoice summary pre-typed
```

---

## Phase 4 — CI/CD (GitHub Actions → AWS EC2)

### GitHub secrets to add
See `deploy/GITHUB_SECRETS.txt` for full instructions.

| Secret | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your .pem file |
| `VITE_API_URL` | `http://YOUR_IP/api` |

### Deploy pipeline
On every push to `main`:
1. Syntax check all backend files
2. Build React frontend with Vite
3. SSH into EC2 → `git pull` → `npm ci` → PM2 restart → copy frontend to Nginx

### First-time AWS EC2 setup
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Upload and run setup script
scp -i your-key.pem deploy/setup-ec2.sh ubuntu@YOUR_EC2_IP:~
bash setup-ec2.sh
```

The script installs: Node.js 20, PM2, MongoDB, Nginx, Chromium (for PDF), and deploys the app.

---

## API reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | — | Login |
| POST | /api/auth/register | admin | Create agent |
| GET | /api/auth/me | any | Current user |
| GET | /api/invoices | any | List (role-filtered) |
| POST | /api/invoices | any | Create |
| GET | /api/invoices/:id | any | Get one |
| PUT | /api/invoices/:id/status | admin | Update status |
| **GET** | **/api/invoices/:id/pdf** | any | **Download PDF** |
| **POST** | **/api/invoices/:id/send-email** | any | **Email PDF** |
| **POST** | **/api/invoices/:id/whatsapp** | any | **WhatsApp link** |
| DELETE | /api/invoices/:id | admin | Delete |
| GET | /api/stats | admin | Dashboard stats |
| GET | /api/agents | admin | List agents |
| PUT | /api/agents/:id/toggle | admin | Activate/deactivate |
| GET | /api/company | any | Company info |
| PUT | /api/company | admin | Update company |

---

## Project structure

```
TextileBilling/
├── .github/workflows/deploy.yml   ← GitHub Actions CI/CD
├── ecosystem.config.js            ← PM2 config for production
├── nginx.conf                     ← Nginx site config
├── deploy/
│   ├── setup-ec2.sh              ← One-time AWS EC2 setup
│   └── GITHUB_SECRETS.txt        ← Secrets guide
├── backend/
│   ├── models/         Company, Agent, Invoice
│   ├── routes/         auth, invoices (PDF/email/WA), stats, agents, company
│   ├── services/
│   │   ├── pdfService.js         ← Puppeteer HTML→PDF
│   │   └── emailService.js       ← Nodemailer
│   ├── middleware/     JWT auth
│   ├── scripts/        seed.js
│   ├── pdfs/           Temp PDF storage
│   └── .env            Secrets config
└── frontend/
    └── src/
        ├── pages/
        │   ├── auth/   LoginPage
        │   ├── agent/  Dashboard, InvoiceList, CreateInvoice, InvoiceDetail
        │   └── admin/  Agents, Settings
        ├── components/ Layout, UI components
        ├── context/    AuthContext
        ├── services/   api.js (axios)
        └── utils/      formatters, GST calc
```
"# Textile-Supportive" 
