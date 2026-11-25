const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'StudyShare API Documentation',
    version: '1.0.0',
    description: 'Interactive API documentation for StudyShare - A platform for sharing study materials and exam papers.',
    contact: {
      name: 'StudyShare Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token to authorize protected requests',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Mohit Yadav' },
          email: { type: 'string', example: 'mohit@example.com' },
          role: { type: 'string', enum: ['student', 'teacher', 'admin'], example: 'student' },
        },
      },
      Material: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', example: 'Data Structures Notes' },
          description: { type: 'string', example: 'Comprehensive notes covering trees and graphs' },
          subject: { type: 'string', example: 'Computer Science' },
          category: { type: 'string', example: 'Notes' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'approved' },
          uploader: { $ref: '#/components/schemas/User' },
          filePath: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    { name: 'System', description: 'System health check' },
    { name: 'Authentication', description: 'User registration, login, profile' },
    { name: 'Materials', description: 'Browse, upload, and download study materials' },
    { name: 'Ratings', description: 'Rate and review study materials' },
    { name: 'Admin', description: 'Administrative controls (Admin role required)' },
  ],
  paths: {
    '/api/status': {
      get: {
        tags: ['System'],
        summary: 'Check backend server status',
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Server running' },
                    timestamp: { type: 'string', example: '2026-11-25T06:00:00.000Z' },
                    environment: { type: 'string', example: 'development' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Mohit Yadav' },
                  email: { type: 'string', example: 'mohit@example.com' },
                  password: { type: 'string', example: 'Password123' },
                  role: { type: 'string', enum: ['student', 'teacher'], default: 'student' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error / email already exists' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'mohit@example.com' },
                  password: { type: 'string', example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged in successfully, returns token and user info' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current logged in user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User details returned' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/profile': {
      put: {
        tags: ['Authentication'],
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Mohit Updated' },
                  email: { type: 'string', example: 'newemail@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/api/materials': {
      get: {
        tags: ['Materials'],
        summary: 'Get all approved study materials (with search & filters)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search term for title/description' },
          { name: 'subject', in: 'query', schema: { type: 'string' }, description: 'Filter by subject' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (Notes, Exam Paper, etc.)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'List of materials returned' },
        },
      },
    },
    '/api/materials/upload': {
      post: {
        tags: ['Materials'],
        summary: 'Upload a study material (PDF, image, document)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title', 'category', 'subject', 'file'],
                properties: {
                  title: { type: 'string', example: 'Operating Systems Chapter 1' },
                  description: { type: 'string', example: 'Processes and Threads' },
                  subject: { type: 'string', example: 'Computer Science' },
                  category: { type: 'string', example: 'Notes' },
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Material uploaded successfully' },
          400: { description: 'Invalid file type or size' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/materials/my-uploads': {
      get: {
        tags: ['Materials'],
        summary: 'Get all materials uploaded by the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User materials returned' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/materials/{id}': {
      get: {
        tags: ['Materials'],
        summary: 'Get material details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Material details' },
          404: { description: 'Material not found' },
        },
      },
    },
    '/api/materials/{id}/download': {
      get: {
        tags: ['Materials'],
        summary: 'Download a study material file',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'File download stream' },
          404: { description: 'File not found' },
        },
      },
    },
    '/api/materials/{id}/rate': {
      post: {
        tags: ['Ratings'],
        summary: 'Rate a material (1 to 5 stars)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating'],
                properties: {
                  rating: { type: 'number', minimum: 1, maximum: 5, example: 5 },
                  review: { type: 'string', example: 'Great notes!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rating submitted' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/materials/{id}/ratings': {
      get: {
        tags: ['Ratings'],
        summary: 'Get all ratings for a material',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ratings list' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform analytics & statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Stats data' },
          403: { description: 'Forbidden - Admin only' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Get list of all users',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of users' },
          403: { description: 'Forbidden - Admin only' },
        },
      },
    },
    '/api/admin/materials/pending': {
      get: {
        tags: ['Admin'],
        summary: 'Get materials waiting for approval',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Pending materials' },
          403: { description: 'Forbidden - Admin only' },
        },
      },
    },
    '/api/admin/materials/{id}/approve': {
      put: {
        tags: ['Admin'],
        summary: 'Approve or reject a material',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
          403: { description: 'Forbidden - Admin only' },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
