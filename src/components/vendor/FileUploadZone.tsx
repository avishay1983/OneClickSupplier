import { useCallback, useState } from 'react';
import { Upload, X, File, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExistingDocument {
  file_name: string;
  file_path: string;
}

interface FileUploadZoneProps {
  label: string;
  documentType: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onRemove: () => void;
  existingDocument?: ExistingDocument | null;
}

export function FileUploadZone({ 
  label, 
  documentType, 
  onFileSelect, 
  selectedFile,
  onRemove,
  existingDocument
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  // Show selected new file
  if (selectedFile) {
    return (
      <div className="border rounded-lg p-4 bg-success/10 border-success/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <File className="h-3 w-3" />
                {selectedFile.name}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show existing document from database
  if (existingDocument) {
    return (
      <div className="border rounded-lg p-4 bg-primary/10 border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <File className="h-3 w-3" />
                {existingDocument.file_name}
                <span className="text-xs text-primary">(קיים)</span>
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`file-${documentType}`)?.click()}
            className="text-xs"
          >
            החלף קובץ
          </Button>
          <input
            id={`file-${documentType}`}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileInput}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        isDragging 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-${documentType}`)?.click()}
    >
      <input
        id={`file-${documentType}`}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileInput}
      />
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="font-medium text-sm mb-1">{label}</p>
      <p className="text-xs text-muted-foreground">
        גרור קובץ לכאן או לחץ לבחירה
      </p>
    </div>
  );
}