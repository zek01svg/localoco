import { Braces, TableProperties } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "#client/components/ui/tabs";

import { CopyToClipboardContainer } from "./copy-to-clipboard-container";
import { KVTable } from "./kv-table";

interface KVTabsProps {
  data: Record<string, string>;
  className?: string;
}

export function KVTabs({ data, className }: KVTabsProps) {
  return (
    <Tabs defaultValue="table" className={className}>
      <div className="flex items-center justify-end">
        <TabsList className="bg-background h-auto gap-1 px-0 py-0">
          <TabsTrigger
            value="table"
            className="text-muted-foreground/70 data-[state=active]:text-foreground px-0 py-0 data-[state=active]:shadow-none"
          >
            <TableProperties className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger
            value="raw"
            className="text-muted-foreground/70 data-[state=active]:text-foreground px-0 py-0 data-[state=active]:shadow-none"
          >
            <Braces className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="table" className="rounded-md">
        <KVTable data={data} />
      </TabsContent>
      <TabsContent value="raw" asChild>
        {/* REMINDER: either `overflow-auto whitespace-pre` or `whitespace-pre-wrap` - depends if we want to wrap the text or not */}
        <CopyToClipboardContainer variant="default" className="overflow-auto whitespace-pre">
          {JSON.stringify(data, null, 2)}
        </CopyToClipboardContainer>
      </TabsContent>
    </Tabs>
  );
}
