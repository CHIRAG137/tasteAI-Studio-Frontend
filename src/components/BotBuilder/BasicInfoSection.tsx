import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload } from "lucide-react";

interface BasicInfoSectionProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
}

export const BasicInfoSection = ({ botConfig, updateConfig }: BasicInfoSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="botName" className="text-sm font-medium">
          Bot Name *
        </Label>
        <Input
          id="botName"
          placeholder="Enter your bot's name"
          value={botConfig.name}
          onChange={(e) => updateConfig("name", e.target.value)}
          className="h-11"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1">
          <FileText className="w-4 h-4" />
          Bot Description *
        </Label>
        <Textarea
          id="description"
          placeholder="Describe what your bot does and its main capabilities..."
          value={botConfig.description}
          onChange={(e) => updateConfig("description", e.target.value)}
          className="min-h-[100px] resize-none"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="files" className="text-sm font-medium flex items-center gap-1">
          <Upload className="w-4 h-4" />
          Upload Files
        </Label>
        <Input
          id="files"
          type="file"
          multiple
          onChange={(e) => updateConfig("files", e.target.files ? Array.from(e.target.files) : [])}
          className="h-11 cursor-pointer file:cursor-pointer"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        />
        {botConfig.files?.length ? (
          <p className="text-sm text-muted-foreground">
            {botConfig.files.length} file(s) selected: {botConfig.files.map((file) => file.name).join(', ')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Upload PDF, TXT, DOC/DOCX, or XLS/XLSX files for training.</p>
        )}
      </div>
    </div>
  );
};