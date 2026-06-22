import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import CardView from './CardView';

export default function Card({ task, onOpen, showProject, overlay }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: overlay,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <CardView
      task={task}
      showProject={showProject}
      overlay={overlay}
      grab={!overlay}
      dragging={isDragging}
      innerRef={setNodeRef}
      dragProps={{ ...listeners, ...attributes, style }}
      onClick={() => !overlay && onOpen(task)}
    />
  );
}
