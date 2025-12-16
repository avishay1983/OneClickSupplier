import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Pen, Calendar, Building2, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { VendorRequest } from '@/types/vendor';
import { ContractSigningDialog } from './ContractSigningDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ManagerSignaturesViewProps {
  role: 'vp' | 'procurement';
  pendingSignatures: VendorRequest[];
  onRefresh: () => void;
}

export function ManagerSignaturesView({ role, pendingSignatures, onRefresh }: ManagerSignaturesViewProps) {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);

  const roleName = role === 'vp' ? 'סמנכ"ל' : 'מנהל רכש';

  const handleSign = (request: VendorRequest) => {
    setSelectedRequest(request);
    setContractDialogOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-primary/20 via-primary/10 to-transparent rounded-2xl p-8 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary rounded-2xl shadow-lg">
            <FileSignature className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">שלום, {roleName}</h1>
            <p className="text-muted-foreground text-lg mt-1">
              {pendingSignatures.length === 0 
                ? 'אין חוזים ממתינים לחתימתך' 
                : pendingSignatures.length === 1 
                  ? 'יש חוזה אחד ממתין לחתימתך'
                  : `יש ${pendingSignatures.length} חוזים ממתינים לחתימתך`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">ממתינים לחתימה</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{pendingSignatures.length}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">דחוף (מעל 3 ימים)</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {pendingSignatures.filter(r => {
                    const created = new Date(r.created_at);
                    const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff > 3;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">התפקיד שלך</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{roleName}</p>
              </div>
              <User className="h-10 w-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Signatures List */}
      {pendingSignatures.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            חוזים ממתינים לחתימה
          </h2>
          
          <div className="grid gap-4">
            {pendingSignatures.map((request) => {
              const created = new Date(request.created_at);
              const daysDiff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysDiff > 3;

              return (
                <Card 
                  key={request.id} 
                  className={`overflow-hidden transition-all hover:shadow-lg ${
                    isUrgent ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20' : ''
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-6">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${
                        isUrgent 
                          ? 'bg-orange-100 dark:bg-orange-900/50' 
                          : 'bg-primary/10'
                      }`}>
                        <Building2 className={`h-8 w-8 ${
                          isUrgent 
                            ? 'text-orange-600 dark:text-orange-400' 
                            : 'text-primary'
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold truncate">{request.vendor_name}</h3>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              דחוף
                            </Badge>
                          )}
                          {request.requires_vp_approval && role === 'procurement' && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                              סמנכ"ל חתם
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.handler_name || 'לא צוין מטפל'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(created, 'dd/MM/yyyy', { locale: he })}
                          </span>
                          {daysDiff > 0 && (
                            <span className={`${isUrgent ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}`}>
                              לפני {daysDiff} {daysDiff === 1 ? 'יום' : 'ימים'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        size="lg"
                        onClick={() => handleSign(request)}
                        className="gap-2 shadow-md hover:shadow-lg transition-all min-w-[140px]"
                      >
                        <Pen className="h-5 w-5" />
                        לחתימה
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground">הכל מעודכן!</h3>
            <p className="text-muted-foreground mt-2">
              אין חוזים הממתינים לחתימתך כרגע
            </p>
          </CardContent>
        </Card>
      )}

      <ContractSigningDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        vendorRequestId={selectedRequest?.id || null}
        vendorName={selectedRequest?.vendor_name || ''}
        onSignComplete={() => {
          onRefresh();
          setContractDialogOpen(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}
