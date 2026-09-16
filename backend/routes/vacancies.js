import express from 'express';
import * as controller from '../controllers/vacancies.js';
import { requireAdminOrHR } from '../middleware/auth.js';

const router = express.Router();

// Public
router.get('/', controller.listVacancies);
router.get('/:slug', controller.getVacancy);

// Admin-only
router.post('/', requireAdminOrHR, controller.createVacancy);
router.put('/:id', requireAdminOrHR, controller.updateVacancy);
router.delete('/:id', requireAdminOrHR, controller.deleteVacancy);

export default router;
