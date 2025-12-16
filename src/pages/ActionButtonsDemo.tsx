import { useState } from "react";
import { Check, X, RotateCcw, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ActionButtonsDemo = () => {
  const [radioAction, setRadioAction] = useState<string>("");
  const [cardAction, setCardAction] = useState<string>("");
  const [tabAction, setTabAction] = useState<string>("approve");

  return (
    <div className="min-h-screen bg-background p-8" dir="rtl">
      <h1 className="text-3xl font-bold text-center mb-8">השוואת עיצובים לכפתורי פעולה</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Option 1: Radio Buttons */}
        <Card className="border-2">
          <CardHeader className="bg-blue-50 dark:bg-blue-950">
            <CardTitle className="text-lg">אופציה 1: רדיו עם כפתור אחד</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <RadioGroup value={radioAction} onValueChange={setRadioAction} className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="approve" id="r-approve" />
                <Label htmlFor="r-approve" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">אשר את הבקשה</div>
                    <div className="text-sm text-muted-foreground">שלח לאישור מנהלים</div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="reject" id="r-reject" />
                <Label htmlFor="r-reject" className="flex items-center gap-2 cursor-pointer flex-1">
                  <X className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium">דחה את הבקשה</div>
                    <div className="text-sm text-muted-foreground">הספק יקבל הודעה על הדחייה</div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="resend" id="r-resend" />
                <Label htmlFor="r-resend" className="flex items-center gap-2 cursor-pointer flex-1">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-medium">שלח מחדש לספק</div>
                    <div className="text-sm text-muted-foreground">בקש מהספק לתקן פרטים</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            
            {radioAction === "reject" && (
              <div className="space-y-2 pt-2">
                <Label>סיבת הדחייה</Label>
                <Textarea placeholder="הזן סיבה..." />
              </div>
            )}
            
            {radioAction === "resend" && (
              <div className="space-y-2 pt-2">
                <Label>הסבר לספק</Label>
                <Textarea placeholder="הזן הסבר..." />
              </div>
            )}
            
            <Button className="w-full" disabled={!radioAction}>
              בצע פעולה
            </Button>
          </CardContent>
        </Card>

        {/* Option 2: Large Cards */}
        <Card className="border-2">
          <CardHeader className="bg-green-50 dark:bg-green-950">
            <CardTitle className="text-lg">אופציה 2: כרטיסיות גדולות</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div
                onClick={() => setCardAction("approve")}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all",
                  cardAction === "approve"
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-border hover:border-green-300 hover:bg-green-50/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">אשר את הבקשה</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      הבקשה תועבר לאישור מנהל הרכש והסמנכ"ל
                    </p>
                  </div>
                  {cardAction === "approve" && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>

              <div
                onClick={() => setCardAction("reject")}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all",
                  cardAction === "reject"
                    ? "border-red-500 bg-red-50 dark:bg-red-950"
                    : "border-border hover:border-red-300 hover:bg-red-50/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">דחה את הבקשה</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      הספק יקבל מייל עם הודעה ליצור קשר עם המטפל
                    </p>
                  </div>
                  {cardAction === "reject" && (
                    <Check className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>

              <div
                onClick={() => setCardAction("resend")}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all",
                  cardAction === "resend"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                    : "border-border hover:border-orange-300 hover:bg-orange-50/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                    <RotateCcw className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">שלח מחדש לספק</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      הספק יקבל מייל חדש עם אפשרות לערוך ולשלוח שוב
                    </p>
                  </div>
                  {cardAction === "resend" && (
                    <Check className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </div>
            </div>

            {cardAction === "reject" && (
              <div className="space-y-2 pt-2">
                <Label>סיבת הדחייה</Label>
                <Textarea placeholder="הזן סיבה..." />
              </div>
            )}
            
            {cardAction === "resend" && (
              <div className="space-y-2 pt-2">
                <Label>הסבר לספק</Label>
                <Textarea placeholder="הזן הסבר..." />
              </div>
            )}

            <Button 
              className={cn(
                "w-full",
                cardAction === "approve" && "bg-green-600 hover:bg-green-700",
                cardAction === "reject" && "bg-red-600 hover:bg-red-700",
                cardAction === "resend" && "bg-orange-600 hover:bg-orange-700"
              )}
              disabled={!cardAction}
            >
              {cardAction === "approve" && "אשר"}
              {cardAction === "reject" && "דחה"}
              {cardAction === "resend" && "שלח מחדש"}
              {!cardAction && "בחר פעולה"}
            </Button>
          </CardContent>
        </Card>

        {/* Option 3: Tabs */}
        <Card className="border-2">
          <CardHeader className="bg-purple-50 dark:bg-purple-950">
            <CardTitle className="text-lg">אופציה 3: טאבים נפרדים</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={tabAction} onValueChange={setTabAction} dir="rtl">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="approve" className="flex items-center gap-1 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                  <Check className="h-4 w-4" />
                  אישור
                </TabsTrigger>
                <TabsTrigger value="reject" className="flex items-center gap-1 data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                  <X className="h-4 w-4" />
                  דחייה
                </TabsTrigger>
                <TabsTrigger value="resend" className="flex items-center gap-1 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
                  <RotateCcw className="h-4 w-4" />
                  שליחה מחדש
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approve" className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">אישור הבקשה</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    הבקשה תועבר לאישור מנהל הרכש והסמנכ"ל. הספק יקבל עדכון לאחר השלמת התהליך.
                  </p>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 ml-2" />
                  אשר את הבקשה
                </Button>
              </TabsContent>

              <TabsContent value="reject" className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">דחיית הבקשה</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    הספק יקבל הודעה על הדחייה עם הנחייה ליצור קשר עם המטפל.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>סיבת הדחייה (לשימוש פנימי)</Label>
                  <Textarea placeholder="הזן את סיבת הדחייה..." />
                </div>
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  <X className="h-4 w-4 ml-2" />
                  דחה את הבקשה
                </Button>
              </TabsContent>

              <TabsContent value="resend" className="space-y-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-2">
                    <RotateCcw className="h-5 w-5" />
                    <span className="font-medium">שליחה מחדש לספק</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    הספק יקבל מייל חדש עם הסבר ואפשרות לערוך ולשלוח שוב את הטופס.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>הסבר לספק</Label>
                  <Textarea placeholder="הזן הסבר מה הספק צריך לתקן..." />
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  <RotateCcw className="h-4 w-4 ml-2" />
                  שלח מחדש
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* View Documents Button Demo */}
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">כפתור צפייה במסמכים (משותף לכולם)</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              צפה במסמכים ובפרטים
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActionButtonsDemo;
