import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
    // Skip compression for non-images or small images (< 0.5MB)
    if (!file.type.startsWith('image/') || file.size < 0.5 * 1024 * 1024) {
        return file;
    }

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.7,
        fileType: file.type // Preserve original format
    };

    try {
        const compressedFile = await imageCompression(file, options);
        // Ensure we don't accidentally return a blob with generic name
        const newFile = new File([compressedFile], file.name, {
            type: compressedFile.type,
            lastModified: Date.now()
        });

        console.log(`Original size: ${file.size / 1024 / 1024} MB`);
        console.log(`Compressed size: ${newFile.size / 1024 / 1024} MB`);

        return newFile;
    } catch (error) {
        console.error("Image compression failed:", error);
        return file; // Return original on failure
    }
}
