import { Router } from 'express';
import { CentreController } from '../controllers/centre.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createCentreSchema,
  createTestSchema,
  addCentreTestSchema,
  queryCentresSchema,
  centreIdParamSchema,
} from '../validators/centre.validator';

const router = Router();

// Test Catalogue routes (must come before /:id parameter)
router.get('/tests', CentreController.getAllTests);
router.post('/tests', authenticate, validate(createTestSchema), CentreController.createTest);

// Centre routes
router.get('/', validate(queryCentresSchema), CentreController.getAllCentres);
router.get('/:id', validate(centreIdParamSchema), CentreController.getCentreById);
router.post('/', authenticate, validate(createCentreSchema), CentreController.createCentre);
router.post('/:id/tests', authenticate, validate(addCentreTestSchema), CentreController.addTestToCentre);

export default router;
