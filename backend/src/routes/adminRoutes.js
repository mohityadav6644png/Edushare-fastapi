const express = require('express');
const {
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  approveMaterial,
  deleteMaterial,
  getStats,
  getPendingMaterials,
  getUploads,
  toggleUserBlock
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// User management routes
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/role', validate(schemas.updateRole), updateUserRole);
router.delete('/users/:id', deleteUser);

// Material management routes
router.put('/materials/:id/approve', approveMaterial);
router.delete('/materials/:id', deleteMaterial);
router.get('/materials/pending', getPendingMaterials);

// Aliases to satisfy expected API without breaking existing paths
router.get('/uploads', getUploads);
router.put('/approve/:id', approveMaterial);
router.delete('/delete/:id', deleteMaterial);
router.put('/toggle/:userId', toggleUserBlock);

// Statistics route
router.get('/stats', getStats);

module.exports = router;
