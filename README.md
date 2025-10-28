# 🏥 MediAssist - AI-Powered Medical Assistant

A comprehensive web application that provides smart medical diagnosis, prescription scanning, medicine information lookup, and medication adherence tracking.

![MediAssist Banner](https://img.shields.io/badge/MediAssist-Medical%20AI-00D4C9?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

## 🌟 Features

### 🩺 Smart Diagnosis
- AI-powered symptom analysis using Google Gemini API
- Multi-symptom checker with age/gender/duration inputs
- Provides possible diseases with confidence scores
- Health recommendations and precautions

### 💊 Prescription Insight
- OCR-based prescription scanner using Tesseract.js
- Extracts medicine names from uploaded prescription images
- Matches medicines against 10,000+ Indian medicine database
- Shows detailed medicine information (uses, side effects, price, substitutes)
- AI fallback for better detection accuracy

### 📚 Medical Knowledge Simplifier
- Natural language medicine search
- Comprehensive medicine information database
- Details include: uses, side effects, manufacturer, price, substitutes
- AI-powered search using Google Gemini

### 📊 Medicine Tracker
- Track medications with dosage schedules
- Log doses taken and missed doses
- Calculate adherence scores
- Stock level monitoring
- Refill predictions and reminders

### 🔐 Authentication System
- Secure user registration and login
- JWT token-based authentication
- Password hashing with bcryptjs
- Protected routes for all features

## 🚀 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Tesseract.js** - OCR for prescription scanning
- **Google Gemini API** - AI-powered analysis
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi & express-validator** - Request validation
- **Winston** - Logging

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Bootstrap 5** - UI framework
- **SASS** - CSS preprocessing

### External Services
- **Google Gemini API** - AI analysis
- **MongoDB Atlas** (optional) - Cloud database

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/mediassist.git
cd mediassist
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file from example
copy .env.example .env
# Edit .env and add your configuration:
# - MONGODB_URI
# - JWT_SECRET
# - GEMINI_API_KEY
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Environment Variables

Create `backend/.env` with the following:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/mediassist
# Or use MongoDB Atlas:
# MONGODB_URI=your_mongoDB_URI

# JWT Secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Google Gemini API Key
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 5. Run the Application

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
# App runs on http://localhost:5174
```

## 📁 Project Structure

```
MediAssist/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, logger configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middlewares/     # Auth, error handling, validation
│   │   ├── models/          # MongoDB schemas (User, MedicineLog)
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic (symptom, prescription, knowledge)
│   │   ├── utils/           # Helper functions
│   │   └── validation/      # Joi validation schemas
│   ├── scripts/             # Utility scripts
│   ├── uploads/             # File uploads (not committed)
│   └── .env.example         # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (Navbar, Footer, Forms)
│   │   ├── context/         # React Context (Auth, API)
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Page components
│   │   └── styles/          # SCSS files
│   └── vite.config.js       # Vite configuration
├── datasets/
│   ├── raw/                 # Raw CSV data (medicines, diseases, symptoms)
│   ├── lookups/             # Processed JSON lookups
│   └── models/              # AI model configs
├── FEATURES_README.md       # Detailed feature documentation
├── PROJECT_STRUCTURE.md     # Complete file structure guide
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login user
GET    /api/auth/profile               - Get user profile (protected)
```

### Smart Diagnosis
```
POST   /api/diagnosis/analyze          - Analyze symptoms (protected)
GET    /api/diagnosis/symptoms/metadata - Get symptom list (protected)
```

### Prescription Insight
```
POST   /api/prescriptions/analyze      - Upload & analyze prescription (protected)
```

### Medical Knowledge
```
POST   /api/knowledge/search           - Search medicines (protected)
GET    /api/knowledge/medicine/:name   - Get medicine details (protected)
```

### Medicine Tracker
```
GET    /api/medicine-logs              - Get all medicines (protected)
POST   /api/medicine-logs              - Add medicine (protected)
PUT    /api/medicine-logs/:id          - Update medicine (protected)
DELETE /api/medicine-logs/:id          - Delete medicine (protected)
POST   /api/medicine-logs/:id/dose     - Log dose taken (protected)
POST   /api/medicine-logs/:id/missed   - Log missed dose (protected)
GET    /api/medicine-logs/adherence    - Get adherence stats (protected)
```

## 🎨 Design Theme

- **Primary Background**: `#0A1A2F` (Dark Navy)
- **Accent Color**: `#00D4C9` (Teal)
- **Card Background**: `#F6F9FC` (White)
- **Dark Theme**: Professional medical interface with teal accents

## 📊 Database Schema

### User Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### MedicineLog Collection
```javascript
{
  userId: ObjectId (ref: User),
  medicineName: String,
  dosage: String,
  frequency: String,
  timeOfDay: [String],
  stockQuantity: Number,
  usageHistory: [{takenAt: Date, notes: String}],
  missedDoses: [{missedAt: Date, reason: String}],
  startDate: Date,
  endDate: Date,
  isActive: Boolean
}
```

## 🧪 Testing

### Test Symptom Analysis
```bash
cd backend
node scripts/testSymptomScenarios.mjs
```

### Test Knowledge Search
```bash
cd backend
node scripts/testKnowledge.mjs
```

### Test Gemini API Connection
```bash
cd backend
node scripts/pingGemini.mjs
```

## 📝 Usage

1. **Register/Login**: Create an account or login
2. **Smart Diagnosis**: Select symptoms, get AI-powered diagnosis
3. **Prescription Scanner**: Upload prescription image, get medicine details
4. **Search Medicines**: Natural language search for medicine information
5. **Track Medicines**: Add medications, log doses, monitor adherence

## 🚧 Known Limitations

- **No Query History**: Diagnosis, prescription, and search history not saved (only Medicine Tracker persists data)
- **OCR Accuracy**: Handwriting recognition can be challenging (AI fallback helps)
- **API Rate Limits**: Gemini API has usage quotas
- **Dataset**: Medicine data is specific to Indian market

## 🔮 Future Enhancements

- [ ] Save prescription upload history
- [ ] Save symptom check history
- [ ] Medicine search history
- [ ] Push notifications for medicine reminders
- [ ] Integrate handwriting recognition model
- [ ] Multi-language support
- [ ] Doctor consultation feature
- [ ] Export adherence reports as PDF
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini API** for AI-powered analysis
- **Tesseract.js** for OCR capabilities
- **Indian Medicines Dataset** for comprehensive medicine data
- **Bootstrap** for UI components
- **MongoDB** for flexible data storage

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check documentation in `FEATURES_README.md` and `PROJECT_STRUCTURE.md`

## ⚠️ Disclaimer

**This application is for educational purposes only. It should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical concerns.**

---

**Made with ❤️ for better healthcare accessibility**

**Star ⭐ this repo if you find it helpful!**
