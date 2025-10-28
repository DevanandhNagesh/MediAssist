# MediAssist - Features & File Functions

## 🎯 Quick Feature Overview

MediAssist has **5 main features**:

1. 🔐 **Authentication System** - User login/registration (✅ Saves to Database)
2. 🩺 **Smart Diagnosis** - AI-powered symptom checker (❌ No database - Analysis only)
3. 💊 **Prescription Insight** - OCR prescription scanner (❌ No database - Image processing only)
4. 📚 **Medical Knowledge Simplifier** - Medicine search & info lookup (❌ No database - Search only)
5. 📊 **Medicine Tracker** - Medication adherence monitoring (✅ Saves to Database)

---

## 🔐 Feature 1: Authentication System

**Purpose**: User registration, login, and profile management  
**Database**: ✅ **SAVES TO DATABASE** (User collection)  
**Status**: ✅ **FULLY FUNCTIONAL**

### Backend Files

| File | Location | Function |
|------|----------|----------|
| **authController.js** | `backend/src/controllers/` | Handles registration, login, profile retrieval. Hashes passwords with bcryptjs, generates JWT tokens (7-day expiry) |
| **authRoutes.js** | `backend/src/routes/` | Defines auth routes: POST /register, POST /login, GET /profile |
| **User.js** | `backend/src/models/` | MongoDB schema for users: name, email, password, timestamps. Method: comparePassword() |
| **jwtHelper.js** | `backend/src/utils/` | JWT utility functions: generateToken(), verifyToken() |
| **auth.js** | `backend/src/middlewares/` | JWT authentication middleware. Verifies tokens, attaches user to req.user, protects routes |

### Frontend Files

| File | Location | Function |
|------|----------|----------|
| **LoginPage.jsx** | `frontend/src/pages/` | Login form: email/password, validates input, stores JWT in localStorage, redirects to dashboard |
| **RegisterPage.jsx** | `frontend/src/pages/` | Registration form: name, email, password, confirm password. Client-side validation, redirects to login |
| **AuthContext.jsx** | `frontend/src/context/` | React Context for auth state: user, login(), logout(), isAuthenticated. Manages JWT tokens |
| **ProtectedRoute.jsx** | `frontend/src/components/` | Route wrapper that requires authentication. Redirects to login if not authenticated |

### API Endpoints

```
POST   /api/auth/register     - Register new user (no auth required)
POST   /api/auth/login        - Login user (no auth required)
GET    /api/auth/profile      - Get user profile (auth required)
```

### Database Operations

- ✅ **CREATE**: `User.create()` on registration
- ✅ **READ**: `User.findById()` for profile, `User.findOne()` for login
- ✅ **UPDATE**: Not implemented yet
- ✅ **DELETE**: Not implemented yet

---

## 🩺 Feature 2: Smart Diagnosis (Symptom Checker)

**Purpose**: AI-powered symptom analysis to suggest possible diseases  
**Database**: ❌ **NO DATABASE** - Stateless AI analysis  
**Status**: ✅ **FULLY FUNCTIONAL** (but no query history saved)

### Backend Files

| File | Location | Function |
|------|----------|----------|
| **diagnosisController.js** | `backend/src/controllers/` | Receives symptoms, age, gender, duration. Calls symptomService for AI analysis. Returns possible diseases |
| **diagnosisRoutes.js** | `backend/src/routes/` | Defines diagnosis routes: POST /analyze, GET /symptoms/metadata |
| **symptomService.js** | `backend/src/services/` | Core business logic: Loads symptom metadata, calls Gemini API, generates diagnosis with confidence scores |
| **diagnosisValidation.js** | `backend/src/validation/` | Joi validation schemas: validates symptoms array, age (1-120), gender, duration |
| **UserQuery.js** | `backend/src/models/` | ⚠️ **EMPTY FILE** - Could be used to save query history but currently unused |

### Frontend Files

| File | Location | Function |
|------|----------|----------|
| **DiagnosisPage.jsx** | `frontend/src/pages/` | Multi-symptom selector, age/gender/duration inputs. Displays AI diagnosis results with possible diseases, confidence scores, recommendations |
| **diagnosis.scss** | `frontend/src/styles/` | Styles for symptom checker page: dark theme, card layouts, result displays |

### API Endpoints

```
POST   /api/diagnosis/analyze              - Analyze symptoms (auth required)
GET    /api/diagnosis/symptoms/metadata    - Get symptom list (auth required)
```

