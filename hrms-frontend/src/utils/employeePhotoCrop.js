const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });

export async function getCroppedImageFile(
    imageSrc,
    pixelCrop,
    fileName = "profile-photo.jpg",
    mimeType = "image/jpeg"
) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        return null;
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    context.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }

                resolve(new File([blob], fileName, { type: mimeType }));
            },
            mimeType,
            0.92
        );
    });
}

export function buildCroppedFileName(originalName) {
    const extension = originalName?.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const baseName = originalName?.replace(/\.[^.]+$/, "") || "profile-photo";
    return `${baseName}-cropped.${extension}`;
}

export function resolveCroppedMimeType(fileType) {
    return fileType === "image/png" ? "image/png" : "image/jpeg";
}
