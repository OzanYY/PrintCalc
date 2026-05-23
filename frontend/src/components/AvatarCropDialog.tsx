import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';

interface AvatarCropDialogProps {
    imageSrc: string | null;
    onClose: () => void;
    onConfirm: (blob: Blob) => Promise<void>;
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const img = new Image();
    img.src = imageSrc;
    await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
    });

    const canvas = document.createElement('canvas');
    const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);

    return new Promise((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('Canvas empty'))), 'image/jpeg', 0.92)
    );
}

export function AvatarCropDialog({ imageSrc, onClose, onConfirm }: AvatarCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [saving, setSaving] = useState(false);

    const onCropComplete = useCallback((_: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleConfirm = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setSaving(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
            await onConfirm(blob);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={!!imageSrc} onOpenChange={open => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Обрезать фото</DialogTitle>
                </DialogHeader>

                <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ height: 320 }}>
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3 px-1">
                    <button
                        type="button"
                        onClick={() => setZoom(z => Math.max(1, z - 0.1))}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        className="flex-1 accent-primary"
                    />
                    <button
                        type="button"
                        onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Отмена</Button>
                    <Button onClick={handleConfirm} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Сохранить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