### Data Flow

1. User selects symptoms + enters age, gender, duration
2. Frontend sends to `POST /api/diagnosis/analyze`
3. Controller validates input via Joi
4. Service loads symptom metadata from `datasets/models/symptom_metadata.json`
5. Service calls Gemini API with symptom data
6. AI returns possible diseases with confidence scores
7. Results sent back to frontend
8. ❌ **No database save** - Analysis results not persisted

### Dataset Files Used

| File | Location | Purpose |
|------|----------|---------|
| **symptom_metadata.json** | `datasets/models/` | Symptom categories and metadata for AI analysis |
| **symptom_model.json** | `datasets/models/` | Model configuration for symptom analysis |
| **DiseaseAndSymptoms.csv** | `datasets/raw/` | Disease-symptom mapping reference data |
| **Disease precaution.csv** | `datasets/raw/` | Disease precautions and health recommendations |

---

## 💊 Feature 3: Prescription Insight (OCR Scanner)

**Purpose**: Upload prescription image, extract medicine names via OCR  
**Database**: ❌ **NO DATABASE** - Stateless image processing  
**Status**: ✅ **FULLY FUNCTIONAL** (but prescriptions not saved)

### Backend Files

| File | Location | Function |
|------|----------|----------|
| **prescriptionController.js** | `backend/src/controllers/` | Handles image upload, calls prescriptionService for OCR, returns detected medicines |
| **prescriptionRoutes.js** | `backend/src/routes/` | Route with multer file upload: POST /analyze (multipart/form-data) |
| **prescriptionService.js** | `backend/src/services/` | **CORE LOGIC**: Tesseract OCR text extraction, medicine name detection, fuzzy matching with dataset (Dice coefficient), AI fallback via Gemini |
| **Prescription.js** | `backend/src/models/` | ⚠️ **EMPTY FILE** - Could be used to save prescription history but currently unused |

### Frontend Files

| File | Location | Function |
|------|----------|----------|
| **PrescriptionPage.jsx** | `frontend/src/pages/` | Image upload (drag & drop or browse), image preview, displays ALL detected medicines (matched + unmatched), shows medicine details: uses, side effects, price, manufacturer |
| **prescription.scss** | `frontend/src/styles/` | Styles for prescription scanner: upload area, image preview, medicine cards |

### API Endpoints

```
POST   /api/prescriptions/analyze    - Upload & analyze prescription (auth required)
```

### Data Flow

1. User uploads prescription image (JPG/PNG)
2. Frontend sends to `POST /api/prescriptions/analyze` via FormData
3. Multer saves image to `backend/uploads/prescriptions/`
4. Tesseract.js extracts text from image
5. Service cleans text and extracts potential medicine names
6. Fuzzy matching against `Extensive_A_Z_medicines_dataset_of_India.csv`
7. AI fallback (Gemini) for better detection if needed
8. Returns ALL detected medicines:
   - **Matched medicines**: Full info (uses, side effects, price, manufacturer)
   - **Detected-only medicines**: Basic info (name only, not in dataset)
9. ❌ **No database save** - Prescription not persisted
10. Image remains in uploads folder (should be cleaned periodically)

### Upload Storage

| Location | Purpose |
|----------|---------|
| `backend/uploads/prescriptions/` | Temporary storage for uploaded images (files not deleted automatically) |

### Dataset Files Used

| File | Location | Purpose |
|------|----------|---------|
| **Extensive_A_Z_medicines_dataset_of_India.csv** | `datasets/raw/` | 10,000+ Indian medicines with details: name, manufacturer, MRP, uses, side effects, substitutes |
| **eng.traineddata** | `backend/` | Tesseract OCR English language training data |
| **prescription_ocr_best (1).h5** | `datasets/raw/` | ⚠️ Trained handwriting model (not currently integrated) |

---

## 📚 Feature 4: Medical Knowledge Simplifier

**Purpose**: Search medicines, get detailed information, natural language queries  
**Database**: ❌ **NO DATABASE** - Stateless search on existing dataset  
**Status**: ✅ **FULLY FUNCTIONAL** (but search history not saved)

### Backend Files

