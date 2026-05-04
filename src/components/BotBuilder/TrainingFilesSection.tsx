import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';

interface TrainingFileMeta {
  originalname: string;
  mimeType: string;
  size: number;
  hash: string;
  path?: string;
}

interface TrainingFilesSectionProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
}

export const TrainingFilesSection = ({ botConfig, updateConfig }: TrainingFilesSectionProps) => {
  const [columns, setColumns] = useState<string[]>([]);
  const [inputColumns, setInputColumns] = useState<string[]>([]);
  const [outputColumn, setOutputColumn] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    updateConfig("files", files);

    // Check for Excel/CSV files
    const spreadsheetFile = files.find(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv')
    );
    if (spreadsheetFile) {
      processSpreadsheetFile(spreadsheetFile);
    } else {
      setColumns([]);
      setInputColumns([]);
      setOutputColumn('');
    }
  };

  const processSpreadsheetFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length > 0) {
        const headers = jsonData[0] as string[];
        setColumns(headers);
        const lastIndex = headers.length - 1;
        setInputColumns(headers.slice(0, lastIndex));
        setOutputColumn(headers[lastIndex]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    updateConfig("inputColumns", inputColumns);
  }, [inputColumns]);

  useEffect(() => {
    updateConfig("outputColumn", outputColumn);
  }, [outputColumn]);

  const handleOutputColumnChange = (value: string) => {
    setOutputColumn(value);
    // Remove from input columns if it was selected
    setInputColumns(prev => prev.filter(c => c !== value));
  };

  const handleInputColumnChange = (column: string, checked: boolean) => {
    if (checked) {
      setInputColumns(prev => [...prev, column]);
    } else {
      setInputColumns(prev => prev.filter(c => c !== column));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="files" className="text-sm font-medium flex items-center gap-1">
          <Upload className="w-4 h-4" />
          Upload Files
        </Label>
        {botConfig.existingTrainingFiles?.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="text-sm font-medium">Existing training files</p>
            <div className="space-y-1">
              {botConfig.existingTrainingFiles.map((file: TrainingFileMeta, index: number) => (
                <div key={`${file.hash}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 shadow-sm border">
                  <div>
                    <p className="text-sm font-medium">{file.originalname}</p>
                    <p className="text-xs text-muted-foreground">{file.mimeType} · {file.size} bytes</p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-destructive underline"
                    onClick={() => {
                      updateConfig(
                        'existingTrainingFiles',
                        botConfig.existingTrainingFiles.filter((f: TrainingFileMeta) => f.hash !== file.hash)
                      );
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <Input
          id="files"
          type="file"
          multiple
          onChange={handleFileChange}
          className="h-11 cursor-pointer file:cursor-pointer"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
        />
        {botConfig.files?.length ? (
          <p className="text-sm text-muted-foreground">
            {botConfig.files.length} file(s) selected: {botConfig.files.map((file) => file.name).join(', ')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Upload PDF, TXT, DOC/DOCX, or XLS/XLSX/CSV files for training.</p>
        )}
      </div>

      {columns.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Output Column</Label>
            <Select value={outputColumn} onValueChange={handleOutputColumnChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select output column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Input Columns</Label>
            <div className="flex flex-wrap gap-4">
              {columns.map((col) => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox
                    id={`input-${col}`}
                    checked={inputColumns.includes(col)}
                    onCheckedChange={(checked) => handleInputColumnChange(col, checked as boolean)}
                    disabled={col === outputColumn}
                  />
                  <Label htmlFor={`input-${col}`} className="text-sm">
                    {col}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
