export async function uploadBatch<T>(
  images: T[],
  upload: (image: T) => Promise<void>,
): Promise<T[]> {
  const failed: T[] = [];
  for (const image of images) {
    try {
      await upload(image);
    } catch {
      failed.push(image);
    }
  }
  return failed;
}
