import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Download, FileText, Pen, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import SignaturePad from 'signature_pad';
import { PDFDocument, rgb } from 'pdf-lib';

interface ContractSigningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorRequestId: string | null;
  vendorName: string;
  onSignComplete?: () => void;
}

interface SignatureStatus {
  ceoSigned: boolean;
  ceoSignedAt: string | null;
  ceoSignedBy: string | null;
  procurementSigned: boolean;
  procurementSignedAt: string | null;
  procurementSignedBy: string | null;
  contractFilePath: string | null;
  requiresVpApproval: boolean;
}

export function ContractSigningDialog({
  open,
  onOpenChange,
  vendorRequestId,
  vendorName,
  onSignComplete,
}: ContractSigningDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus | null>(null);
  const [signerRole, setSignerRole] = useState<'ceo' | 'procurement' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<'ceo' | 'procurement' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  // Reset signerRole when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSignerRole(null);
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
        signaturePadRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open || !vendorRequestId) return;
    
    // Reset signerRole when dialog opens
    setSignerRole(null);
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get current user - check if session is still valid
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No active session found');
          toast({
            title: 'שגיאה',
            description: 'נדרש להתחבר מחדש',
            variant: 'destructive',
          });
          onOpenChange(false);
          return;
        }
        
        const user = session.user;
        let currentUserEmail = user?.email || '';
        
        if (user) {
          currentUserEmail = user.email || '';
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          setUserName(profile?.full_name || user.email || 'משתמש');
        }

        // Get app settings to determine user role
        const { data: settings } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value');
        
        const settingsMap: Record<string, string> = {};
        settings?.forEach((s) => {
          settingsMap[s.setting_key] = s.setting_value;
        });

        const vpEmail = settingsMap.vp_email?.toLowerCase().trim();
        const procurementEmail = settingsMap.car_manager_email?.toLowerCase().trim();
        const userEmailLower = currentUserEmail.toLowerCase().trim();

        console.log('ContractSigningDialog - Email comparison:', {
          userEmailLower,
          vpEmail,
          procurementEmail,
          isVp: userEmailLower === vpEmail,
          isProcurement: userEmailLower === procurementEmail
        });

        // Determine user's role based on their email
        if (userEmailLower === vpEmail) {
          console.log('Setting userRole to ceo');
          setUserRole('ceo');
        } else if (userEmailLower === procurementEmail) {
          console.log('Setting userRole to procurement');
          setUserRole('procurement');
        } else {
          console.log('No matching role found');
          setUserRole(null);
        }

        // Get contract status
        const { data, error } = await supabase
          .from('vendor_requests')
          .select('ceo_signed, ceo_signed_at, ceo_signed_by, procurement_manager_signed, procurement_manager_signed_at, procurement_manager_signed_by, contract_file_path, requires_vp_approval')
          .eq('id', vendorRequestId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          console.error('Vendor request not found:', vendorRequestId);
          toast({
            title: 'שגיאה',
            description: 'לא נמצאה בקשת הספק',
            variant: 'destructive',
          });
          onOpenChange(false);
          return;
        }

        setSignatureStatus({
          ceoSigned: data.ceo_signed || false,
          ceoSignedAt: data.ceo_signed_at,
          ceoSignedBy: data.ceo_signed_by,
          procurementSigned: data.procurement_manager_signed || false,
          procurementSignedAt: data.procurement_manager_signed_at,
          procurementSignedBy: data.procurement_manager_signed_by,
          contractFilePath: data.contract_file_path,
          requiresVpApproval: data.requires_vp_approval !== false,
        });
      } catch (error) {
        console.error('Error fetching contract status:', error);
        toast({
          title: 'שגיאה',
          description: 'לא ניתן לטעון את נתוני הצעת המחיר',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, vendorRequestId]);

  // Initialize signature pad when role is selected
  useEffect(() => {
    if (!signerRole || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    
    if (!container) return;
    
    // Get container dimensions
    const rect = container.getBoundingClientRect();
    
    // Set canvas dimensions
    canvas.width = rect.width;
    canvas.height = 200;
    
    console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });
    
    // Destroy previous instance if exists
    if (signaturePadRef.current) {
      signaturePadRef.current.off();
    }
    
    // Initialize SignaturePad
    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 100)',
      minWidth: 0.5,
      maxWidth: 2.5,
      throttle: 16,
    });
    
    // Clear to set background
    signaturePadRef.current.clear();
    
    console.log('SignaturePad initialized:', signaturePadRef.current);
    
    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [signerRole]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      console.log('Signature cleared');
    }
  };

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({
        title: 'שגיאה',
        description: 'יש לחתום לפני האישור',
        variant: 'destructive',
      });
      return;
    }

    if (!vendorRequestId || !signatureStatus?.contractFilePath) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצאה הצעת מחיר לחתימה',
        variant: 'destructive',
      });
      return;
    }

    setIsSigning(true);
    try {
      // Get signature as PNG
      const signatureDataUrl = signaturePadRef.current.toDataURL('image/png');
      
      // Download the existing PDF with cache busting
      const cacheBuster = `?t=${Date.now()}`;
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('vendor_documents')
        .download(`${signatureStatus.contractFilePath}${cacheBuster}`);

      if (downloadError) throw downloadError;

      // Load PDF and add signature
      const pdfBytes = await pdfData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Embed signature image
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      
      // Calculate signature position based on role
      // There are 3 signature areas: VP (left), Procurement (center), Vendor (right)
      const sigWidth = 100;
      const sigHeight = 40;
      const pageHeight = lastPage.getHeight();
      const pageWidth = lastPage.getWidth();
      
      // Position signature ABOVE the signature line (not covering the title text)
      // Use fixed Y position from bottom for consistency across both signers
      // The signature line is typically around 520-530 pixels from bottom of an A4 page
      const yPosition = 520; // Fixed position - approximately 62% of A4 height (841.89)
      
      console.log('Page dimensions:', { pageWidth, pageHeight });
      
      let xPosition: number;
      if (signerRole === 'ceo') {
        // VP signature on the LEFT side (under "סמנכ"ל")
        xPosition = 50;
      } else {
        // Procurement signature in the CENTER (under "מנהל רכש")
        xPosition = (pageWidth - sigWidth) / 2;
      }
      
      console.log('Adding signature at position:', { x: xPosition, y: yPosition, pageWidth, pageHeight, signerRole });
      
      // Draw signature
      lastPage.drawImage(signatureImage, {
        x: xPosition,
        y: yPosition,
        width: sigWidth,
        height: sigHeight,
      });
      
      // Add date below signature
      const dateStr = new Date().toLocaleDateString('en-GB');
      lastPage.drawText(dateStr, {
        x: xPosition + sigWidth / 2 - 20,
        y: yPosition - 10,
        size: 7,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      console.log('Modified PDF size:', modifiedPdfBytes.byteLength, 'bytes');
      
      const modifiedPdfBlob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
      console.log('Blob size:', modifiedPdfBlob.size, 'bytes');
      
      // Upload the signed PDF (overwrite existing file directly)
      console.log('Uploading to path:', signatureStatus.contractFilePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vendor_documents')
        .update(signatureStatus.contractFilePath, modifiedPdfBlob, {
          cacheControl: '0',
        });

      console.log('Upload result:', uploadData, 'Error:', uploadError);
      if (uploadError) throw uploadError;

      // Update database with signature info
      const updateData: Record<string, unknown> = {};
      if (signerRole === 'ceo') {
        updateData.ceo_signed = true;
        updateData.ceo_signed_at = new Date().toISOString();
        updateData.ceo_signed_by = userName;
      } else {
        updateData.procurement_manager_signed = true;
        updateData.procurement_manager_signed_at = new Date().toISOString();
        updateData.procurement_manager_signed_by = userName;
      }

      const { error: updateError } = await supabase
        .from('vendor_requests')
        .update(updateData)
        .eq('id', vendorRequestId);

      if (updateError) throw updateError;

      // If VP (CEO) just signed, send email to procurement manager
      if (signerRole === 'ceo') {
        try {
          console.log('VP signed, sending email to procurement manager...');
          await supabase.functions.invoke('send-manager-approval', {
            body: { vendorRequestId, targetRole: 'procurement_manager' },
          });
          console.log('Email sent to procurement manager');
        } catch (emailError) {
          console.error('Error sending email to procurement manager:', emailError);
          // Don't fail the signing process if email fails
        }
      }

      // Check if all required signatures are complete
      const requiresVp = signatureStatus.requiresVpApproval;
      
      // Determine if the request is now fully signed
      let isFullySigned = false;
      if (requiresVp) {
        // Both VP and procurement must sign
        isFullySigned = (signerRole === 'ceo' && signatureStatus.procurementSigned) ||
                       (signerRole === 'procurement' && signatureStatus.ceoSigned);
      } else {
        // Only procurement needs to sign (VP not required)
        isFullySigned = signerRole === 'procurement';
      }
      
      if (isFullySigned) {
        // Update status to approved
        await supabase
          .from('vendor_requests')
          .update({ status: 'approved' })
          .eq('id', vendorRequestId);
        
        // Send approval email to vendor with receipts link
        try {
          console.log('All signatures complete, sending approval email to vendor...');
          const { error: emailError } = await supabase.functions.invoke('send-vendor-confirmation', {
            body: { vendorRequestId, sendReceiptsLink: true },
          });
          if (emailError) {
            console.error('Error sending vendor approval email:', emailError);
          } else {
            console.log('Vendor approval email sent successfully');
          }
        } catch (emailError) {
          console.error('Error invoking send-vendor-confirmation:', emailError);
          // Don't fail the signing process if email fails
        }
      }

      toast({
        title: 'החתימה נשמרה',
        description: isFullySigned ? 'כל החתימות הושלמו - הספק אושר ונשלחה הודעה' : 'החתימה נוספה למסמך',
      });

      setSignerRole(null);
      onSignComplete?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error signing document:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את החתימה',
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleViewContract = async () => {
    if (!signatureStatus?.contractFilePath) return;

    try {
      const cacheBuster = `?t=${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('vendor_documents')
        .download(`${signatureStatus.contractFilePath}${cacheBuster}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing contract:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לפתוח את הצעת המחיר',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadContract = async () => {
    if (!signatureStatus?.contractFilePath) return;

    try {
      const timestamp = Date.now();
      console.log('Downloading contract:', signatureStatus.contractFilePath);
      
      const cacheBuster = `?t=${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('vendor_documents')
        .download(`${signatureStatus.contractFilePath}${cacheBuster}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${vendorName}_${timestamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוריד את הצעת המחיר',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>חתימה על הצעת מחיר - {vendorName}</DialogTitle>
          <DialogDescription>
            חתום על הצעת המחיר המצורפת
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !signatureStatus?.contractFilePath ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">הספק עדיין לא העלה הצעת מחיר חתומה</p>
          </div>
        ) : signerRole ? (
          // Signature pad view
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="font-medium text-lg">חתימה על המסמך</p>
              <p className="text-sm text-muted-foreground">{userName}</p>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '200px' }}>
              <canvas
                ref={canvasRef}
                style={{ 
                  width: '100%', 
                  height: '200px',
                  cursor: 'crosshair',
                  touchAction: 'none'
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearSignature}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                נקה
              </Button>
              <Button
                variant="outline"
                onClick={() => setSignerRole(null)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSign}
                disabled={isSigning}
                className="flex-1 gap-2"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    שומר חתימה...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    אשר חתימה
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Status and action view
          <div className="space-y-6">
            {/* Contract view/download */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <h4 className="font-medium">הצעת מחיר {signatureStatus.ceoSigned || signatureStatus.procurementSigned ? 'חתומה' : 'מהספק'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {signatureStatus.requiresVpApproval ? (
                        signatureStatus.ceoSigned && signatureStatus.procurementSigned 
                          ? 'כל החתימות הושלמו' 
                          : signatureStatus.ceoSigned 
                            ? 'נחתם ע"י סמנכ"ל - ממתין לחתימת מנהל רכש'
                            : 'הורד את הצעת המחיר לצפייה'
                      ) : (
                        signatureStatus.procurementSigned
                          ? 'נחתם ע"י מנהל רכש'
                          : 'הורד את הצעת המחיר לצפייה'
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDownloadContract} className="gap-2">
                  <Download className="h-4 w-4" />
                  הורדה
                </Button>
              </div>
            </div>

            {/* VP Signature - show only to VP AND only if VP approval is required */}
            {signatureStatus.requiresVpApproval && userRole === 'ceo' && (
              <div className={`p-4 border rounded-lg ${signatureStatus.ceoSigned ? 'bg-success/10 border-success/30' : 'bg-background'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {signatureStatus.ceoSigned ? (
                      <CheckCircle className="h-6 w-6 text-success" />
                    ) : (
                      <Pen className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div>
                      <h4 className="font-medium">חתימת סמנכ"ל</h4>
                      {signatureStatus.ceoSigned ? (
                        <p className="text-sm text-success">
                          נחתם ע"י {signatureStatus.ceoSignedBy} ב-{formatDate(signatureStatus.ceoSignedAt)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">ממתין לחתימה</p>
                      )}
                    </div>
                  </div>
                  {!signatureStatus.ceoSigned && (
                    <Button 
                      onClick={() => setSignerRole('ceo')} 
                      className="gap-2 text-lg px-6 py-3 h-auto animate-pulse hover:animate-none bg-primary hover:bg-primary/90 shadow-lg"
                      size="lg"
                    >
                      <Pen className="h-5 w-5" />
                      לחתימה
                    </Button>
                  )}
                  {signatureStatus.ceoSigned && (
                    <Button onClick={() => setSignerRole('ceo')} className="gap-2" variant="outline">
                      <Pen className="h-4 w-4" />
                      חתום מחדש
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Procurement Manager Signature */}
            {userRole === 'procurement' && (
              <>
                {/* If VP approval is required, show only after VP signed */}
                {signatureStatus.requiresVpApproval && !signatureStatus.ceoSigned && (
                  <div className="text-center p-4 bg-muted/50 rounded-lg border">
                    <p className="text-muted-foreground">ממתין לחתימת הסמנכ"ל לפני שתוכל לחתום</p>
                  </div>
                )}
                
                {/* Show signature section if VP approval is not required OR VP has signed */}
                {(!signatureStatus.requiresVpApproval || signatureStatus.ceoSigned) && (
                  <div className={`p-4 border rounded-lg ${signatureStatus.procurementSigned ? 'bg-success/10 border-success/30' : 'bg-background'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {signatureStatus.procurementSigned ? (
                          <CheckCircle className="h-6 w-6 text-success" />
                        ) : (
                          <Pen className="h-6 w-6 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium">חתימת מנהל רכש</h4>
                          {signatureStatus.procurementSigned ? (
                            <p className="text-sm text-success">
                              נחתם ע"י {signatureStatus.procurementSignedBy} ב-{formatDate(signatureStatus.procurementSignedAt)}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">ממתין לחתימה</p>
                          )}
                        </div>
                      </div>
                      {!signatureStatus.procurementSigned && (
                        <Button 
                          onClick={() => setSignerRole('procurement')} 
                          className="gap-2 text-lg px-6 py-3 h-auto animate-pulse hover:animate-none bg-primary hover:bg-primary/90 shadow-lg"
                          size="lg"
                        >
                          <Pen className="h-5 w-5" />
                          לחתימה
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Show message if user is not authorized to sign */}
            {userRole === null && (
              <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/30">
                <p className="text-warning-foreground">אינך מורשה לחתום על הסכם זה</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {signatureStatus.requiresVpApproval 
                    ? 'רק מנהל רכש או סמנכ"ל יכולים לחתום'
                    : 'רק מנהל רכש יכול לחתום'}
                </p>
              </div>
            )}

            {/* Status summary - check based on requires_vp_approval */}
            {signatureStatus.requiresVpApproval ? (
              signatureStatus.ceoSigned && signatureStatus.procurementSigned && (
                <div className="text-center p-4 bg-success/10 rounded-lg border border-success/30">
                  <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="font-medium text-success">ההסכם נחתם על ידי שני הצדדים</p>
                </div>
              )
            ) : (
              signatureStatus.procurementSigned && (
                <div className="text-center p-4 bg-success/10 rounded-lg border border-success/30">
                  <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="font-medium text-success">ההסכם נחתם על ידי מנהל הרכש</p>
                </div>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}