| File | Location | Function |
|------|----------|----------|
| **knowledgeController.js** | `backend/src/controllers/` | Handles search queries and medicine lookups. Routes to knowledgeService |
| **knowledgeRoutes.js** | `backend/src/routes/` | Defines knowledge routes: POST /search, GET /medicine/:name |
| **knowledgeService.js** | `backend/src/services/` | **CORE LOGIC**: Loads medicine dataset from CSV, performs search (exact/fuzzy), AI-powered natural language search via Gemini, returns medicine details |
| **knowledgeValidation.js** | `backend/src/validation/` | Joi validation for search queries: query string (2-200 chars required) |
| **Medicine.js** | `backend/src/models/` | ⚠️ **EMPTY FILE** - Could be used for custom medicine data but currently unused |

### Frontend Files

| File | Location | Function |
|------|----------|----------|
| **KnowledgePage.jsx** | `frontend/src/pages/` | Search bar with natural language support, displays search results, shows detailed medicine info: uses, side effects, substitutes, price, manufacturer, therapeutic class |
| **knowledge.scss** | `frontend/src/styles/` | Styles for knowledge search: search bar, result cards, medicine detail views |

### API Endpoints

```
POST   /api/knowledge/search              - Search medicines (auth required)
GET    /api/knowledge/medicine/:name      - Get specific medicine details (auth required)
```

### Data Flow

1. User enters search query (e.g., "medicine for headache", "paracetamol")
2. Frontend sends to `POST /api/knowledge/search`
3. Service loads medicine dataset from CSV
4. Performs search:
   - **Exact match**: Search by medicine name
   - **Fuzzy match**: Search in uses, therapeutic class
   - **AI search**: Natural language query processed by Gemini API
5. Returns matching medicines with full details
6. User can click medicine to view full details via `GET /medicine/:name`
7. ❌ **No database save** - Search queries not persisted

### Dataset Files Used

| File | Location | Purpose |
|------|----------|---------|
| **Extensive_A_Z_medicines_dataset_of_India.csv** | `datasets/raw/` | Primary medicine database: 10,000+ medicines with uses, side effects, substitutes, price, manufacturer, chemical class, therapeutic class |
| **medicines.json** | `datasets/lookups/` | Processed medicine lookup data (generated from CSV) |

### Medicine Information Provided

- **Medicine Name**
- **Manufacturer**
- **MRP (Price)**
- **Uses** (what it treats)
- **Side Effects**
- **Substitutes** (alternative medicines)
- **Chemical Class**
- **Therapeutic Class**
- **Action Class**
- **Habit Forming** (Yes/No)

---

## 📊 Feature 5: Medicine Tracker

**Purpose**: Track medications, log doses, monitor adherence, manage stock  
**Database**: ✅ **SAVES TO DATABASE** (MedicineLog collection)  
**Status**: ✅ **FULLY FUNCTIONAL** with complete CRUD operations

### Backend Files

| File | Location | Function |
|------|----------|----------|
| **medicineLogController.js** | `backend/src/controllers/` | **FULL CRUD**: Add medicine, get all medicines, update, delete, log dose taken, log missed dose, calculate adherence statistics |
| **medicineLogRoutes.js** | `backend/src/routes/` | All medicine tracker routes (7 endpoints) |
| **MedicineLog.js** | `backend/src/models/` | MongoDB schema: medicine name, dosage, frequency, time of day, stock, usage history array, missed doses array, start/end dates, isActive |

### Frontend Files

| File | Location | Function |
|------|----------|----------|
| **MedicineLogsPage.jsx** | `frontend/src/pages/` | Complete medicine management: Add/edit/delete medicines, log doses, log missed doses, view usage history, see adherence scores, stock level tracking |
| **DashboardPage.jsx** | `frontend/src/pages/` | Overview dashboard: overall adherence score, active medicines count, recent activity, quick action buttons |
| **medicine-logs.scss** | `frontend/src/styles/` | Styles for medicine tracker: forms, medicine cards, adherence charts, stock indicators |

### API Endpoints

```
GET    /api/medicine-logs                 - Get all user medicines (auth required)
POST   /api/medicine-logs                 - Add new medicine (auth required)
PUT    /api/medicine-logs/:id             - Update medicine (auth required)
DELETE /api/medicine-logs/:id             - Delete medicine (auth required)
POST   /api/medicine-logs/:id/dose        - Log dose taken (auth required)
POST   /api/medicine-logs/:id/missed      - Log missed dose (auth required)
GET    /api/medicine-logs/adherence       - Get adherence statistics (auth required)
```

### Database Operations

