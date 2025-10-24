import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateImage, editImage, removeBackground, inpaintImage, sketchToImage, EditedImageResult, GenerateImageOptions } from '../services/geminiService';
import Spinner from './Spinner';
import { UploadIcon, MagicWandIcon, DownloadIcon, InfoIcon, EraserIcon, PaintBrushIcon, ImageIcon, SparklesIcon, ArrowLeftIcon } from './IconComponents';

type Style = GenerateImageOptions['style'];
type Quality = GenerateImageOptions['quality'];
type AspectRatio = GenerateImageOptions['aspectRatio'];
type EditMode = 'none' | 'inpaint';
type Tool = 'select' | 'generate' | 'edit' | 'sketch';

interface ToolCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

const GeneratorPage: React.FC = () => {
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [prompt, setPrompt] = useState<string>('');
    const [image, setImage] = useState<string | null>(null);
    const [originalImage, setOriginalImage] = useState<{data: string, mime: string} | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Editing state
    const [editMode, setEditMode] = useState<EditMode>('none');

    // Inpainting state
    const inpaintCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingInpaint = useRef(false);
    const [brushSize, setBrushSize] = useState(40);
    const [hasMask, setHasMask] = useState(false);
    
    // Sketching State
    const sketchCanvasRef = useRef<HTMLCanvasElement>(null);
    const isSketching = useRef(false);
    const [sketchBrushSize, setSketchBrushSize] = useState(10);
    const [hasSketch, setHasSketch] = useState(false);

    // Advanced settings state
    const [style, setStyle] = useState<Style>('realistic');
    const [quality, setQuality] = useState<Quality>('standard');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isProMode, setIsProMode] = useState<boolean>(false);
    const [editStrength, setEditStrength] = useState<number>(0.5);

    const clearInpaintCanvas = useCallback(() => {
        const canvas = inpaintCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setHasMask(false);
        }
    }, []);

    const clearSketchCanvas = useCallback(() => {
        const canvas = sketchCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setHasSketch(false);
        }
    }, []);

    const resetState = useCallback((keepTool = false) => {
        setPrompt('');
        setImage(null);
        setOriginalImage(null);
        setError(null);
        setLoading(false);
        setEditMode('none');
        clearInpaintCanvas();
        clearSketchCanvas();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (!keepTool) {
           setActiveTool('select');
        }
    }, [clearInpaintCanvas, clearSketchCanvas]);
    
    // Canvas setup for inpainting
    useEffect(() => {
        if (activeTool !== 'edit' || editMode !== 'inpaint' || !inpaintCanvasRef.current || !imageRef.current) return;
        const canvas = inpaintCanvasRef.current;
        const imageEl = imageRef.current;
        const setCanvasSize = () => { canvas.width = imageEl.clientWidth; canvas.height = imageEl.clientHeight; };
        if (imageEl.complete) { setCanvasSize(); } else { imageEl.onload = setCanvasSize; }
        window.addEventListener('resize', setCanvasSize);
        return () => { window.removeEventListener('resize', setCanvasSize); if (imageEl) imageEl.onload = null; };
    }, [activeTool, editMode, image]);
    
    // Canvas setup for sketching
    useEffect(() => {
        if (activeTool !== 'sketch' || !sketchCanvasRef.current) return;
        const canvas = sketchCanvasRef.current;
        const setCanvasSize = () => {
             const container = canvas.parentElement;
             if (container) {
                 canvas.width = container.clientWidth;
                 canvas.height = container.clientHeight;
             }
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);
        return () => window.removeEventListener('resize', setCanvasSize);
    }, [activeTool]);
    
    useEffect(() => {
        if(originalImage && activeTool !== 'edit') {
            setActiveTool('edit');
        }
    }, [originalImage, activeTool]);

    // Drawing Handlers (shared logic)
    const getCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement | null): { x: number, y: number } | null => {
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const event = e.nativeEvent instanceof MouseEvent ? e.nativeEvent : e.nativeEvent instanceof TouchEvent ? e.nativeEvent.touches[0] : null;
        if (!event) return null;
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    // Inpaint Drawing
    const startInpaint = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawingInpaint.current = true;
        const coords = getCoords(e, inpaintCanvasRef.current);
        if(!coords) return;
        const ctx = inpaintCanvasRef.current?.getContext('2d');
        if (ctx) { ctx.beginPath(); ctx.moveTo(coords.x, coords.y); }
    };
    const drawInpaint = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingInpaint.current) return;
        e.preventDefault();
        const coords = getCoords(e, inpaintCanvasRef.current);
        if(!coords) return;
        const ctx = inpaintCanvasRef.current?.getContext('2d');
        if (ctx && imageRef.current) {
            ctx.lineTo(coords.x, coords.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = brushSize * (inpaintCanvasRef.current!.width / imageRef.current.naturalWidth);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    };
    const stopInpaint = () => {
        isDrawingInpaint.current = false;
        if(inpaintCanvasRef.current) {
            const ctx = inpaintCanvasRef.current.getContext('2d');
            if (ctx) {
                const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, inpaintCanvasRef.current.width, inpaintCanvasRef.current.height).data.buffer);
                if (pixelBuffer.some(color => color !== 0)) {
                    setHasMask(true);
                }
            }
        }
    };

    // Sketch Drawing
    const startSketch = (e: React.MouseEvent | React.TouchEvent) => {
        isSketching.current = true;
        const coords = getCoords(e, sketchCanvasRef.current);
        if(!coords) return;
        const ctx = sketchCanvasRef.current?.getContext('2d');
        if (ctx) { ctx.beginPath(); ctx.moveTo(coords.x, coords.y); }
    }
    const drawSketch = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isSketching.current) return;
        e.preventDefault();
        const coords = getCoords(e, sketchCanvasRef.current);
        if(!coords) return;
        const ctx = sketchCanvasRef.current?.getContext('2d');
        if(ctx){
            ctx.lineTo(coords.x, coords.y);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = sketchBrushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    }
    const stopSketch = () => {
        isSketching.current = false;
        if (sketchCanvasRef.current) {
            const ctx = sketchCanvasRef.current.getContext('2d');
            if (ctx) {
                const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, sketchCanvasRef.current.width, sketchCanvasRef.current.height).data.buffer);
                if (pixelBuffer.some(color => color !== 0)) {
                    setHasSketch(true);
                }
            }
        }
    }
    
    // API Call Handlers
    const handleGenerate = async () => {
        if (!prompt) { setError('Please enter a prompt.'); return; }
        setLoading(true); setError(null); setImage(null); setOriginalImage(null);
        try {
            const options: GenerateImageOptions = { style, quality, aspectRatio };
            const generatedImageUrl = await generateImage(prompt, options);
            setImage(generatedImageUrl);
        } catch (err: any) { setError(err.message || 'An unexpected error occurred.'); } 
        finally { setLoading(false); }
    };

    const handleEdit = async () => {
        if (!prompt) { setError('Please enter an editing instruction.'); return; }
        if (!originalImage) { setError('Please upload an image to edit.'); return; }
        setLoading(true); setError(null);
        try {
            const result: EditedImageResult = await editImage(prompt, originalImage.data, originalImage.mime, isProMode, editStrength);
            if (result.imageUrl) { setImage(result.imageUrl); } 
            else { setError('Editing did not produce a new image.'); }
        } catch (err: any) { setError(err.message || 'An unexpected error occurred.'); } 
        finally { setLoading(false); }
    };
    
    const handleSketchToImage = async () => {
        if (!prompt) { setError('Please describe what your sketch should become.'); return; }
        if (!sketchCanvasRef.current || !hasSketch) { setError('Please draw something on the canvas first.'); return; }
        setLoading(true); setError(null);
        
        const canvas = sketchCanvasRef.current;
        const base64SketchData = canvas.toDataURL('image/png').split(',')[1];

        try {
            const result = await sketchToImage(prompt, base64SketchData);
            if (result.imageUrl) {
                setImage(result.imageUrl);
            } else {
                 setError('Sketch-to-image did not produce a new image.');
            }
        } catch (err: any) { setError(err.message || 'An unexpected error occurred.'); } 
        finally { setLoading(false); }
    }

    const handleInpaint = async () => {
        if (!prompt) { setError('Please enter a description for the area to inpaint.'); return; }
        if (!originalImage || !imageRef.current) { setError('Please upload an image first.'); return; }
        if (!inpaintCanvasRef.current || !hasMask) { setError('Please mask an area on the image to inpaint.'); return; }
        setLoading(true); setError(null);
    
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = imageRef.current.naturalWidth;
        maskCanvas.height = imageRef.current.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');
        
        if (maskCtx) {
            maskCtx.drawImage(
                inpaintCanvasRef.current, 0, 0, inpaintCanvasRef.current.width, inpaintCanvasRef.current.height,
                0, 0, maskCanvas.width, maskCanvas.height
            );
    
            const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) { // If pixel is not transparent
                    data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; // white
                } else {
                    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; // black
                }
                data[i + 3] = 255; // Make opaque
            }
            maskCtx.putImageData(imageData, 0, 0);
    
            const base64MaskData = maskCanvas.toDataURL('image/png').split(',')[1];
    
            try {
                const result = await inpaintImage(prompt, originalImage.data, originalImage.mime, base64MaskData);
                if (result.imageUrl) {
                    setImage(result.imageUrl);
                    setEditMode('none');
                } else {
                    setError('Inpainting did not produce a new image.');
                }
            } catch (err: any) { setError(err.message || 'An unexpected error occurred.'); } 
            finally { setLoading(false); }
        } else {
            setError("Could not create the inpainting mask.");
            setLoading(false);
        }
    };
    
    const handleRemoveBackground = async () => {
        if (!originalImage) { setError('Please upload an image first.'); return; }
        setLoading(true); setError(null);
        try {
            const result = await removeBackground(originalImage.data, originalImage.mime);
            if (result.imageUrl) {
                setImage(result.imageUrl);
            } else {
                setError('Background removal did not produce a new image.');
            }
        } catch (err: any) { setError(err.message || 'An unexpected error occurred.'); } 
        finally { setLoading(false); }
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            resetState(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                const resultStr = reader.result as string;
                const base64String = resultStr.split(',')[1];
                setOriginalImage({ data: base64String, mime: file.type });
                setImage(resultStr);
            };
            reader.readAsDataURL(file);
        }
    };

    const downloadImage = () => {
        if (image) {
            const link = document.createElement('a');
            link.href = image;
            link.download = 'generated-image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const handleMainAction = () => {
        switch(activeTool) {
            case 'generate': handleGenerate(); break;
            case 'edit': 
                if (editMode === 'inpaint') handleInpaint();
                else handleEdit();
                break;
            case 'sketch': handleSketchToImage(); break;
        }
    };
    
    // UI Components
    const renderDashboard = () => (
        <div className="w-full max-w-4xl text-center">
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-500 mb-2">
                    اختر أداتك الإبداعية
                </h1>
                <p className="text-slate-400">ابدأ مشروعك باختيار إحدى الأدوات القوية أدناه.</p>
            </header>
            <div className="grid md:grid-cols-3 gap-6">
                <ToolCard
                    icon={<ImageIcon className="w-10 h-10" />}
                    title="إنشاء صورة من نص"
                    description="حوّل كلماتك وأفكارك إلى صور فنية فريدة."
                    onClick={() => setActiveTool('generate')}
                />
                <ToolCard
                    icon={<SparklesIcon className="w-10 h-10" />}
                    title="تعديل صورة موجودة"
                    description="قم بتحميل صورة وأطلق العنان لإمكانيات التعديل السحرية."
                    onClick={() => { setActiveTool('edit'); fileInputRef.current?.click(); }}
                />
                <ToolCard
                    icon={<PaintBrushIcon className="w-10 h-10" />}
                    title="تحويل الرسم إلى صورة"
                    description="ارسم فكرتك ببساطة ودع الذكاء الاصطناعي يحولها إلى واقع."
                    onClick={() => setActiveTool('sketch')}
                />
            </div>
        </div>
    );

    const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, onClick }) => (
        <button onClick={onClick} className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl backdrop-blur-sm text-center transition-all duration-300 hover:border-sky-500/50 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-sky-500/20 transform hover:-translate-y-2">
            <div className="inline-block p-4 bg-sky-500/10 rounded-full mb-5 border border-sky-500/20 text-sky-400">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm">{description}</p>
        </button>
    );

    const renderActiveTool = () => {
        const toolTitles = {
            generate: "إنشاء صورة من نص",
            edit: "تعديل صورة",
            sketch: "تحويل الرسم إلى صورة واقعية"
        };

        return (
          <div className="w-full max-w-6xl flex-1 flex flex-col">
            <header className="w-full mb-6 flex items-center justify-between">
                <button onClick={() => resetState()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    العودة إلى الأدوات
                </button>
                <h1 className="text-2xl font-bold text-slate-200">{toolTitles[activeTool]}</h1>
            </header>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 shadow-2xl flex-1 flex flex-col md:flex-row gap-6">
                {/* Left Panel: Image/Canvas */}
                <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-md border-2 border-dashed border-slate-600 min-h-[300px] md:min-h-[400px] p-2 relative group overflow-hidden">
                     {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md z-30"><Spinner /></div>}
                     
                     {activeTool === 'sketch' && !image && (
                        <canvas
                            ref={sketchCanvasRef}
                            className="w-full h-full cursor-crosshair bg-white"
                            onMouseDown={startSketch} onMouseMove={drawSketch} onMouseUp={stopSketch} onMouseLeave={stopSketch}
                            onTouchStart={startSketch} onTouchMove={drawSketch} onTouchEnd={stopSketch}
                        />
                     )}

                     {(activeTool !== 'sketch' || image) && (
                         image ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img ref={imageRef} src={image} key={image} alt="Generated or uploaded" className="max-w-full max-h-full h-auto w-auto object-contain rounded-md animate-unblur" style={{ maxHeight: '500px' }}/>
                                {editMode === 'inpaint' && originalImage && (
                                    <canvas
                                        ref={inpaintCanvasRef}
                                        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20"
                                        onMouseDown={startInpaint} onMouseMove={drawInpaint} onMouseUp={stopInpaint} onMouseLeave={stopInpaint}
                                        onTouchStart={startInpaint} onTouchMove={drawInpaint} onTouchEnd={stopInpaint}
                                    />
                                )}
                                <button onClick={downloadImage} className="absolute bottom-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-sky-500 transition-all opacity-0 group-hover:opacity-100 z-10" aria-label="Download image">
                                    <DownloadIcon className="w-6 h-6" />
                                </button>
                            </div>
                         ) : (
                            <div className="text-center text-slate-500 p-4">
                                <MagicWandIcon className="w-16 h-16 mx-auto mb-4" />
                                {activeTool === 'generate' && <p>ستظهر صورتك التي تم إنشاؤها هنا.</p>}
                                {activeTool === 'edit' && <p>قم بتحميل صورة لبدء التعديل.</p>}
                            </div>
                         )
                     )}
                </div>

                {/* Right Panel: Controls */}
                <div className="w-full md:w-80 flex flex-col gap-4">
                    <div>
                          <textarea
                                id="prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                                placeholder={
                                    activeTool === 'generate' ? "صف الصورة التي تريد إنشاءها..." :
                                    activeTool === 'edit' ? "صف التعديل الذي تريده..." :
                                    "صف ما يجب أن يصبح عليه رسمك..."
                                }
                                className="w-full h-32 p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                            />
                    </div>
                    
                    {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</div>}
                    
                    {/* Tool-specific controls */}
                    {activeTool === 'generate' && <AdvancedSettings />}
                    {activeTool === 'edit' && originalImage && <EditControls />}
                    {activeTool === 'sketch' && <SketchControls />}

                    <div className="flex flex-col gap-3 mt-auto">
                        {/* Main Action Button */}
                        <button
                            onClick={handleMainAction}
                            disabled={loading || !prompt || (activeTool === 'edit' && editMode === 'inpaint' && !hasMask) || (activeTool === 'sketch' && !hasSketch) }
                            className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white font-bold py-3 px-4 rounded-md hover:bg-sky-600 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            <MagicWandIcon className="w-5 h-5" />
                             { activeTool === 'generate' ? 'إنشاء' : activeTool === 'edit' ? 'تطبيق التعديل' : 'تحويل الرسم' }
                        </button>

                        {/* Secondary Buttons */}
                        {activeTool === 'edit' && originalImage && (
                             <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { setEditMode(editMode === 'inpaint' ? 'none' : 'inpaint'); clearInpaintCanvas(); }} disabled={loading} className={`w-full flex items-center justify-center gap-2 text-white font-bold py-2 px-2 rounded-md transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed ${editMode === 'inpaint' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                                    <PaintBrushIcon className="w-5 h-5" /> تعديل بالفرشاة
                                </button>
                                <button onClick={handleRemoveBackground} disabled={loading || editMode === 'inpaint'} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2 px-2 rounded-md hover:bg-purple-700 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed">
                                    <EraserIcon className="w-5 h-5" /> إزالة الخلفية
                                </button>
                            </div>
                        )}
                        {activeTool === 'edit' && (
                             <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-md hover:bg-slate-600 transition-all duration-300 disabled:opacity-50">
                                <UploadIcon className="w-5 h-5" /> {originalImage ? 'تغيير الصورة' : 'تحميل للتعديل'}
                            </button>
                        )}

                        {(image || hasSketch) && !loading && (
                            <button onClick={() => resetState(true)} className="w-full bg-slate-600 text-slate-300 font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors mt-2">
                                البدء من جديد
                            </button>
                        )}
                    </div>
                </div>
            </div>
          </div>
        );
    }
    
    const AdvancedSettings = () => (
        <div className="space-y-4 pt-4 border-t border-slate-700">
            <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">النمط الفني</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['realistic', 'anime', 'fantasy'] as const).map((s: Style) => (
                        <button key={s} onClick={() => setStyle(s)} className={`px-2 py-1 text-sm rounded-md transition-colors ${style === s ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            {s === 'realistic' ? 'واقعي' : s === 'anime' ? 'أنمي' : 'خيالي'}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">الجودة</label>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setQuality('standard')} className={`px-2 py-1 text-sm rounded-md transition-colors ${quality === 'standard' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        عادي
                    </button>
                    <button onClick={() => setQuality('hd')} className={`px-2 py-1 text-sm rounded-md transition-colors ${quality === 'hd' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        عالي الدقة
                    </button>
                </div>
            </div>
            <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">نسبة العرض إلى الارتفاع</label>
                <div className="grid grid-cols-3 gap-2">
                     {(['1:1', '16:9', '9:16'] as const).map((ar: AspectRatio) => (
                        <button key={ar} onClick={() => setAspectRatio(ar)} className={`px-2 py-1 text-sm rounded-md transition-colors ${aspectRatio === ar ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            {ar}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const EditControls = () => (
        <div className="space-y-4 pt-4 border-t border-slate-700">
            {editMode === 'inpaint' ? (
                 <div className="space-y-2">
                    <label htmlFor="inpaint-brush-size-slider" className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-300">حجم فرشاة التحديد</span>
                        <span className="text-sm font-bold text-sky-400">{brushSize}px</span>
                    </label>
                    <input
                        id="inpaint-brush-size-slider"
                        type="range" min="10" max="100" step="1"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <button onClick={clearInpaintCanvas} disabled={!hasMask} className="w-full text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                        مسح التحديد
                    </button>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        <label htmlFor="edit-strength-slider" className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-300">قوة التعديل</span>
                            <span className="text-sm font-bold text-sky-400">{Math.round(editStrength * 100)}%</span>
                        </label>
                        <input
                            id="edit-strength-slider"
                            type="range" min="0" max="1" step="0.05"
                            value={editStrength}
                            onChange={(e) => setEditStrength(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="pro-mode-toggle" className="text-sm font-bold text-slate-300 flex items-center gap-2">
                            وضع برو
                            <div className="relative group">
                                <InfoIcon className="w-4 h-4 text-slate-500" />
                                <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-slate-300 bg-slate-900 border border-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    يمنح الذكاء الاصطناعي حرية إبداعية أكبر لتفسير طلبك بشكل درامي.
                                </div>
                            </div>
                        </label>
                        <label htmlFor="pro-mode-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="pro-mode-toggle"
                                checked={isProMode}
                                onChange={(e) => setIsProMode(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                        </label>
                    </div>
                </>
            )}
        </div>
    );
    
    const SketchControls = () => (
        <div className="space-y-4 pt-4 border-t border-slate-700">
             <div className="space-y-2">
                <label htmlFor="sketch-brush-size-slider" className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-300">حجم الفرشاة</span>
                    <span className="text-sm font-bold text-sky-400">{sketchBrushSize}px</span>
                </label>
                <input
                    id="sketch-brush-size-slider"
                    type="range" min="2" max="50" step="1"
                    value={sketchBrushSize}
                    onChange={(e) => setSketchBrushSize(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>
            <button onClick={clearSketchCanvas} className="w-full text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 py-2 rounded-md">مسح الرسم</button>
        </div>
    );
    
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-8">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        {activeTool === 'select' ? renderDashboard() : renderActiveTool()}
      </div>
    );
};

export default GeneratorPage;
