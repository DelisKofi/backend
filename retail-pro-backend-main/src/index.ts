import { env } from './config/env.js';
import express, { type Application, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';

import connectDB from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './errors/notFoundError.js';

import authRouter from './modules/auth/auth.route.js';
import branchRouter from './modules/branches/branch.route.js';
import productRouter from './modules/products/product.route.js';
import customerRouter from './modules/customers/customer.route.js';
import transactionRouter from './modules/transactions/transaction.route.js';
import expenseRouter from './modules/expenses/expense.route.js';
import damageRouter from './modules/damages/damage.route.js';
import auditLogRouter from './modules/audit-logs/auditLog.route.js';
import stockTransferRouter from './modules/stock-transfers/stockTransfer.route.js';
import userRouter from './modules/users/user.route.js';
import roleRouter from './modules/roles/role.route.js';
import syncRouter from './modules/sync/sync.route.js';
import mediaRouter from './modules/media/media.route.js';
import invitationRouter from './modules/invitations/invitation.route.js';
import debtRouter from './modules/debts-credits/debt.route.js';
import reconciliationRouter from './modules/reconciliations/reconciliation.route.js';
import settingRouter from './modules/settings/setting.route.js';
import packagingTypeRouter from './modules/packaging-types/packagingType.route.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import { requireBranchAccess } from './middlewares/roleMiddleware.js';
import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerOptions } from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';
const app: Application = express();




connectDB();


const allowedOrigins = (env.ALLOWED_ORIGINS).split(',');
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`🛑 CORS Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  credentials: true,
};
app.use(cors(corsOptions));


app.use(express.json());

// Health
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'POS Server Active' });
});

// API v1 Routes
const apiV1Router = express.Router();

// Public routes
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/media', mediaRouter);

// Secure generic Sync limits
apiV1Router.use('/sync', syncRouter);

// Secure Admin CRUD Routes (All require standard auth context)
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

adminRouter.use('/branches', branchRouter);
adminRouter.use('/products', productRouter);
adminRouter.use('/customers', customerRouter);
adminRouter.use('/transactions', transactionRouter);
adminRouter.use('/expenses', expenseRouter);
adminRouter.use('/damages', damageRouter);
adminRouter.use('/audit-logs', auditLogRouter);
adminRouter.use('/stock-transfers', stockTransferRouter);
adminRouter.use('/users', userRouter); 
adminRouter.use('/roles', roleRouter);
adminRouter.use('/debts-credits', debtRouter);
adminRouter.use('/reconciliations', reconciliationRouter);
adminRouter.use('/invitations', requireBranchAccess, invitationRouter);
adminRouter.use('/settings', settingRouter);
adminRouter.use('/packaging-types', packagingTypeRouter);

apiV1Router.use('/admin', adminRouter);

app.use('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Retail Pro Server Active' });
})

app.use('/api/v1', apiV1Router);

const specs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


app.use((req: Request, res: Response, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

const port = env.PORT;
app.listen(port, () => {
  console.log(`Server is sprinting on port ${port}🚀🚀🚀🚀🚀🚀🚀🚀`)
})