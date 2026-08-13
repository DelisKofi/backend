/* eslint-disable @typescript-eslint/no-explicit-any */
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary
 * @param fileBuffer The file buffer to upload
 * @param folder The folder in Cloudinary to upload to
 * @param publicId Optional public ID for the file (index)
 */
export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string,
  publicId?: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const options: any = {
      folder,
      overwrite: true,
      resource_type: 'auto',
    };
    if (publicId) options.public_id = publicId;

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Removes a file from Cloudinary by its public ID
 * @param publicId The public ID of the file to remove
 */
export const removeFromCloudinary = async (publicId: string) => {
  return await cloudinary.uploader.destroy(publicId);
};

/**
 * Removes all files in a folder from Cloudinary
 * @param folderPath The path of the folder to remove
 */
export const deleteFolderFromCloudinary = async (folderPath: string) => {
  try {
    // Delete all resources in the folder
    await cloudinary.api.delete_resources_by_prefix(folderPath);
    // Delete the folder itself
    await cloudinary.api.delete_folder(folderPath);
  } catch (error) {
    console.error('Error deleting folder from Cloudinary:', error);
  }
};

export default cloudinary;
