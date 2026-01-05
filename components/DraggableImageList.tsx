import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Image as ImageIcon } from "lucide-react";

interface DraggableImageListProps {
  images: string[];
  onReorder: (newImages: string[]) => void;
  onRemove: (imageToRemove: string) => void;
}

interface SortableImageProps {
  url: string;
  id: string;
  index: number;
  onRemove: (url: string) => void;
}

export const SortableImage = ({
  url,
  id,
  index,
  onRemove,
}: SortableImageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative aspect-square cursor-grab touch-none overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 transition-colors hover:border-blue-500 active:cursor-grabbing"
    >
      <img
        src={url}
        alt={`Image ${index + 1}`}
        className="h-full w-full object-cover"
        draggable={false}
      />

      {/* Badge for First Image */}
      {index === 0 && (
        <div className="absolute top-0 left-0 z-20 rounded-br-lg bg-[#00418E] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
          Ảnh bìa
        </div>
      )}

      {/* Remove Button */}
      <button
        type="button"
        className="absolute top-1 right-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:scale-110 hover:bg-red-50"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(url);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const DraggableImageList = ({
  images,
  onReorder,
  onRemove,
}: DraggableImageListProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }

    setActiveId(null);
  };

  if (!images) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((url, index) => (
            <SortableImage
              key={url}
              id={url}
              url={url}
              index={index}
              onRemove={onRemove}
            />
          ))}
          {/* Slot for "Add Image" button usually goes next to the list, but depends on layout */}
        </div>
      </SortableContext>
      <DragOverlay adjustScale={true}>
        {activeId ? (
          <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-blue-500 opacity-80 shadow-2xl">
            <img
              src={activeId}
              alt="Dragging"
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute top-0 left-0 z-20 rounded-br-lg bg-[#00418E] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
              Ảnh bìa
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
