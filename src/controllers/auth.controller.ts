import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const result = await AuthService.signup(req.body);
      return ApiResponse.success({
        res,
        statusCode: 201,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const result = await AuthService.login(req.body);
      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = await AuthService.getUserProfile(req.user!.userId);
      return ApiResponse.success({
        res,
        statusCode: 200,
        message: 'Current user profile fetched successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
