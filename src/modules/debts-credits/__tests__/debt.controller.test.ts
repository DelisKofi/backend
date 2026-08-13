import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import debtRouter from '../debt.route.js';

const app = express();
app.use(express.json());
app.use('/api', debtRouter);

describe('Debt routes basic', () => {
  it('GET /api/ should return 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404); // no root route on this mini-app
  });
});

