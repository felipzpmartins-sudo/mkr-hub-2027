import { useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MissionNote } from "@/hooks/useVideoRequests";
import { RetroButton } from "@/components/RetroButton";
import { RetroTextarea } from "@/components/RetroTextarea";

interface MissionNotesProps {
  notes: MissionNote[];
  canAdd?: boolean;
  onAdd?: (text: string) => Promise<boolean> | boolean;
  title?: string;
  compact?: boolean;
}

const roleLabel: Record<string, string> = {
  capitao: "Capitão",
  tripulante: "Tripulante",
  solicitante: "Solicitante",
};

export function MissionNotes({
  notes,
  canAdd = false,
  onAdd,
  title = "Observações",
  compact = false,
}: MissionNotesProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || !onAdd) return;
    setSubmitting(true);
    const ok = await onAdd(text);
    setSubmitting(false);
    if (ok !== false) setText("");
  };

  const sorted = [...(notes || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground tracking-wider uppercase flex items-center gap-1">
        <MessageSquare size={12} />
        {title} {sorted.length > 0 && `(${sorted.length})`}
      </p>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 italic">
          Nenhuma observação ainda.
        </p>
      ) : (
        <div className={`space-y-2 ${compact ? "max-h-48 overflow-y-auto pr-1" : ""}`}>
          {sorted.map((note) => (
            <div
              key={note.id}
              className="border border-border bg-muted/30 p-3 text-sm"
            >
              <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  <span className="font-medium text-foreground">{note.author_name}</span>
                  <span className="opacity-70">· {roleLabel[note.author_role] ?? note.author_role}</span>
                </span>
                <span>
                  {format(new Date(note.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{note.text}</p>
            </div>
          ))}
        </div>
      )}

      {canAdd && onAdd && (
        <div className="space-y-2 pt-2">
          <RetroTextarea
            placeholder="Escreva uma observação..."
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <RetroButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
            >
              <Send size={12} className="mr-2" />
              {submitting ? "Salvando..." : "Salvar Nota"}
            </RetroButton>
          </div>
        </div>
      )}
    </div>
  );
}