- ✅ **CREATE**: `MedicineLog.create()` to add new medicine
- ✅ **READ**: `MedicineLog.find()` to get all user medicines
- ✅ **UPDATE**: 
  - `findByIdAndUpdate()` to edit medicine details
  - `$push` to usageHistory array when dose logged
  - `$push` to missedDoses array when dose missed
  - `$inc` to decrement stock quantity
- ✅ **DELETE**: `MedicineLog.findByIdAndDelete()` to remove medicine

### Data Tracked

#### Medicine Details
- Medicine name
- Dosage (e.g., "500mg")
- Frequency (daily, twice, thrice, custom)
- Time of day (morning, afternoon, evening, night)
- Start date / End date
- Stock quantity
- isActive status

#### Usage History (Each Dose)
```javascript
usageHistory: [{
  takenAt: Date,        // Timestamp when dose was taken
  notes: String         // Optional notes
}]
```

#### Missed Doses
```javascript
missedDoses: [{
  missedAt: Date,       // Timestamp when dose was missed
  reason: String        // Optional reason
}]
```

#### Adherence Calculation
```javascript
totalDoses = usageHistory.length
totalMissed = missedDoses.length
adherenceScore = (totalDoses / (totalDoses + totalMissed)) * 100

// Returns null if no data (fixed from showing 100%)
```

### Features

1. **Add Medicine**: Create new medicine log with schedule
2. **Edit Medicine**: Update dosage, frequency, time of day
3. **Delete Medicine**: Remove medicine from tracker
4. **Log Dose**: Mark dose as taken (timestamp recorded)
5. **Log Missed Dose**: Mark dose as missed (with optional reason)
6. **View History**: See complete usage and missed dose history
7. **Adherence Score**: Calculate adherence percentage
8. **Stock Tracking**: Monitor remaining quantity
9. **Refill Alerts**: Predict when refill needed (based on usage)
10. **Active/Inactive**: Mark medicines as active or completed

---

## 🛠️ Shared/Common Files

### Backend Shared Files

| File | Location | Function |
|------|----------|----------|
| **app.js** | `backend/src/` | Express app config: CORS, body-parser, routes, error handling |
| **server.js** | `backend/src/` | Server entry point: connects to MongoDB, starts Express on port 5000 |
| **database.js** | `backend/src/config/` | MongoDB connection configuration |
| **logger.js** | `backend/src/config/` | Winston logger for structured logging |
| **errorHandler.js** | `backend/src/middlewares/` | Global error handling middleware |
| **notFoundHandler.js** | `backend/src/middlewares/` | 404 handler for undefined routes |
| **requestContext.js** | `backend/src/middlewares/` | Adds request tracking and unique IDs |
| **validateRequest.js** | `backend/src/middlewares/` | Request validation middleware factory |
| **asyncHandler.js** | `backend/src/utils/` | Async/await error wrapper (reduces try-catch boilerplate) |
| **fileCache.js** | `backend/src/utils/` | File-based caching for datasets |
| **pathHelpers.js** | `backend/src/utils/` | Cross-platform path utilities |
| **index.js** | `backend/src/routes/` | Main route aggregator (combines all routes) |

### Frontend Shared Files

| File | Location | Function |
|------|----------|----------|
| **main.jsx** | `frontend/src/` | React entry point: renders App with AuthContext and ApiContext |
| **App.jsx** | `frontend/src/` | Main React component: router setup, route definitions, protected routes |
| **ApiContext.jsx** | `frontend/src/context/` | Axios instance with base URL, request/response interceptors, token injection |
| **useApi.js** | `frontend/src/hooks/` | Custom hook for API calls: loading, error, data states |
| **Navbar.jsx** | `frontend/src/components/layout/` | Navigation bar: shows/hides links based on auth, logout button |
| **Footer.jsx** | `frontend/src/components/layout/` | Footer component with copyright and links |
| **LoadingSpinner.jsx** | `frontend/src/components/shared/` | Reusable loading indicator |
| **ErrorMessage.jsx** | `frontend/src/components/shared/` | Error display component |
| **HomePage.jsx** | `frontend/src/pages/` | Landing page: hero section, feature showcase, "Get Started" button |
| **main.scss** | `frontend/src/styles/` | Main styles and theme variables |
| **variables.scss** | `frontend/src/styles/` | SCSS variables for colors, fonts, spacing |

---

## 📦 Scripts (Utilities)

