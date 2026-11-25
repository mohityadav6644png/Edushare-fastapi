# StudyShare FastAPI Backend

A high-performance backend API for StudyShare — an online platform for sharing exam papers and study materials. Converted to and built with **FastAPI**, **Motor** (async MongoDB), **Pydantic v2**, and **Python 3**.

---

## 🚀 Features

- **Asynchronous & High-Performance**: Built on Starlette and Uvicorn using asynchronous I/O and Motor for MongoDB.
- **Auto-generated Interactive Documentation**: Interactive OpenAPI Swagger documentation at `/docs` and ReDoc at `/redoc`.
- **JWT & Cookie Authentication**: Dual authentication support (Bearer token in `Authorization` header and HTTP-only cookies).
- **Role-based Access Control**: Role checks for standard Users and Admins.
- **Secure File Upload**: Multipart file uploads with extension verification (PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG) and 10MB limit enforcement.
- **Material Management**: Upload, review, download tracking, update, and deletion of study materials with approval workflows.
- **Rating & Feedback System**: Unique per-user material ratings with automatic average rating and total count recalculation.
- **Admin Panel Operations**: User management, account block/unblock, material approval/rejection, upload management, and detailed analytical dashboard statistics.
- **Strict Pydantic Validation**: Request payload and query parameter validation with detailed error formatting.
- **Seamless Frontend Compatibility**: 100% path and contract compatibility with the existing React frontend.

---

## 📋 Prerequisites

- **Python**: 3.10 or higher (Python 3.14 recommended)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas
- **pip** package manager

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Ensure `.env` exists in `backend/.env`:
```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/studyshare
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
CLIENT_URL=http://localhost:3000
```

### 3. Initialize Admin Account (Optional)
Run the admin creation script:
```bash
python scripts/create_admin.py
```
*Default admin credentials: `admin@studyshare.com` / `admin123`*

### 4. Start the Server

**Option A (Python directly):**
```bash
python run.py
```

**Option B (Uvicorn CLI):**
```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

**Option C (Using npm / root scripts):**
From `MinorProject/` root or `backend/`:
```bash
npm run dev
# or
npm start
```

The server will be available at: `http://localhost:5000`

---

## 📖 API Documentation & Swagger UI

FastAPI provides built-in interactive API exploration:
- **Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **Swagger UI Alias**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **ReDoc**: [http://localhost:5000/redoc](http://localhost:5000/redoc)
- **OpenAPI Schema**: [http://localhost:5000/openapi.json](http://localhost:5000/openapi.json)

---

## 🧪 Running Tests

A comprehensive pytest test suite is included in `backend/tests/`:
```bash
pytest backend/tests -v
```

---

## 🗂️ Project Structure

```
backend/
├── app/
│   ├── config.py              # Environment and app configuration
│   ├── database.py            # Motor async MongoDB connection & index setup
│   ├── middlewares/
│   │   └── auth.py            # JWT token & cookie authentication dependencies
│   ├── routes/
│   │   ├── auth.py            # /api/auth routes (register, login, me, profile, logout)
│   │   ├── materials.py       # /api/materials routes (upload, list, download, ratings)
│   │   └── admin.py           # /api/admin routes (users, materials, stats, block/unblock)
│   ├── schemas/
│   │   ├── auth.py            # Pydantic schemas for authentication
│   │   ├── material.py        # Pydantic schemas for materials
│   │   ├── rating.py          # Pydantic schemas for ratings
│   │   └── admin.py           # Pydantic schemas for admin panel
│   └── utils/
│       ├── security.py        # bcrypt hashing and JWT token creation/decoding
│       └── file_helper.py     # File storage and validation utilities
├── scripts/
│   └── create_admin.py        # Admin seeding script
├── tests/
│   ├── conftest.py            # Test database setup and fixtures
│   ├── test_api.py            # Core endpoint tests
│   └── test_extended.py       # Admin, aliases, and edge case tests
├── uploads/                   # Uploaded study material storage
├── main.py                    # FastAPI application initialization & middleware
├── run.py                     # Server entrypoint
├── requirements.txt           # Python package requirements
├── package.json               # Updated npm scripts pointing to Python commands
└── README.md
```

---

## 📋 API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user and issue JWT cookie/token
- `GET  /api/auth/me` - Get currently logged-in user profile
- `PUT  /api/auth/profile` - Update current user profile
- `POST /api/auth/logout` - Clear session token cookie

### Materials (`/api/materials`)
- `POST   /api/materials/upload` - Upload new study material (multipart/form-data)
- `GET    /api/materials/my-uploads` - List materials uploaded by the logged-in user
- `GET    /api/materials` - Search and list approved materials (with pagination, filters, sorting)
- `GET    /api/materials/{id}` - Retrieve details of a specific material
- `GET    /api/materials/{id}/download` - Download material file and increment download count
- `PUT    /api/materials/{id}` - Update title, description, subject, semester (uploader only)
- `DELETE /api/materials/{id}` - Delete material and associated file (uploader or admin)
- `POST   /api/materials/{id}/rate` - Add or update rating for a material (1-5 stars)
- `GET    /api/materials/{id}/ratings` - Get list of ratings for a material
- `GET    /api/materials/{id}/ratings/my-rating` - Get current user's rating for a material
- `DELETE /api/materials/{id}/ratings` - Remove current user's rating

### Admin (`/api/admin`)
- `GET    /api/admin/users` - Get paginated list of all users
- `GET    /api/admin/users/{id}` - Get user details and upload statistics
- `PUT    /api/admin/users/{id}/role` - Update a user's role (`user` or `admin`)
- `DELETE /api/admin/users/{id}` - Delete user, their uploads, and ratings
- `PUT    /api/admin/materials/{id}/approve` (or `/api/admin/approve/{id}`) - Approve material
- `DELETE /api/admin/materials/{id}` (or `/api/admin/delete/{id}`) - Reject/delete material
- `GET    /api/admin/materials/pending` - List pending materials awaiting approval
- `GET    /api/admin/uploads` - List all uploads with optional status/subject filters
- `PUT    /api/admin/toggle/{userId}` - Block or unblock a user
- `GET    /api/admin/stats` - Comprehensive analytics dashboard statistics

### Utility
- `GET /api/status` - Health check
- `GET /docs` - Interactive Swagger documentation
