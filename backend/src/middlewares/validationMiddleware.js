const Joi = require("joi");

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errorMessage,
      });
    }

    next();
  };
};

// Validation schemas
const schemas = {
  // User registration validation
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot be more than 50 characters",
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
    password: Joi.string().min(6).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters long",
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "string.empty": "Confirm Password is required",
      }),
    studentId: Joi.string().trim().min(1).max(20).required().messages({
      "string.empty": "Student ID is required",
      "string.min": "Student ID must be at least 1 character long",
      "string.max": "Student ID cannot be more than 20 characters",
    }),
    semester: Joi.string().trim().min(1).max(20).required().messages({
      "string.empty": "Semester is required",
      "string.min": "Semester must be at least 1 character long",
      "string.max": "Semester cannot be more than 20 characters",
    }),
  }),

  // User login validation
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),

  // Profile update validation
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot be more than 50 characters",
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
    studentId: Joi.string().trim().min(1).max(20).required().messages({
      "string.empty": "Student ID is required",
      "string.min": "Student ID must be at least 1 character long",
      "string.max": "Student ID cannot be more than 20 characters",
    }),
    semester: Joi.string().trim().min(1).max(20).required().messages({
      "string.empty": "Semester is required",
      "string.min": "Semester must be at least 1 character long",
      "string.max": "Semester cannot be more than 20 characters",
    }),
  }),

  // Material upload validation
  materialUpload: Joi.object({
    title: Joi.string().trim().min(3).max(100).required().messages({
      "string.empty": "Title is required",
      "string.min": "Title must be at least 3 characters long",
      "string.max": "Title cannot be more than 100 characters",
    }),
    subject: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Subject is required",
      "string.min": "Subject must be at least 2 characters long",
      "string.max": "Subject cannot be more than 50 characters",
    }),
    semester: Joi.string().trim().min(1).max(20).required().messages({
      "string.empty": "Semester is required",
      "string.min": "Semester must be at least 1 character long",
      "string.max": "Semester cannot be more than 20 characters",
    }),
  }).unknown(true),

  // Rating validation
  rating: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      "number.base": "Rating must be a number",
      "number.integer": "Rating must be a whole number",
      "number.min": "Rating must be at least 1",
      "number.max": "Rating cannot be more than 5",
    }),
    comment: Joi.string().trim().max(500).allow("").optional().messages({
      "string.max": "Comment cannot be more than 500 characters",
    }),
  }),

  // User role update validation
  updateRole: Joi.object({
    role: Joi.string().valid("user", "admin").required().messages({
      "any.only": 'Role must be either "user" or "admin"',
      "string.empty": "Role is required",
    }),
  }),

  // Query parameters validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string()
      .valid(
        "newest",
        "oldest",
        "title",
        "subject",
        "downloads",
        "rating",
        "name",
        "email"
      )
      .optional(),
    search: Joi.string().trim().max(100).optional(),
    subject: Joi.string().trim().max(50).optional(),
    semester: Joi.string().trim().max(20).optional(),
    role: Joi.string().valid("user", "admin").optional(),
  }),
  materialUpdate: {
    body: Joi.object({
      title: Joi.string().min(3).max(200),
      description: Joi.string().max(1000),
      subject: Joi.string().valid(
        "Mathematics",
        "Physics",
        "Chemistry",
        "Computer Science",
        "Engineering",
        "Business",
        "Literature",
        "History",
        "Other"
      ),
      semester: Joi.number().integer().min(1).max(8),
    }).min(1), // At least one field required
  },
};

// Export validation functions
module.exports = {
  validate,
  schemas,
};
