import { Router } from 'express';
import multer from 'multer';
import { getPresignedUrl, uploadImage, deleteImage } from './media.controller.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media and file upload management
 */

/**
 * @swagger
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload an image to Cloudinary
 *     description: |
 *       Uploads an image to Cloudinary. 
 *       For products, provide `productId` and `index` to organize images in a folder structure: `products/{productId}/{index}`.
 *       If `productId` is not provided but `folder` is set to "products", a temporary folder `products/temp/{uuid}` will be used.
 *       The returned `url` should be saved in the product's `imageUrls` array.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *               productId:
 *                 type: string
 *                 description: ID of the product this image belongs to
 *               index:
 *                 type: integer
 *                 description: Index of the image (0, 1, 2...) for structured storage
 *               folder:
 *                 type: string
 *                 description: Target folder in Cloudinary (defaults to "general")
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     publicId:
 *                       type: string
 *                     format:
 *                       type: string
 *                     bytes:
 *                       type: integer
 *
 * /api/v1/media/delete:
 *   delete:
 *     summary: Delete an image from Cloudinary
 *     description: Removes an image from Cloudinary storage using its public ID.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicId:
 *                 type: string
 *                 description: The Cloudinary public ID of the image to delete (e.g., "products/123/0")
 *     responses:
 *       200:
 *         description: Image deleted successfully
 */

const router = Router();

router.post('/presign', authMiddleware, getPresignedUrl);
router.post('/upload', authMiddleware, upload.single('file'), uploadImage);
router.delete('/delete', authMiddleware, deleteImage);

export default router;
