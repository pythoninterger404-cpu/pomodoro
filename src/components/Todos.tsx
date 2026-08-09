import React, { useState } from 'react';
import { TodoItem } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { playBtnSound } from '../lib/audio';

interface TodosProps {
  todos: TodoItem[];
  onAddTodo: (text: string, estimated: number) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  activeTodoId: string | null;
  onSetActiveTodo: (id: string | null) => void;
}

export const Todos: React.FC<TodosProps> = ({
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  activeTodoId,
  onSetActiveTodo,
}) => {
  const [newText, setNewText] = useState('');
  const [estimated, setEstimated] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddTodo(newText.trim(), estimated);
    setNewText('');
    setEstimated(1);
    playBtnSound();
  };

  const renderDots = (total: number, filled: number) => (
    <div className="flex gap-1" title={`${filled}/${total} sesi selesai`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < filled ? 'bg-[#d9a441]' : 'bg-[#2b3038]'}`}
        />
      ))}
    </div>
  );

  const done = todos.filter((t) => t.completed).length;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 pb-3 border-b border-white/5 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tambah tugas baru..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1 min-w-0 surface-soft rounded-lg px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:border-[#d9a441]/40 transition-colors"
          />
          <button
            type="submit"
            className="bg-[#d9a441] hover:bg-[#c9963a] text-[#16181d] font-semibold px-3.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>

        <div className="flex items-center justify-between mt-2.5 px-0.5">
          <span className="text-[11px] text-dim">Estimasi sesi pomodoro</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  playBtnSound();
                  setEstimated(num);
                }}
                className={`w-6 h-6 rounded-md text-[11px] flex items-center justify-center transition-all ${
                  estimated === num
                    ? 'bg-[#d9a441]/15 text-[#d9a441] font-semibold border border-[#d9a441]/40'
                    : 'text-faint hover:text-dim surface-soft'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center text-faint gap-2.5 select-none">
            <ListChecks size={26} className="text-faint" />
            <p className="text-xs max-w-[210px]">Belum ada tugas. Tambahkan satu untuk mulai sesi fokus.</p>
          </div>
        ) : (
          todos.map((todo) => {
            const isActive = todo.id === activeTodoId;
            return (
              <div
                key={todo.id}
                onClick={() => !todo.completed && onSetActiveTodo(isActive ? null : todo.id)}
                className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  todo.completed
                    ? 'border-white/5 opacity-50'
                    : isActive
                    ? 'bg-[#d9a441]/8 border-[#d9a441]/35'
                    : 'surface-soft hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTodo(todo.id);
                      playBtnSound();
                    }}
                    className="p-0.5 rounded text-faint hover:text-dim transition-colors shrink-0 mt-0.5"
                  >
                    {todo.completed ? (
                      <CheckCircle2 size={18} className="text-[#7fa88a]" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm block truncate ${
                        todo.completed ? 'line-through text-faint' : 'text-[#e3e5ea] font-medium'
                      }`}
                    >
                      {todo.text}
                    </span>
                    <div className="mt-1.5">{renderDots(todo.pomodorosEstimated, todo.pomodorosCompleted)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {!todo.completed && (
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#d9a441]/15 text-[#d9a441] border border-[#d9a441]/30'
                          : 'text-faint border border-white/5'
                      }`}
                    >
                      {isActive ? 'Aktif' : 'Pilih'}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTodo(todo.id);
                      playBtnSound();
                    }}
                    className="p-1 rounded-lg text-faint hover:text-[#c98a8a] transition-colors"
                    title="Hapus tugas"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {todos.length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/5 text-[11px] text-dim flex justify-between shrink-0">
          <span>
            {done}/{todos.length} tugas selesai
          </span>
          <span>{todos.reduce((acc, t) => acc + t.pomodorosEstimated, 0)} sesi direncanakan</span>
        </div>
      )}
    </div>
  );
};