| File | Location | Purpose |
|------|----------|---------|
| **buildMedicineDataset.mjs** | `backend/scripts/` | Build and process medicine dataset from CSV |
| **debugEnv.mjs** | `backend/scripts/` | Debug environment variables |
| **parseEnv.mjs** | `backend/scripts/` | Parse .env file |
| **pingGemini.mjs** | `backend/scripts/` | Test Gemini API connection |
| **seedFromDatasets.mjs** | `backend/scripts/` | Seed database from CSV files (if models were active) |
| **showEnv.mjs** | `backend/scripts/` | Display environment variables |
| **testKnowledge.mjs** | `backend/scripts/` | Test knowledge service functionality |
| **testSymptomScenarios.mjs** | `backend/scripts/` | Test symptom analysis with sample scenarios |
| **test-service-loading.js** | `backend/` | Test service loading and imports |
| **test-with-db.js** | `backend/` | Test database connection |

---

## 🗄️ Database Summary

### Collections That Save Data

| Collection | Feature | Model File | Records |
|------------|---------|------------|---------|
| **users** | Authentication | `User.js` | User accounts (name, email, password) |
| **medicinelogs** | Medicine Tracker | `MedicineLog.js` | Medicine tracking (doses, adherence, stock) |

### Empty Models (Not Used)

| Model File | Status | Potential Use |
|------------|--------|---------------|
| **Prescription.js** | ⚠️ Empty | Could save prescription upload history |
| **UserQuery.js** | ⚠️ Empty | Could save symptom query history |
| **Disease.js** | ⚠️ Empty | Data loaded from CSV instead |
| **Symptom.js** | ⚠️ Empty | Data loaded from JSON instead |
| **Medicine.js** | ⚠️ Empty | Data loaded from CSV instead |

---

## 🤖 AI Services & External APIs

### Google Gemini API
**Used By**: Smart Diagnosis, Medical Knowledge Simplifier, Prescription Insight (fallback)

**Functions**:
1. **Symptom Analysis**: Analyzes symptoms and suggests diseases with confidence scores
2. **Natural Language Search**: Processes user queries like "medicine for headache"
3. **OCR Fallback**: When Tesseract can't detect medicines clearly

**Configuration**:
- API Key required in `.env`: `GEMINI_API_KEY`
- Model: `gemini-pro`
- Temperature: 0.7 (balanced creativity)

### Tesseract.js OCR
**Used By**: Prescription Insight

**Functions**:
1. Text extraction from prescription images
2. Handwriting recognition (with limitations)
3. Medicine name detection

**Configuration**:
- Language: English (`eng.traineddata`)
- Runs locally (no API key needed)
- PSM mode: 6 (assume uniform text block)

---

## 📊 Feature Comparison Table

| Feature | Frontend | Backend | Database | AI Used | Status |
|---------|----------|---------|----------|---------|--------|
| **Authentication** | ✅ LoginPage, RegisterPage | ✅ authController | ✅ User | ❌ | Complete |
| **Smart Diagnosis** | ✅ DiagnosisPage | ✅ diagnosisController | ❌ | ✅ Gemini | Working (no history) |
| **Prescription Insight** | ✅ PrescriptionPage | ✅ prescriptionController | ❌ | ✅ Gemini (fallback) | Working (no history) |
| **Medical Knowledge** | ✅ KnowledgePage | ✅ knowledgeController | ❌ | ✅ Gemini | Working (no history) |
| **Medicine Tracker** | ✅ MedicineLogsPage | ✅ medicineLogController | ✅ MedicineLog | ❌ | Complete |

---

## 🎨 Design & Styling

### Theme Colors
```scss
$primary-bg: #0A1A2F;      // Dark Navy
$accent: #00D4C9;          // Teal
$card-bg: #F6F9FC;         // White
$text-dark: #0A1A2F;       // Dark text on light bg
$text-light: #FFFFFF;      // Light text on dark bg
```

### Style Files by Feature

| Feature | SCSS File | Location |
|---------|-----------|----------|
| Smart Diagnosis | `diagnosis.scss` | `frontend/src/styles/` |
| Prescription Insight | `prescription.scss` | `frontend/src/styles/` |
| Medical Knowledge | `knowledge.scss` | `frontend/src/styles/` |
| Medicine Tracker | `medicine-logs.scss` | `frontend/src/styles/` |
| Global | `main.scss`, `variables.scss` | `frontend/src/styles/` |

---

## 🚀 Getting Started

