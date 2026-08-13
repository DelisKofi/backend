/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { scanProductByBarcode, getProducts } from "../product.controller.js";
import { Product } from "../product.model.js";
import { AppError } from "../../../errors/AppError.js";

describe("product scan and barcode search", () => {
  let findOneSpy: any;
  let findSpy: any;

  beforeEach(() => {
    findOneSpy = jest.spyOn(Product, "findOne");
    findSpy = jest.spyOn(Product, "find");
  });

  afterEach(() => {
    if (findOneSpy) findOneSpy.mockRestore();
    if (findSpy) findSpy.mockRestore();
  });

  describe("scanProductByBarcode", () => {
    it("throws 400 if branchId query param is missing", async () => {
      const req = {
        params: { barcode: "12345" },
        query: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn() as any;

      await scanProductByBarcode(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Branch ID is required");
    });

    it("throws 404 if product is not found", async () => {
      (findOneSpy as any).mockImplementation(
        () =>
          ({
            populate: jest.fn().mockReturnThis(),
            lean: () => Promise.resolve(null),
          }) as any,
      );

      const req = {
        params: { barcode: "12345" },
        query: { branchId: "branch-1" },
      } as any;
      const res = {} as any;
      const next = jest.fn() as any;

      await scanProductByBarcode(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Unknown barcode");
    });

    it("returns unitValue 1 and Single label if unitBarcode matches", async () => {
      const mockProduct = {
        _id: "prod-1",
        name: "Coca Cola",
        unitBarcode: " 12345 ",
        stock: { "branch-1": 10 },
        packaging: {
          enabled: false,
          configurations: [],
        },
      };

      (findOneSpy as any).mockImplementation(
        () =>
          ({
            populate: jest.fn().mockReturnThis(),
            lean: () => Promise.resolve(mockProduct),
          }) as any,
      );

      const req = {
        params: { barcode: "12345" },
        query: { branchId: "branch-1" },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await scanProductByBarcode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          product: expect.objectContaining({
            _id: "prod-1",
            stock: 10,
          }),
          unitValue: 1,
          label: "Single",
        },
      });
    });

    it("returns config values if config barcode matches", async () => {
      const mockProduct = {
        _id: "prod-1",
        name: "Coca Cola",
        unitBarcode: "99999",
        stock: { "branch-1": 10 },
        packaging: {
          enabled: true,
          configurations: [
            {
              packagingTypeId: { _id: "pkg-1", name: "Box" },
              unitsPerPackage: 24,
              barcode: "  box-barcode-123  ",
            },
          ],
        },
      };

      (findOneSpy as any).mockImplementation(
        () =>
          ({
            populate: jest.fn().mockReturnThis(),
            lean: () => Promise.resolve(mockProduct),
          }) as any,
      );

      const req = {
        params: { barcode: "box-barcode-123" },
        query: { branchId: "branch-1" },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await scanProductByBarcode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          product: expect.objectContaining({
            _id: "prod-1",
            stock: 10,
          }),
          unitValue: 24,
          label: "Box",
          packagingConfigIndex: 0,
        },
      });
    });
  });

  describe("getProducts barcode query", () => {
    it("applies exact barcode match to unitBarcode and packaging barcodes", async () => {
      (findSpy as any).mockImplementation(
        () =>
          ({
            sort: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: () => Promise.resolve([]),
          }) as any,
      );

      const req = {
        query: {
          barcode: "12345678",
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await getProducts(req, res, next);

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
          $or: [
            { unitBarcode: { $regex: "^12345678$", $options: "i" } },
            {
              "packaging.configurations.barcode": {
                $regex: "^12345678$",
                $options: "i",
              },
            },
          ],
        }),
      );
    });
  });
});
