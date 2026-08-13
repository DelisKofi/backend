import { Router } from "express";
import { validateBody } from "../../middlewares/validateBody.js";
import {
  createProduct,
  getProductStats,
  updateProduct,
  getProducts,
  getProduct,
  deleteProduct,
  linkProductBranch,
  scanProductByBarcode,
} from "./product.controller.js";
import { linkProductBranchSchema } from "./product.validation.js";

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateProduct:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - cost
 *         - retailPrice
 *         - wholesalePrice
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [Electronics, Accessories, Groceries, Beverages]
 *         branch:
 *           type: string
 *         branchId:
 *           type: string
 *         cost:
 *           type: number
 *         retailPrice:
 *           type: number
 *         wholesalePrice:
 *           type: number
 *         unitBarcode:
 *           type: string
 *         boxBarcode:
 *           type: string
 *         stockQuantity:
 *           type: integer
 *         lowStockThreshold:
 *           type: integer
 *         imageDataUrls:
 *           type: array
 *           items:
 *             type: string
 *         imageUrls:
 *           type: array
 *           description: Array of Cloudinary URLs. Upload images first via /api/v1/media/upload.
 *           items:
 *             type: string
 *         imageUrl:
 *           type: string
 *           description: Primary image URL (usually the first element of imageUrls).
 *         packaging:
 *           type: object
 *           properties:
 *             hasBoxes:
 *               type: boolean
 *               default: false
 *             itemsPerBox:
 *               type: integer
 *               default: 1
 *     UpdateProduct:
 *       type: object
 *       properties:
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [Electronics, Accessories, Groceries, Beverages]
 *         branch:
 *           type: string
 *         branchId:
 *           type: string
 *         cost:
 *           type: number
 *         retailPrice:
 *           type: number
 *         wholesalePrice:
 *           type: number
 *         unitBarcode:
 *           type: string
 *         boxBarcode:
 *           type: string
 *         stockQuantity:
 *           type: integer
 *         lowStockThreshold:
 *           type: integer
 *         imageDataUrls:
 *           type: array
 *           items:
 *             type: string
 *         imageUrls:
 *           type: array
 *           description: Array of Cloudinary URLs. Upload images first via /api/v1/media/upload.
 *           items:
 *             type: string
 *         imageUrl:
 *           type: string
 *           description: Primary image URL (usually the first element of imageUrls).
 *         packaging:
 *           type: object
 *           properties:
 *             hasBoxes:
 *               type: boolean
 *             itemsPerBox:
 *               type: integer
 *     ProductResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         sku:
 *           type: string
 *         category:
 *           type: string
 *         cost:
 *           type: number
 *         wholesale:
 *           type: number
 *           description: Wholesale price
 *         retail:
 *           type: number
 *           description: Retail price
 *         stock:
 *           type: number
 *           description: Resolved stock quantity (branch-specific or total depending on query params)
 *         lowStockThreshold:
 *           type: integer
 *         unitBarcode:
 *           type: string
 *         boxBarcode:
 *           type: string
 *         imageUrl:
 *           type: string
 *           description: Primary image URL
 *         imageUrls:
 *           type: array
 *           description: Array of all image URLs
 *           items:
 *             type: string
 *         branch:
 *           type: string
 *         branchId:
 *           type: string
 *         specs:
 *           type: string
 *           description: Product description / specifications
 *         packaging:
 *           type: object
 *           properties:
 *             hasBoxes:
 *               type: boolean
 *             itemsPerBox:
 *               type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/admin/products:
 *   get:
 *     summary: Get all products (paginated, filterable)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (enables pagination when used with limit)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Number of items per page (max 1000; stable sort by _id asc)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Case-insensitive search by product name
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Case-insensitive search by SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Electronics, Accessories, Groceries, Beverages]
 *         description: Filter by category (use "all" to skip)
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch ID. Stock returned will be for this branch only.
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *         description: Filter by branch name (use "all" to skip). Stock returned will be for this branch only.
 *       - in: query
 *         name: dedupeSearch
 *         schema:
 *           type: boolean
 *         description: Global dedupe search for add-product flow (requires name and/or barcode; ignores branchId filter)
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: Exact match on unitBarcode or packaging barcodes (use with dedupeSearch=true)
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductResponse'
 *                 meta:
 *                   type: object
 *                   description: Present only when page and limit are provided
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProduct'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProductResponse'
 *
 * /api/v1/admin/products/stats:
 *   get:
 *     summary: Get inventory dashboard statistics
 *     description: Returns aggregated inventory stats — total SKUs, low stock count, out of stock count, and total inventory value. Filter by branchId or branch name for per-branch stats, or omit for global stats across all branches.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter stats for a specific branch by ID
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *         description: Filter stats for a specific branch by name (use "all" to get global stats)
 *     responses:
 *       200:
 *         description: Inventory statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSkus:
 *                       type: integer
 *                       description: Total number of unique products
 *                       example: 142
 *                     lowStockCount:
 *                       type: integer
 *                       description: Number of products at or below their low stock threshold (but not zero)
 *                       example: 8
 *                     outOfStockCount:
 *                       type: integer
 *                       description: Number of products with zero or negative stock
 *                       example: 3
 *                     totalInventoryValue:
 *                       type: number
 *                       description: Sum of (cost × stock) for all products
 *                       example: 45200.00
 *
 * /api/v1/admin/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProductResponse'
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProduct'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProductResponse'
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Soft-delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
 *                   example: null
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/v1/admin/products/{id}/branches:
 *   post:
 *     summary: Link an existing global product to a branch
 *     description: Adds a stock entry for the branch on an existing product SKU. Returns 409 if the branch is already linked.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *             properties:
 *               branchId:
 *                 type: string
 *               stockQuantity:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *     responses:
 *       200:
 *         description: Product linked to branch
 *       404:
 *         description: Product or branch not found
 *       409:
 *         description: Product is already linked to this branch
 */

const router = Router();
router.route("/").get(getProducts).post(createProduct);

router.get("/stats", getProductStats);

router.post(
  "/:id/branches",
  validateBody(linkProductBranchSchema),
  linkProductBranch,
);

router.get("/scan/:barcode", scanProductByBarcode);

router.route("/:id").get(getProduct).put(updateProduct).delete(deleteProduct);

export default router;
