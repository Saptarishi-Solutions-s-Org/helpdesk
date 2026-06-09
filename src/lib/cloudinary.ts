import { v2 as cloudinary } from "cloudinary";

cloudinary.config();

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function uploadHelpdeskFile(file: File, folder: string) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File must be <= 50MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resourceType = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "raw";

  return new Promise<{
    url: string;
    publicId: string;
    resourceType: "image" | "video" | "file";
  }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `helpdesk/${folder}`,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType:
              resourceType === "raw" ? "file" : (resourceType as "image" | "video"),
          });
        },
      )
      .end(buffer);
  });
}
