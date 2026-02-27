import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { vendorController } from './vendor.controller.js';

const router = Router();

router.get('/profile', authenticate, vendorController.getProfile);
router.get('/', vendorController.getAll);

export default router;
