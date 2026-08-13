import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/modules/products/product.model.js';
import { generateProductSku, isSystemGeneratedSku } from '../src/utils/productSku.js';

dotenv.config();

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(mongoUri);

  const products = await Product.find({ deletedAt: null }).lean();
  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    const currentSku = (product.sku || '').trim();
    if (currentSku && isSystemGeneratedSku(currentSku)) {
      skippedCount += 1;
      continue;
    }

    let nextSku = generateProductSku(product.name || 'PRODUCT');
    let attempt = 0;

    while (await Product.exists({ sku: nextSku, _id: { $ne: product._id } })) {
      attempt += 1;
      nextSku = generateProductSku(`${product.name || 'PRODUCT'}-${attempt}`);
    }

    await Product.updateOne(
      { _id: product._id },
      { $set: { sku: nextSku } }
    );
    updatedCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        total: products.length,
        updatedCount,
        skippedCount,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
