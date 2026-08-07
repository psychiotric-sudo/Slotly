import { useRef, useState } from "react";
import Icon from "./icons";
import type { TeacherTab } from "../types";

interface TeacherTabsProps {
  tabs: TeacherTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export default function TeacherTabs({
  tabs,
  activeId,
  onSelect,
  onRename,
  onAdd,
  onRemove,
}: TeacherTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const draftRef = useRef<HTMLInputElement>(null);

  const commit = (id: string) => {
    const next = draftRef.current?.value ?? "";
    setEditingId(null);
    if (next.trim()) onRename(id, next.trim());
  };

  return (
    <div className="teacher-tabs" role="tablist" aria-label="Class schedules">
      <div className="teacher-tabs-scroll">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const editing = tab.id === editingId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={`teacher-tabs__tab${active ? " active" : ""}`}
              onClick={() => !active && !editing && onSelect(tab.id)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !active && !editing) {
                  e.preventDefault();
                  onSelect(tab.id);
                }
              }}
            >
              {editing ? (
                <input
                  ref={draftRef}
                  className="teacher-tabs__input"
                  defaultValue={tab.name}
                  aria-label="Class section name"
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => commit(tab.id)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") commit(tab.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  spellCheck={false}
                />
              ) : (
                <span className="teacher-tabs__name">{tab.name || "Class"}</span>
              )}
              {!editing && (
                <>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      className="teacher-tabs__action"
                      title="Rename this class"
                      aria-label={`Rename ${tab.name || "class"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(tab.id);
                      }}
                    >
                      <Icon name="pencil" size={13} />
                    </button>
                  )}
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      className="teacher-tabs__action danger"
                      title="Remove this class"
                      aria-label={`Remove ${tab.name || "class"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(tab.id);
                      }}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
        <button type="button" className="teacher-tabs__add" onClick={onAdd} aria-label="Add class">
          <Icon name="plus" size={16} />
          <span>Add class</span>
        </button>
      </div>
    </div>
  );
}