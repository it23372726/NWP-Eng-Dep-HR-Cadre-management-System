import { useCallback, useEffect, useRef, useState } from "react";

import PersonIcon from "@mui/icons-material/Person";
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Slider,
    Stack,
    Typography
} from "@mui/material";
import Cropper from "react-easy-crop";

import {
    EMPLOYEE_PHOTO_ACCEPT,
    EMPLOYEE_PHOTO_MAX_BYTES,
    EMPLOYEE_PHOTO_SIZE
} from "../../constants/hrms";
import { fetchEmployeePhotoBlob } from "../../services/employeeService";
import {
    buildCroppedFileName,
    getCroppedImageFile,
    resolveCroppedMimeType
} from "../../utils/employeePhotoCrop";

const employeePhotoMaxMb = EMPLOYEE_PHOTO_MAX_BYTES / (1024 * 1024);
const CROP_AREA_HEIGHT = 280;

const avatarSx = {
    width: EMPLOYEE_PHOTO_SIZE,
    height: EMPLOYEE_PHOTO_SIZE,
    bgcolor: "grey.200",
    color: "text.secondary"
};

export default function EmployeePhotoUpload({
    employeeId,
    hasExistingPhoto = false,
    open,
    onChange
}) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [error, setError] = useState("");
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [isCropping, setIsCropping] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [pendingFileMeta, setPendingFileMeta] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [applyingCrop, setApplyingCrop] = useState(false);

    const fileInputRef = useRef(null);
    const previewUrlRef = useRef(null);
    const cropImageSrcRef = useRef(null);
    const onChangeRef = useRef(onChange);

    onChangeRef.current = onChange;

    const revokePreviewUrl = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    };

    const revokeCropImageSrc = () => {
        if (cropImageSrcRef.current) {
            URL.revokeObjectURL(cropImageSrcRef.current);
            cropImageSrcRef.current = null;
        }
    };

    const setLocalPreviewUrl = (url) => {
        revokePreviewUrl();
        previewUrlRef.current = url;
        setPreviewUrl(url);
    };

    const resetCropState = () => {
        revokeCropImageSrc();
        setCropImageSrc(null);
        setPendingFileMeta(null);
        setIsCropping(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setApplyingCrop(false);
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        setPhotoFile(null);
        setRemovePhoto(false);
        setError("");
        setLocalPreviewUrl(null);
        resetCropState();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [open]);

    useEffect(() => {
        if (!open || !employeeId || !hasExistingPhoto || photoFile || removePhoto || isCropping) {
            return undefined;
        }

        let cancelled = false;

        const loadExistingPhoto = async () => {
            setLoadingExisting(true);
            try {
                const blob = await fetchEmployeePhotoBlob(employeeId);
                if (cancelled) {
                    return;
                }
                setLocalPreviewUrl(URL.createObjectURL(blob));
            } catch {
                if (!cancelled) {
                    setLocalPreviewUrl(null);
                }
            } finally {
                if (!cancelled) {
                    setLoadingExisting(false);
                }
            }
        };

        loadExistingPhoto();

        return () => {
            cancelled = true;
        };
    }, [open, employeeId, hasExistingPhoto, photoFile, removePhoto, isCropping]);

    useEffect(() => {
        onChangeRef.current?.({ photoFile, removePhoto });
    }, [photoFile, removePhoto]);

    useEffect(
        () => () => {
            revokePreviewUrl();
            revokeCropImageSrc();
        },
        []
    );

    const handleCropComplete = useCallback((_croppedArea, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        setError("");

        if (!file) {
            return;
        }

        if (!EMPLOYEE_PHOTO_ACCEPT.split(",").includes(file.type)) {
            setError("Only JPEG and PNG photos are allowed.");
            event.target.value = "";
            return;
        }

        if (file.size > EMPLOYEE_PHOTO_MAX_BYTES) {
            setError(`Photo must be smaller than ${employeePhotoMaxMb} MB.`);
            event.target.value = "";
            return;
        }

        revokeCropImageSrc();
        const nextCropSrc = URL.createObjectURL(file);
        cropImageSrcRef.current = nextCropSrc;
        setCropImageSrc(nextCropSrc);
        setPendingFileMeta({ name: file.name, type: file.type });
        setIsCropping(true);
        setRemovePhoto(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    const handleCancelCrop = () => {
        resetCropState();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleApplyCrop = async () => {
        if (!cropImageSrc || !croppedAreaPixels || !pendingFileMeta) {
            setError("Adjust the photo position before applying.");
            return;
        }

        setApplyingCrop(true);
        setError("");

        try {
            const mimeType = resolveCroppedMimeType(pendingFileMeta.type);
            const croppedFile = await getCroppedImageFile(
                cropImageSrc,
                croppedAreaPixels,
                buildCroppedFileName(pendingFileMeta.name),
                mimeType
            );

            if (!croppedFile) {
                setError("Could not prepare the cropped photo. Try again.");
                return;
            }

            if (croppedFile.size > EMPLOYEE_PHOTO_MAX_BYTES) {
                setError(`Cropped photo must be smaller than ${employeePhotoMaxMb} MB.`);
                return;
            }

            setPhotoFile(croppedFile);
            setLocalPreviewUrl(URL.createObjectURL(croppedFile));
            resetCropState();
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch {
            setError("Could not prepare the cropped photo. Try again.");
        } finally {
            setApplyingCrop(false);
        }
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setRemovePhoto(true);
        setError("");
        setLocalPreviewUrl(null);
        resetCropState();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const showFallback = !previewUrl && !loadingExisting && !isCropping;
    const canRemove = Boolean(
        (previewUrl || (hasExistingPhoto && !removePhoto)) && !isCropping
    );

    return (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                    {loadingExisting ? (
                        <Avatar sx={avatarSx}>
                            <CircularProgress size={28} />
                        </Avatar>
                    ) : previewUrl && !isCropping ? (
                        <Avatar
                            src={previewUrl}
                            alt="Employee photo preview"
                            sx={{
                                ...avatarSx,
                                bgcolor: "grey.100"
                            }}
                            slotProps={{ img: { style: { objectFit: "cover" } } }}
                        />
                    ) : (
                        <Avatar sx={avatarSx}>
                            <PersonIcon sx={{ fontSize: 56 }} />
                        </Avatar>
                    )}
                </Box>

                <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2">Profile photo</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                        <Button
                            variant="outlined"
                            size="small"
                            component="label"
                            disabled={isCropping || applyingCrop}
                        >
                            {previewUrl || hasExistingPhoto ? "Change photo" : "Choose photo"}
                            <input
                                ref={fileInputRef}
                                hidden
                                type="file"
                                accept={EMPLOYEE_PHOTO_ACCEPT}
                                onChange={handleFileSelect}
                            />
                        </Button>
                        {canRemove && (
                            <Button
                                variant="text"
                                size="small"
                                color="error"
                                onClick={handleRemovePhoto}
                            >
                                Remove photo
                            </Button>
                        )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        JPEG or PNG, up to {employeePhotoMaxMb} MB. Drag and zoom to choose
                        what appears in the circle.
                    </Typography>
                </Stack>
            </Stack>

            {isCropping && cropImageSrc && (
                <Box sx={{ mt: 2 }}>
                    <Box
                        sx={{
                            position: "relative",
                            width: "100%",
                            height: CROP_AREA_HEIGHT,
                            bgcolor: "grey.900",
                            borderRadius: 1,
                            overflow: "hidden"
                        }}
                    >
                        <Cropper
                            image={cropImageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={handleCropComplete}
                        />
                    </Box>

                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                                Zoom
                            </Typography>
                            <Slider
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.05}
                                aria-label="Photo zoom"
                                onChange={(_event, value) => setZoom(value)}
                            />
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                            Drag the photo to position the face inside the circle.
                        </Typography>

                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="contained"
                                size="small"
                                disabled={applyingCrop || !croppedAreaPixels}
                                onClick={handleApplyCrop}
                            >
                                {applyingCrop ? "Applying..." : "Apply photo"}
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={applyingCrop}
                                onClick={handleCancelCrop}
                            >
                                Cancel
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                    {error}
                </Alert>
            )}

            {showFallback && removePhoto && hasExistingPhoto && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    The current photo will be removed when you save.
                </Typography>
            )}
        </Box>
    );
}
