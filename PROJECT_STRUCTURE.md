# MediAssist - Project Structure Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Backend Structure](#backend-structure)
- [Frontend Structure](#frontend-structure)
- [Datasets Structure](#datasets-structure)
- [Database Models](#database-models)

---

## 🎯 Overview

**MediAssist** is a comprehensive medical web application that provides:
- 🩺 **Smart Diagnosis**: AI-powered symptom analysis
- 💊 **Prescription Insight**: OCR-based prescription scanning
- 📚 **Medical Knowledge**: Medicine information lookup
- 📊 **Medicine Tracker**: Medication adherence monitoring with dose logging

**Tech Stack:**
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React 18, Vite, React Router, Bootstrap 5
- **AI Services**: Google Gemini API, Tesseract.js OCR
- **Authentication**: JWT tokens, bcryptjs

---

## 🔙 Backend Structure

### Root Files

#### `backend/package.json`
- **Purpose**: Backend dependencies and scripts
- **Key Dependencies**: 
  - `express` - Web framework
  - `mongoose` - MongoDB ORM
  - `tesseract.js` - OCR for prescription scanning
  - `jsonwebtoken` - JWT authentication
  - `bcryptjs` - Password hashing
  - `express-validator`, `joi` - Request validation

#### `backend/server.js`
- **Purpose**: Main entry point for the backend server
- **Functionality**:
  - Connects to MongoDB database
  - Starts Express server on port 5000
  - Loads environment variables
  - Initializes application middleware

#### `backend/app.js`
- **Purpose**: Express application configuration
- **Functionality**:
  - Sets up middleware (CORS, body-parser, request context)
  - Mounts route handlers
  - Configures error handling
  - Sets up static file serving for uploads

#### `backend/test-service-loading.js`
- **Purpose**: Test script to verify service loading
- **Usage**: `node test-service-loading.js`

#### `backend/test-with-db.js`
- **Purpose**: Test database connection and operations
- **Usage**: `node test-with-db.js`

#### `backend/eng.traineddata`
- **Purpose**: Tesseract OCR language data file for English
- **Usage**: Used by Tesseract.js for text recognition

---

### 📁 `backend/src/config/`

#### `database.js`
- **Purpose**: MongoDB connection configuration
- **Functionality**:
  - Establishes connection to MongoDB
  - Handles connection errors
  - Manages connection lifecycle
  - Uses connection string from environment variables

#### `logger.js`
- **Purpose**: Winston logger configuration
- **Functionality**:
  - Creates structured logging system
  - Logs to console and files
  - Different log levels (info, warn, error, debug)
  - Formats logs with timestamps and context

---

### 📁 `backend/src/controllers/`

#### `authController.js`
- **Purpose**: User authentication and registration
- **Endpoints**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `GET /api/auth/profile` - Get user profile
- **Database Operations**: ✅ Saves to `User` collection
- **Functionality**:
  - Password hashing with bcryptjs
  - JWT token generation (7-day expiry)
  - User validation and error handling

#### `diagnosisController.js`
- **Purpose**: Symptom analysis and diagnosis
- **Endpoints**:
  - `POST /api/diagnosis/analyze` - Analyze symptoms
  - `GET /api/diagnosis/symptoms/metadata` - Get symptom list
- **Database Operations**: ❌ No database persistence
- **Functionality**:
  - AI-powered symptom analysis using Gemini API
  - Returns possible diseases and recommendations
  - Stateless analysis (no query history saved)

#### `prescriptionController.js`
- **Purpose**: Prescription image analysis via OCR
- **Endpoints**:
  - `POST /api/prescriptions/analyze` - Upload and analyze prescription
- **Database Operations**: ❌ No database persistence
- **Functionality**:
  - Tesseract.js OCR text extraction
  - Medicine name detection and matching
  - Dataset lookup for medicine information
  - AI fallback using Gemini for better detection
  - Returns detected medicines with details

#### `knowledgeController.js`
- **Purpose**: Medical knowledge search and medicine lookup
- **Endpoints**:
  - `POST /api/knowledge/search` - Search medicines and diseases
  - `GET /api/knowledge/medicine/:name` - Get specific medicine details
- **Database Operations**: ❌ No database persistence
- **Functionality**:
  - Searches medicine dataset
  - Returns medicine information
  - AI-powered natural language search
  - Stateless search (no search history saved)

#### `medicineLogController.js`
- **Purpose**: Medicine tracking and adherence monitoring
- **Endpoints**:
  - `POST /api/medicine-logs` - Add new medicine
  - `GET /api/medicine-logs` - Get all user medicines
  - `PUT /api/medicine-logs/:id` - Update medicine
  - `DELETE /api/medicine-logs/:id` - Delete medicine
  - `POST /api/medicine-logs/:id/dose` - Log dose taken
  - `POST /api/medicine-logs/:id/missed` - Log missed dose
  - `GET /api/medicine-logs/adherence` - Get adherence statistics
- **Database Operations**: ✅ Saves to `MedicineLog` collection
- **Functionality**:
  - Full CRUD operations for medicine logs
  - Tracks dose history with timestamps
  - Calculates adherence scores
  - Stock level monitoring
  - Refill predictions

---

### 📁 `backend/src/middlewares/`

#### `auth.js`
- **Purpose**: JWT authentication middleware
- **Functionality**:
  - Verifies JWT tokens from headers
  - Attaches user data to request object
  - Protects routes from unauthorized access
  - Returns 401 for invalid/missing tokens

#### `errorHandler.js`
- **Purpose**: Global error handling middleware
- **Functionality**:
  - Catches all application errors
  - Formats error responses consistently
  - Logs errors for debugging
  - Returns appropriate HTTP status codes

#### `notFoundHandler.js`
- **Purpose**: 404 error handler for undefined routes
- **Functionality**:
  - Catches requests to non-existent endpoints
  - Returns 404 status with helpful message

#### `requestContext.js`
- **Purpose**: Adds request tracking and context
- **Functionality**:
  - Generates unique request IDs
  - Adds request metadata
  - Helps with request tracing and debugging

#### `validateRequest.js`
- **Purpose**: Request validation middleware factory
- **Functionality**:
  - Validates request body, params, query
  - Uses express-validator
  - Returns 400 for invalid requests

---

### 📁 `backend/src/models/`

#### `User.js` ✅ **ACTIVE MODEL**
- **Purpose**: User account data
- **Schema**:
  - `name` (String, required)
  - `email` (String, required, unique)
  - `password` (String, required, hashed)
  - Timestamps (createdAt, updatedAt)
- **Methods**:
  - `comparePassword()` - Verify password
- **Used By**: `authController.js`

#### `MedicineLog.js` ✅ **ACTIVE MODEL**
- **Purpose**: User medicine tracking and adherence
- **Schema**:
  - `userId` (ObjectId, ref: User)
  - `medicineName` (String)
  - `dosage` (String)
  - `frequency` (String: daily, twice, thrice, etc.)
  - `timeOfDay` (Array: morning, afternoon, evening, night)
  - `stockQuantity` (Number)
  - `usageHistory` (Array of {takenAt, notes})
  - `missedDoses` (Array of {missedAt, reason})
  - `startDate`, `endDate` (Date)
  - `isActive` (Boolean)
- **Methods**:
  - Calculate adherence scores
  - Track dose history
  - Monitor stock levels
- **Used By**: `medicineLogController.js`

#### `Prescription.js` ⚠️ **EMPTY - NOT USED**
- **Status**: File exists but empty
- **Potential Use**: Could store prescription history
- **Currently**: Prescriptions are analyzed but not saved

#### `UserQuery.js` ⚠️ **EMPTY - NOT USED**
- **Status**: File exists but empty
- **Potential Use**: Could store symptom query history
- **Currently**: Symptom analyses are not saved

#### `Disease.js` ⚠️ **EMPTY - NOT USED**
- **Status**: File exists but empty
- **Note**: Disease data is loaded from CSV files, not database

#### `Symptom.js` ⚠️ **EMPTY - NOT USED**
- **Status**: File exists but empty
- **Note**: Symptom data is loaded from JSON files, not database

#### `Medicine.js` ⚠️ **EMPTY - NOT USED**
- **Status**: File exists but empty
- **Note**: Medicine data is loaded from CSV files, not database

---

### 📁 `backend/src/routes/`

#### `index.js`
- **Purpose**: Main route aggregator
- **Functionality**:
  - Combines all route modules
  - Exports single router
  - Mounts at `/api` in app.js

#### `authRoutes.js`
- **Purpose**: Authentication routes
- **Routes**:
  - `POST /register` - User registration
  - `POST /login` - User login
  - `GET /profile` - Get user profile (protected)

#### `diagnosisRoutes.js`
- **Purpose**: Symptom diagnosis routes
- **Routes**:
  - `POST /analyze` - Analyze symptoms (protected)
  - `GET /symptoms/metadata` - Get symptom list (protected)

#### `prescriptionRoutes.js`
- **Purpose**: Prescription analysis routes
- **Routes**:
  - `POST /analyze` - Upload and analyze prescription (protected)
- **Middleware**: `multer` for file uploads

#### `knowledgeRoutes.js`
- **Purpose**: Medical knowledge routes
- **Routes**:
  - `POST /search` - Search knowledge (protected)
  - `GET /medicine/:name` - Get medicine details (protected)

#### `medicineLogRoutes.js`
- **Purpose**: Medicine tracking routes
- **Routes**:
  - `GET /` - Get all medicines (protected)
  - `POST /` - Add medicine (protected)
  - `PUT /:id` - Update medicine (protected)
  - `DELETE /:id` - Delete medicine (protected)
  - `POST /:id/dose` - Log dose (protected)
  - `POST /:id/missed` - Log missed dose (protected)
  - `GET /adherence` - Get adherence stats (protected)

---

### 📁 `backend/src/services/`

#### `symptomService.js`
- **Purpose**: Symptom analysis business logic
- **Functionality**:
  - Loads symptom metadata from JSON
  - Calls Gemini API for AI diagnosis
  - Matches symptoms to diseases
  - Generates health recommendations
  - Returns possible conditions with confidence scores

#### `prescriptionService.js`
- **Purpose**: Prescription OCR and medicine detection
- **Functionality**:
  - Tesseract.js OCR text extraction
  - Text cleaning and noise removal
  - Medicine name extraction from text
  - Fuzzy matching with medicine dataset (Dice coefficient)
  - AI fallback using Gemini API
  - Returns detected medicines with full details
  - Shows both matched (full info) and unmatched (basic info) medicines

#### `knowledgeService.js`
- **Purpose**: Medical knowledge search
- **Functionality**:
  - Loads medicine dataset from CSV
  - Searches medicines by name or use
  - AI-powered natural language search
  - Returns medicine details (uses, side effects, substitutes)

---

### 📁 `backend/src/utils/`

#### `asyncHandler.js`
- **Purpose**: Async/await error wrapper
- **Functionality**:
  - Wraps async route handlers
  - Automatically catches errors
  - Passes errors to error middleware
  - Reduces try-catch boilerplate

#### `fileCache.js`
- **Purpose**: File-based caching utility
- **Functionality**:
  - Caches frequently accessed files
  - Reduces disk I/O operations
  - Used for loading datasets

#### `jwtHelper.js`
- **Purpose**: JWT token utilities
- **Functionality**:
  - `generateToken()` - Creates JWT tokens
  - `verifyToken()` - Validates JWT tokens
  - Token expiration management (7 days)

#### `pathHelpers.js`
- **Purpose**: File path utilities
- **Functionality**:
  - Resolves absolute paths
  - Handles cross-platform path issues
  - Used for dataset and upload paths

---

### 📁 `backend/src/validation/`

#### `diagnosisValidation.js`
- **Purpose**: Joi validation schemas for diagnosis
- **Validates**:
  - `symptoms` (array of strings, required)
  - `age` (number, 1-120)
  - `gender` (male/female/other)
  - `duration` (string)

#### `knowledgeValidation.js`
- **Purpose**: Joi validation schemas for knowledge search
- **Validates**:
  - `query` (string, required, 2-200 chars)
  - Search parameters

---

### 📁 `backend/scripts/`

#### `buildMedicineDataset.mjs`
- **Purpose**: Build and process medicine dataset
- **Usage**: `node scripts/buildMedicineDataset.mjs`
- **Functionality**: Processes raw CSV data

#### `debugEnv.mjs`
- **Purpose**: Debug environment variables
- **Usage**: `node scripts/debugEnv.mjs`

#### `parseEnv.mjs`
- **Purpose**: Parse .env file
- **Usage**: Helper for environment management

#### `pingGemini.mjs`
- **Purpose**: Test Gemini API connection
- **Usage**: `node scripts/pingGemini.mjs`

#### `seedFromDatasets.mjs`
- **Purpose**: Seed database from CSV files
- **Usage**: `node scripts/seedFromDatasets.mjs`

#### `showEnv.mjs`
- **Purpose**: Display environment variables
- **Usage**: `node scripts/showEnv.mjs`

#### `testKnowledge.mjs`
- **Purpose**: Test knowledge service
- **Usage**: `node scripts/testKnowledge.mjs`

#### `testSymptomScenarios.mjs`
- **Purpose**: Test symptom analysis with scenarios
- **Usage**: `node scripts/testSymptomScenarios.mjs`

---

### 📁 `backend/uploads/`

#### `uploads/pills/`
- **Purpose**: Storage for pill/tablet images
- **Used By**: Future feature (image recognition)

#### `uploads/prescriptions/`
- **Purpose**: Temporary storage for uploaded prescription images
- **Used By**: `prescriptionController.js`
- **Cleanup**: Files should be cleaned periodically

---

## 🎨 Frontend Structure

### Root Files

#### `frontend/package.json`
- **Purpose**: Frontend dependencies and scripts
- **Key Dependencies**:
  - `react` - UI library
  - `react-router-dom` - Client-side routing
  - `bootstrap` - UI framework
  - `axios` - HTTP client
  - `sass` - CSS preprocessing
- **Scripts**:
  - `npm run dev` - Start dev server (port 5174)
  - `npm run build` - Build for production

#### `frontend/vite.config.js`
- **Purpose**: Vite build tool configuration
- **Settings**:
  - React plugin
  - Port: 5174
  - Proxy to backend on port 5000

#### `frontend/index.html`
- **Purpose**: HTML entry point
- **Loads**: React app, Bootstrap CSS, fonts

---

### 📁 `frontend/src/`

#### `main.jsx`
- **Purpose**: React application entry point
- **Functionality**:
  - Renders root React component
  - Wraps app with providers (AuthContext, ApiContext)
  - Mounts to `#root` div

#### `App.jsx`
- **Purpose**: Main React component
- **Functionality**:
  - React Router setup
  - Route definitions
  - Protected route logic
  - Layout structure

---

### 📁 `frontend/src/components/`

#### `components/layout/Navbar.jsx`
- **Purpose**: Navigation bar component
- **Features**:
  - Responsive navigation
  - Shows/hides links based on auth status
  - Medicine Tracker link for authenticated users
  - Logout functionality

#### `components/layout/Footer.jsx`
- **Purpose**: Footer component
- **Content**: Copyright, links, contact info

#### `components/shared/LoadingSpinner.jsx`
- **Purpose**: Reusable loading indicator
- **Usage**: Shown during API calls

#### `components/shared/ErrorMessage.jsx`
- **Purpose**: Error display component
- **Usage**: Shows validation and API errors

#### `components/forms/` (Various form components)
- **Purpose**: Reusable form input components
- **Usage**: Used in registration, login, medicine logging

---

### 📁 `frontend/src/pages/`

#### `HomePage.jsx`
- **Purpose**: Landing page
- **Features**:
  - Hero section
  - Feature showcase
  - "Get Started" button (requires login)

#### `LoginPage.jsx`
- **Purpose**: User login page
- **Features**:
  - Email/password form
  - JWT token storage
  - Redirect to dashboard on success

#### `RegisterPage.jsx`
- **Purpose**: User registration page
- **Features**:
  - Name, email, password, confirm password
  - Client-side validation
  - Redirect to login on success

#### `DiagnosisPage.jsx`
- **Purpose**: Symptom checker page (Protected)
- **Features**:
  - Multi-symptom selection
  - Age, gender, duration inputs
  - AI-powered diagnosis results
  - Possible diseases with confidence scores
  - Health recommendations
- **API**: `POST /api/diagnosis/analyze`
- **Database**: ❌ Results not saved

#### `PrescriptionPage.jsx`
- **Purpose**: Prescription scanner page (Protected)
- **Features**:
  - Image upload (drag & drop or browse)
  - OCR text extraction
  - Medicine detection from prescription
  - Shows ALL detected medicines (matched + unmatched)
  - Medicine details: uses, side effects, price, manufacturer
  - Image preview
- **API**: `POST /api/prescriptions/analyze`
- **Database**: ❌ Prescriptions not saved

#### `KnowledgePage.jsx`
- **Purpose**: Medicine search page (Protected)
- **Features**:
  - Natural language search
  - AI-powered medicine lookup
  - Medicine details display
  - Uses, side effects, substitutes
- **API**: `POST /api/knowledge/search`, `GET /api/knowledge/medicine/:name`
- **Database**: ❌ Searches not saved

#### `MedicineLogsPage.jsx`
- **Purpose**: Medicine tracker page (Protected)
- **Features**:
  - Add new medicines
  - Edit/delete medicines
  - Log doses taken
  - Log missed doses
  - View usage history
  - Stock level tracking
  - Adherence statistics
- **API**: Full CRUD on `/api/medicine-logs`
- **Database**: ✅ Saves to `MedicineLog` collection

#### `DashboardPage.jsx`
- **Purpose**: User dashboard (Protected)
- **Features**:
  - Overview of all features
  - Quick stats
  - Overall adherence score (null when no data)
  - Active medicines count
  - Recent activity
  - Quick action buttons

---

### 📁 `frontend/src/context/`

#### `AuthContext.jsx`
- **Purpose**: Authentication state management
- **Provides**:
  - `user` - Current user data
  - `login()` - Login function
  - `logout()` - Logout function
  - `isAuthenticated` - Auth status
  - JWT token management

#### `ApiContext.jsx`
- **Purpose**: API configuration and utilities
- **Provides**:
  - Axios instance with base URL
  - Request/response interceptors
  - Token injection
  - Error handling

---

### 📁 `frontend/src/hooks/`

#### `useApi.js`
- **Purpose**: Custom hook for API calls
- **Returns**:
  - `loading` - Loading state
  - `error` - Error state
  - `data` - Response data
  - `makeRequest()` - Function to make API calls

---

### 📁 `frontend/src/styles/`

Contains SCSS files for styling:
- `main.scss` - Main styles
- `variables.scss` - Theme variables
- `diagnosis.scss` - Diagnosis page styles
- `prescription.scss` - Prescription page styles
- `knowledge.scss` - Knowledge page styles
- `medicine-logs.scss` - Medicine tracker styles

**Theme Colors**:
- Background: `#0A1A2F` (Dark Navy)
- Accent: `#00D4C9` (Teal)
- Cards: `#F6F9FC` (White)
- Text: White on dark, Dark navy on light

---

## 📊 Datasets Structure

### 📁 `datasets/raw/`

#### `Extensive_A_Z_medicines_dataset_of_India.csv`
- **Purpose**: Comprehensive medicine database
- **Contains**: 10,000+ Indian medicines
- **Fields**:
  - Medicine Name
  - Manufacturer
  - MRP (Price)
  - Substitutes
  - Uses
  - Side Effects
  - Chemical Class
  - Habit Forming
  - Therapeutic Class
  - Action Class
- **Used By**: `prescriptionService.js`, `knowledgeService.js`

#### `DiseaseAndSymptoms.csv`
- **Purpose**: Disease-symptom mapping
- **Used By**: `symptomService.js`

#### `Disease precaution.csv`
- **Purpose**: Disease precautions and recommendations
- **Used By**: `symptomService.js`

#### `prescription_ocr_best (1).h5`
- **Purpose**: Trained model for handwriting recognition (future use)
- **Status**: Not currently integrated

#### `Doctor's Handwritten Prescription BD dataset/`
- **Purpose**: Training data for prescription OCR
- **Structure**: Training, Testing, Validation folders
- **Status**: Reference data for model training

---

### 📁 `datasets/lookups/`

#### `medicines.json`
- **Purpose**: Processed medicine lookup data
- **Generated From**: Raw CSV

#### `diseases.json`
- **Purpose**: Disease information lookup
- **Generated From**: Raw CSV

#### `symptoms.csv`
- **Purpose**: Symptom list and metadata
- **Used By**: Symptom analysis

---

### 📁 `datasets/models/`

#### `symptom_metadata.json`
- **Purpose**: Symptom categories and metadata
- **Used By**: `symptomService.js`

#### `symptom_model.json`
- **Purpose**: Symptom analysis model configuration
- **Used By**: AI symptom analysis

#### `prescription_handwriting/model.json`
- **Purpose**: Prescription handwriting recognition model
- **Status**: Future integration

#### `prescription_handwriting/infer.js`
- **Purpose**: Inference script for handwriting model
- **Status**: Not currently used

---

## 🗄️ Database Models Summary

### Active Collections (Save to MongoDB):

1. **users**
   - User accounts
   - Authentication data
   - Profile information

2. **medicinelogs**
   - User medicine tracking
   - Dose history
   - Adherence data
   - Stock levels

### Inactive Models (Not Saving to DB):

3. **prescriptions** ⚠️ (Empty model)
   - Could store prescription history
   - Currently: Prescriptions analyzed but not saved

4. **userqueries** ⚠️ (Empty model)
   - Could store symptom queries
   - Currently: Diagnoses not saved

5. **diseases** ⚠️ (Empty model)
   - Disease data loaded from CSV instead

6. **symptoms** ⚠️ (Empty model)
   - Symptom data loaded from JSON instead

7. **medicines** ⚠️ (Empty model)
   - Medicine data loaded from CSV instead

---

## 🔐 Authentication Flow

1. User registers → Password hashed → Saved to `users` collection
2. User logs in → JWT token generated (7-day expiry)
3. Token stored in localStorage (frontend)
4. Every API request includes token in Authorization header
5. `auth` middleware verifies token
6. Protected routes accessible only with valid token

---

## 📤 File Upload Flow

1. User uploads prescription image → Saved to `backend/uploads/prescriptions/`
2. Tesseract OCR extracts text
3. Medicine names detected and matched against dataset
4. Results returned to frontend
5. **Note**: Image not saved permanently, no database record

---

## 🤖 AI Services Used

### Gemini API (Google):
- **Symptom Analysis**: Analyzes symptoms and suggests diseases
- **Knowledge Search**: Natural language medicine search
- **Prescription Fallback**: When OCR detection is poor
- **API Key Required**: `GEMINI_API_KEY` in `.env`

### Tesseract.js (Local):
- **OCR**: Extracts text from prescription images
- **No API Key Required**: Runs locally
- **Language**: English (`eng.traineddata`)

---

## 🚀 Getting Started

### Backend:
```bash
cd backend
npm install
# Set up .env file with MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev  # Runs on port 5000
```

### Frontend:
```bash
cd frontend
npm install
npm run dev  # Runs on port 5174
```

### Environment Variables Required:
```env
# Backend .env
MONGODB_URI=mongodb://localhost:27017/mediassist
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

---

## 📝 API Endpoints Summary

| Endpoint | Method | Auth | Database | Purpose |
|----------|--------|------|----------|---------|
| `/api/auth/register` | POST | ❌ | ✅ Saves | User registration |
| `/api/auth/login` | POST | ❌ | ❌ | User login |
| `/api/auth/profile` | GET | ✅ | ❌ | Get user profile |
| `/api/diagnosis/analyze` | POST | ✅ | ❌ | Symptom analysis |
| `/api/diagnosis/symptoms/metadata` | GET | ✅ | ❌ | Get symptom list |
| `/api/prescriptions/analyze` | POST | ✅ | ❌ | Prescription OCR |
| `/api/knowledge/search` | POST | ✅ | ❌ | Search medicines |
| `/api/knowledge/medicine/:name` | GET | ✅ | ❌ | Get medicine details |
| `/api/medicine-logs` | GET | ✅ | ✅ Reads | Get user medicines |
| `/api/medicine-logs` | POST | ✅ | ✅ Saves | Add medicine |
| `/api/medicine-logs/:id` | PUT | ✅ | ✅ Updates | Update medicine |
| `/api/medicine-logs/:id` | DELETE | ✅ | ✅ Deletes | Delete medicine |
| `/api/medicine-logs/:id/dose` | POST | ✅ | ✅ Updates | Log dose taken |
| `/api/medicine-logs/:id/missed` | POST | ✅ | ✅ Updates | Log missed dose |
| `/api/medicine-logs/adherence` | GET | ✅ | ✅ Reads | Get adherence stats |

---

## 🎨 Design Theme

- **Primary**: `#0A1A2F` (Dark Navy)
- **Accent**: `#00D4C9` (Teal)
- **Background**: Dark navy with gradient
- **Cards**: White (`#F6F9FC`)
- **Text**: White on dark, Dark on light
- **Buttons**: Teal with hover effects

---

## 📦 Key Features Status

| Feature | Frontend | Backend | Database | Status |
|---------|----------|---------|----------|--------|
| Authentication | ✅ | ✅ | ✅ | Complete |
| Smart Diagnosis | ✅ | ✅ | ❌ | Working (No history) |
| Prescription Insight | ✅ | ✅ | ❌ | Working (No history) |
| Medical Knowledge | ✅ | ✅ | ❌ | Working (No history) |
| Medicine Tracker | ✅ | ✅ | ✅ | Complete with history |

---

## 🔮 Future Enhancements

1. **Add Prescription History**: Implement `Prescription` model to save uploads
2. **Add Symptom Query History**: Implement `UserQuery` model to track diagnoses
3. **Add Search History**: Track medicine searches in Knowledge feature
4. **Handwriting Model Integration**: Use trained model for better OCR
5. **Medicine Reminders**: Push notifications for dose times
6. **Multi-language Support**: Support regional languages
7. **Doctor Consultation**: Connect users with doctors
8. **Export Reports**: PDF export of health data

---

## 📞 Support

For issues or questions, check:
- Backend logs: `backend/logs/`
- Frontend console: Browser DevTools
- MongoDB: Check collections and documents

---

**Last Updated**: October 28, 2025
**Version**: 1.0.0