### Environment Variables

Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/mediassist
JWT_SECRET=your_super_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
NODE_ENV=development
```

### Installation & Running

```bash
# Backend
cd backend
npm install
npm run dev         # Runs on http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev         # Runs on http://localhost:5174
```

### First Time Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Get Gemini API key from Google AI Studio
3. Set up environment variables
4. Run backend and frontend
5. Register a new user
6. Start using features!

---

## 🔮 Future Enhancements

### Potential Database Additions

1. **Prescription History** (`Prescription.js`)
   - Save uploaded prescriptions
   - View past prescriptions
   - Track medicine changes over time

2. **Symptom Query History** (`UserQuery.js`)
   - Save symptom checks
   - View diagnosis history
   - Track health patterns

3. **Search History** (Knowledge feature)
   - Save medicine searches
   - Frequently searched medicines
   - Personalized suggestions

### Feature Enhancements

1. **Medicine Reminders**
   - Push notifications at dose times
   - SMS reminders
   - Email alerts

2. **Advanced OCR**
   - Integrate handwriting model (`prescription_ocr_best.h5`)
   - Better accuracy for handwritten prescriptions
   - Multi-language support

3. **Doctor Consultation**
   - Connect with doctors
   - Share diagnosis reports
   - Get prescriptions online

4. **Export Reports**
   - PDF export of adherence reports
   - Share with doctors
   - Print medicine schedules

5. **Multi-language Support**
   - Hindi, Tamil, Telugu, etc.
   - Regional medicine names
   - Localized health advice

---

## 📞 Troubleshooting

### Backend Issues

**Problem**: Server won't start
- Check MongoDB is running
- Verify `.env` file exists with correct values
- Check port 5000 is not in use

**Problem**: Authentication errors
- Verify JWT_SECRET in `.env`
- Check token expiry (7 days)
- Clear localStorage in browser

**Problem**: Gemini API errors
- Verify GEMINI_API_KEY is correct
- Check API quota/limits
- Check internet connection

### Frontend Issues

**Problem**: Can't login after registration
- Check backend is running
- Verify CORS settings
- Check browser console for errors

**Problem**: Prescription upload fails
- Check file size (max 5MB)
- Verify file format (JPG, PNG)
- Check backend upload folder exists

**Problem**: Adherence shows 100% with no data
- Update to latest code (fixed in medicineLogController.js)
- Returns null when no data now

---

## 📋 Quick Reference

### All API Endpoints

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/profile

Smart Diagnosis:
POST   /api/diagnosis/analyze
GET    /api/diagnosis/symptoms/metadata

Prescription Insight:
POST   /api/prescriptions/analyze

Medical Knowledge:
POST   /api/knowledge/search
GET    /api/knowledge/medicine/:name

Medicine Tracker:
GET    /api/medicine-logs
POST   /api/medicine-logs
PUT    /api/medicine-logs/:id
DELETE /api/medicine-logs/:id
POST   /api/medicine-logs/:id/dose
POST   /api/medicine-logs/:id/missed
GET    /api/medicine-logs/adherence
```

### File Structure Quick Map

```
📁 MediAssist/
├── 🔙 backend/
│   ├── src/
│   │   ├── controllers/      → authController, diagnosisController, prescriptionController, knowledgeController, medicineLogController
│   │   ├── models/           → User (✅), MedicineLog (✅), Others (⚠️ empty)
│   │   ├── routes/           → authRoutes, diagnosisRoutes, prescriptionRoutes, knowledgeRoutes, medicineLogRoutes
│   │   ├── services/         → symptomService, prescriptionService, knowledgeService
│   │   ├── middlewares/      → auth, errorHandler, validateRequest
│   │   └── utils/            → jwtHelper, asyncHandler, fileCache
│   ├── uploads/prescriptions/ → Temporary prescription images
│   └── scripts/              → Test and utility scripts
├── 🎨 frontend/
│   └── src/
│       ├── pages/            → LoginPage, RegisterPage, DiagnosisPage, PrescriptionPage, KnowledgePage, MedicineLogsPage, DashboardPage
│       ├── components/       → Navbar, Footer, Forms, Shared components
│       ├── context/          → AuthContext, ApiContext
│       └── styles/           → SCSS files for each feature
└── 📊 datasets/
    ├── raw/                  → CSV files with medicine/disease data
    ├── lookups/              → Processed JSON lookups
    └── models/               → AI model configs and symptom metadata
```

---

**Last Updated**: October 28, 2025  
**Version**: 1.0.0  
**Total Files Documented**: 80+

