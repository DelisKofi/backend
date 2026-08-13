import type { Request, Response, NextFunction } from 'express';
import { GlobalSetting } from './setting.model.js';

export const getGlobalSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let setting = await GlobalSetting.findOne().lean();
    if (!setting) {
      setting = await GlobalSetting.create({});
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) { next(error); }
};

export const updateGlobalSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let setting = await GlobalSetting.findOne();
    if (!setting) {
      setting = new GlobalSetting(req.body);
      await setting.save();
    } else {
      setting.set(req.body);
      await setting.save();
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) { next(error); }
};
