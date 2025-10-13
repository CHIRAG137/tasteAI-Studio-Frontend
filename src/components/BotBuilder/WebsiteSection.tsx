import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { WebsiteScraper } from "@/components/WebsiteScraper";

interface WebsiteSectionProps {
  botConfig: any;
  updateConfig: (field: string, value: any) => void;
}

export const WebsiteSection = ({ botConfig, updateConfig }: WebsiteSectionProps) => {
  const handleScrapedData = (markdownData: string[], scrapedUrls: string[]) => {
    // Store the scraped markdown data and URLs in the bot config
    updateConfig("scrapedMarkdown", markdownData);
    updateConfig("scrapedUrls", scrapedUrls);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="websiteUrl" className="text-sm font-medium flex items-center gap-1">
          <Globe className="w-4 h-4" />
          Website URL
        </Label>
        <Input
          id="websiteUrl"
          placeholder="https://your-website.com"
          value={botConfig.websiteUrl}
          onChange={(e) => updateConfig("websiteUrl", e.target.value)}
          className="h-11"
        />
      </div>
      
      <WebsiteScraper 
        websiteUrl={botConfig.websiteUrl} 
        onScrapedDataReady={handleScrapedData}
      />
      
      {/* Show indicator if scraped data is available */}
      {botConfig.scrapedMarkdown && botConfig.scrapedMarkdown.length > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-md p-3">
          <p className="text-sm text-success">
            ✓ {botConfig.scrapedMarkdown.length} pages ready for training
          </p>
        </div>
      )}
    </div>
  );
};
