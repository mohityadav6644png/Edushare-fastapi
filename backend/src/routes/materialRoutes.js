const express = require("express");
const {
  uploadMaterial,
  getMaterials,
  getMaterial,
  downloadMaterial,
  getMyMaterials,
  updateMaterial,
  deleteMaterial,
} = require("../controllers/materialController");
const {
  addRating,
  getMaterialRatings,
  getMyRating,
  deleteRating,
} = require("../controllers/ratingController");
const { protect } = require("../middlewares/authMiddleware");
const { validate, schemas } = require("../middlewares/validationMiddleware");
const { upload } = require("../utils/fileHelper");

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes!

// Protected routes (specific paths first)
router.post(
  "/upload",
  protect,
  upload.single("file"),
  validate(schemas.materialUpload),
  uploadMaterial
);
router.get("/my-uploads", protect, getMyMaterials); // ✅ MOVED UP - before /:id

// Public routes (specific paths before params)
router.get("/", getMaterials);

// Parameterized routes (these should be last)
router.get("/:id", getMaterial);
router.get("/:id/download", downloadMaterial);
router.get("/:id/ratings", getMaterialRatings);

// Rating routes
router.post("/:id/rate", protect, validate(schemas.rating), addRating);
router.get("/:id/ratings/my-rating", protect, getMyRating);
router.delete("/:id/ratings", protect, deleteRating);

module.exports = router;
