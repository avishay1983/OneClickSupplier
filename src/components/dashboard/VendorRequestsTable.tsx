import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, FileText } from 'lucide-react';
import { VendorRequest, STATUS_LABELS, VendorStatus } from '@/types/vendor';
import { toast } from '@/hooks/use-toast';
import { ViewDocumentsDialog } from './ViewDocumentsDialog';

interface VendorRequestsTableProps {
  requests: VendorRequest[];
  isLoading: boolean;
}

const getStatusVariant = (status: VendorStatus) => {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'with_vendor':
      return 'default';
    case 'submitted':
      return 'outline';
    case 'approved':
      return 'default';
    default:
      return 'secondary';
  }
};

const getStatusClass = (status: VendorStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-success text-success-foreground';
    case 'submitted':
      return 'bg-warning text-warning-foreground';
    default:
      return '';
  }
};

export function VendorRequestsTable({ requests, isLoading }: VendorRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/vendor/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'הקישור הועתק',
      description: 'הקישור המאובטח הועתק ללוח',
    });
  };

  const openVendorForm = (token: string) => {
    window.open(`/vendor/${token}`, '_blank');
  };

  const viewDocuments = (request: VendorRequest) => {
    setSelectedRequest(request);
    setDocumentsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>אין בקשות ספקים עדיין</p>
        <p className="text-sm mt-1">לחץ על "בקשה חדשה" כדי להתחיל</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right font-semibold">שם הספק</TableHead>
              <TableHead className="text-right font-semibold">אימייל</TableHead>
              <TableHead className="text-right font-semibold">סטטוס</TableHead>
              <TableHead className="text-right font-semibold">תאריך יצירה</TableHead>
              <TableHead className="text-right font-semibold">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{request.vendor_name}</TableCell>
                <TableCell className="ltr text-right">{request.vendor_email}</TableCell>
                <TableCell>
                  <Badge 
                    variant={getStatusVariant(request.status)}
                    className={getStatusClass(request.status)}
                  >
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(request.created_at).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewDocuments(request)}
                      title="צפה במסמכים"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(request.secure_token)}
                      title="העתק קישור"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openVendorForm(request.secure_token)}
                      title="פתח טופס"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedRequest && (
        <ViewDocumentsDialog
          open={documentsDialogOpen}
          onOpenChange={setDocumentsDialogOpen}
          vendorRequestId={selectedRequest.id}
          vendorName={selectedRequest.vendor_name}
        />
      )}
    </>
  );
}