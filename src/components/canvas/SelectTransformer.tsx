import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RotateCw, GripHorizontal } from 'lucide-react';

interface SelectTransformerProps {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    isSelected?: boolean;
    onUpdate: (updates: { x?: number; y?: number; width?: number; height?: number; rotation?: number }) => void;
    onDelete?: () => void;
    minWidth?: number;
    minHeight?: number;
    scale: number; // Viewport scale to keep handles consistent size
}

const HANDLE_SIZE = 10;

/**
 * Select Transformer (Gizmo)
 * 
 * A visual overlay that appears on top of the selected object to allow manipulation.
 * Functionality:
 * - Rendered independently of the canvas content (HTML overlay).
 * - Handles Drag-and-Drop for moving.
 * - Handles Resizing via corner handles.
 * - Handles Rotation via a top handle.
 * - Provides a Delete button.
 * 
 * It calculates the new coordinates/dimensions in 'World Space' and calls `onUpdate`.
 */
export const SelectTransformer: React.FC<SelectTransformerProps> = ({
    x,
    y,
    width,
    height,
    rotation,
    onUpdate,
    onDelete,
    minWidth = 20,
    minHeight = 20,
    scale,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'rotate' | null>(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startPropsRef = useRef({ x, y, width, height, rotation });

    const containerRef = useRef<HTMLDivElement>(null);
    const centerScreenPosRef = useRef({ x: 0, y: 0 });
    const startAngleRef = useRef(0);

    // Calculate handle scale to keep them constant visual size
    const handleScale = 1 / scale;

    const containerStyle = {
        left: `${x}px`,
        top: `${y}px`,
        transform: `rotate(${rotation}rad)`,
        width: `${width}px`,
        height: `${height}px`,
        transformOrigin: 'center center' // Rotate around center
    };

    const handleMouseDown = (e: React.MouseEvent, type: typeof dragType) => {
        e.stopPropagation();
        e.preventDefault(); // Stop text selection
        setIsDragging(true);
        setDragType(type);
        startPosRef.current = { x: e.clientX, y: e.clientY };
        startPropsRef.current = { x, y, width, height, rotation };

        if (type === 'rotate' && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            centerScreenPosRef.current = { x: cx, y: cy };
            startAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx);
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const { x: sx, y: sy, width: sw, height: sh, rotation: sr } = startPropsRef.current;

            // Current mouse delta in SCREEN pixels
            const screenDx = e.clientX - startPosRef.current.x;
            const screenDy = e.clientY - startPosRef.current.y;

            // World delta
            const dx = screenDx / scale;
            const dy = screenDy / scale;

            if (dragType === 'move') {
                onUpdate({
                    x: sx + dx,
                    y: sy + dy,
                });
                return;
            }

            if (dragType === 'rotate') {
                const cx = centerScreenPosRef.current.x;
                const cy = centerScreenPosRef.current.y;
                const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);

                let deltaAngle = currentAngle - startAngleRef.current;

                // Handle wrap-around gracefully
                if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                onUpdate({ rotation: sr + deltaAngle });
                return;
            }

            // Resizing (SE corner - keeping NW corner fixed)
            if (dragType === 'se') {
                const cos = Math.cos(sr);
                const sin = Math.sin(sr);

                // 1. Calculate 'Fixed Point' (NW corner) in World Space
                const cx_old = sx + sw / 2;
                const cy_old = sy + sh / 2;
                // Vector Center->NW (unrotated) = (-sw/2, -sh/2)
                // Rotated: x' = x*cos - y*sin, y' = x*sin + y*cos
                const nw_rot_x = (-sw / 2) * cos - (-sh / 2) * sin;
                const nw_rot_y = (-sw / 2) * sin + (-sh / 2) * cos;

                const fixed_x = cx_old + nw_rot_x;
                const fixed_y = cy_old + nw_rot_y;

                // 2. Calculate New Dims
                const localDx = dx * cos + dy * sin;
                const localDy = -dx * sin + dy * cos;
                const newW = Math.max(minWidth, sw + localDx);
                const newH = Math.max(minHeight, sh + localDy);

                // 3. Calculate New Position to maintain fixed point
                // newX = fixed_x - newW/2 + newW/2*cos - newH/2*sin
                const newX = fixed_x - newW / 2 + (newW / 2) * cos - (newH / 2) * sin;
                // newY = fixed_y - newH/2 + newW/2*sin + newH/2*cos
                // Wait, Y term in vector was nw_rot_y = -w/2*sin - h/2*cos.
                // Fixed_y = NewCenter + (-newW/2*sin + -newH/2*cos)
                // NewCenter = Fixed_y - (-newW/2*sin + -newH/2*cos)
                // NewY = NewCenter_y - newH/2
                // NewY = Fixed_y + newW/2*sin + newH/2*cos - newH/2
                const newY = fixed_y - newH / 2 + (newW / 2) * sin + (newH / 2) * cos;

                onUpdate({
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragType(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragType, onUpdate, scale, minWidth, minHeight]);


    return (
        <div
            ref={containerRef}
            className="absolute border-2 border-blue-500 pointer-events-auto group"
            style={containerStyle}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
            {/* Delete Button (Trash) - Positioned above */}
            {onDelete && (
                <div
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-md rounded-lg p-1.5 cursor-pointer hover:bg-red-50 hover:text-red-500 text-gray-600 transition-colors z-50 flex items-center justify-center"
                    style={{ transform: `scale(${handleScale})` }} // Keep button size constant
                    onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
                >
                    <Trash2 className="w-4 h-4" />
                </div>
            )}

            {/* Resize Handle (SE) */}
            <div
                className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize z-40"
                style={{ transform: `scale(${handleScale})` }}
                onMouseDown={(e) => handleMouseDown(e, 'se')}
            />

            {/* Rotate Handle */}
            <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-blue-500 rounded-full flex items-center justify-center cursor-ew-resize z-40"
                style={{ transform: `scale(${handleScale})` }}
                onMouseDown={(e) => handleMouseDown(e, 'rotate')}
            >
                <RotateCw className="w-3 h-3 text-blue-500" />
            </div>

            {/* Center Pivot (Visual Debug/Helper) */}
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
    );
};
import { Trash2 } from 'lucide-react';
