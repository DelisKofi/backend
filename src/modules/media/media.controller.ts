import type { Request, Response, NextFunction } from 'express';
import { uploadToCloudinary, removeFromCloudinary } from '../../utils/cloudinary.js';
import { AppError } from '../../errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const { productId, index, folder } = req.body;
    
    // Determine the folder and public ID
    let cloudinaryFolder = folder || 'general';
    let publicId: string | undefined;

    if (productId) {
      cloudinaryFolder = `products/${productId}`;
      if (index !== undefined) {
        publicId = String(index);
      }
    } else if (folder === 'products') {
      // If folder is products but no productId, create a temp folder
      const tempId = uuidv4();
      cloudinaryFolder = `products/temp/${tempId}`;
    }

    const result = await uploadToCloudinary(file.buffer, cloudinaryFolder, publicId);

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      throw new AppError('publicId is required', 400);
    }

    const result = await removeFromCloudinary(publicId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getPresignedUrl = async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      url: 'https://placeholder-upload-url.local/presign',
      message: 'Cloudinary direct upload is preferred. Use /api/v1/media/upload instead.'
    }
  });
};
