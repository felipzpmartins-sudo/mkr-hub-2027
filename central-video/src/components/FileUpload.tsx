import { useState, useRef } from "react";
import { Upload, X, File, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, getToken } from "@/lib/api";

interface UploadedFile {
  name: string;
  size: number;
  url: string;
  path: string;
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxSizeMB?: number;
}

// Limite real do bucket (500MB por arquivo)
const MAX_FILE_MB = 500;


export function FileUpload({ onFilesChange, maxSizeMB = 500 }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string; percent: number } | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const { toast } = useToast();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = "";
    if (selectedFiles.length === 0) return;

    // Arquivo individual maior que o limite do servidor
    const tooBig = selectedFiles.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      toast({
        title: "Arquivo muito grande",
        description: `"${tooBig.name}" tem ${formatFileSize(tooBig.size)}. O limite é ${MAX_FILE_MB}MB por arquivo. Para vídeos maiores, use o campo de link do Drive.`,
        variant: "destructive",
      });
      return;
    }

    const newSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    if (totalSize + newSize > maxSizeBytes) {
      toast({
        title: "Limite excedido",
        description: `O limite total é de ${maxSizeMB}MB. Remova alguns arquivos ou envie o link do Drive.`,
        variant: "destructive",
      });
      return;
    }

    if (!getToken()) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para enviar arquivos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setJustUploaded(false);

    const uploadedFiles: UploadedFile[] = [];
    try {
      setProgress({ current: 1, total: selectedFiles.length, name: selectedFiles[0].name, percent: 0 });
      uploadedFiles.push(...await api.upload(selectedFiles));
      setProgress({ current: selectedFiles.length, total: selectedFiles.length, name: selectedFiles.at(-1)?.name || "", percent: 100 });

      const newFiles = [...files, ...uploadedFiles];
      const uploadedSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
      setFiles(newFiles);
      setTotalSize(totalSize + uploadedSize);
      onFilesChange(newFiles);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 4000);

      toast({
        title: "✅ Upload concluído",
        description: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso. Já pode finalizar o envio.`,
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      // Mantém os que já subiram
      if (uploadedFiles.length > 0) {
        const newFiles = [...files, ...uploadedFiles];
        setFiles(newFiles);
        setTotalSize(totalSize + uploadedFiles.reduce((acc, f) => acc + f.size, 0));
        onFilesChange(newFiles);
      }
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      xhrRef.current = null;
      setUploading(false);
      setProgress(null);
    }
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploading(false);
    setProgress(null);
    toast({ title: "Envio cancelado", description: "Você pode tentar novamente." });
  };

  const removeFile = async (index: number) => {
    const fileToRemove = files[index];
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setTotalSize(totalSize - fileToRemove.size);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        Materiais de Apoio <span className="text-muted-foreground">(opcional)</span>
      </label>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed border-border rounded-lg p-4 text-center transition-colors ${
          uploading ? "cursor-default" : "cursor-pointer hover:border-primary/50"
        }`}
      >
        <input ref={inputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

        {uploading ? (
          <div className="py-2 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-foreground font-medium">
                Enviando {progress?.current ?? 0} de {progress?.total ?? 0} — {progress?.percent ?? 0}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            {progress?.name && (
              <p className="text-xs text-muted-foreground truncate px-4">{progress.name}</p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancelUpload();
              }}
              className="text-xs underline text-muted-foreground hover:text-destructive"
            >
              Cancelar envio
            </button>
          </div>
        ) : justUploaded ? (
          <div className="py-2 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-8 h-8 text-accent" />
            <p className="text-sm font-medium text-foreground">Upload concluído com sucesso!</p>
            <p className="text-xs text-muted-foreground">
              Já pode enviar o pedido. Clique aqui para adicionar mais arquivos.
            </p>
          </div>
        ) : (
          <div className="py-2">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Clique para selecionar arquivos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Até {MAX_FILE_MB}MB por arquivo · {formatFileSize(Math.max(0, maxSizeBytes - totalSize))} disponíveis
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <File className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-right">
            Total: {formatFileSize(totalSize)} / {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  );
}
