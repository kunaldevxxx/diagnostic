import { Request, Response, NextFunction } from 'express';
import { CentreService } from '../services/centre.service';
import { ApiResponse } from '../utils/apiResponse';

export class CentreController {
  static async getAllCentres(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { search, city, page, limit } = req.query;
      const result = await CentreService.getAllCentres({
        search: search as string,
        city: city as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Diagnostic centres retrieved successfully',
        data: result.centres,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCentreById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const centre = await CentreService.getCentreById(id);

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Centre details retrieved successfully',
        data: centre,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCentre(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const centre = await CentreService.createCentre(req.body);

      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Diagnostic centre created successfully',
        data: centre,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllTests(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const tests = await CentreService.getAllTests();

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Diagnostic tests catalogue retrieved successfully',
        data: tests,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTest(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const test = await CentreService.createTest(req.body);

      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'Diagnostic test created successfully',
        data: test,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addTestToCentre(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { testId, price, isAvailable } = req.body;

      const mapping = await CentreService.addTestToCentre(id, testId, price, isAvailable);

      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Test added to centre successfully',
        data: mapping,
      });
    } catch (error) {
      next(error);
    }
  }
}
