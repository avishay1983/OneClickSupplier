import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Clock, Server, ArrowRight, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_CONFIG } from '@/config/api';
import { useNavigate } from 'react-router-dom';

const MIGRATION_STEPS = [
    { id: 1, name: 'Vendor Forms (GET/POST)', status: 'completed', description: 'Migrated to /api/vendors' },
    { id: 2, name: 'File Uploads', status: 'completed', description: 'Migrated to /api/vendors/upload' },
    { id: 3, name: 'OCR & Classification', status: 'completed', description: 'Migrated to /api/documents' },
    { id: 4, name: 'OTP Authentication', status: 'completed', description: 'Migrated to /api/vendors/otp' },
    { id: 5, name: 'Quote System', status: 'completed', description: 'Migrated to /api/vendors/quotes' },
    { id: 6, name: 'Receipts Management', status: 'completed', description: 'Migrated to /api/receipts' },
    { id: 7, name: 'Admin Dashboard (Read)', status: 'in_progress', description: 'Migrating to /api/admin/requests' },
    { id: 8, name: 'Admin Dashboard (Write)', status: 'pending', description: 'Migrating to /api/admin/requests (POST)' },
    { id: 9, name: 'Manager Approvals', status: 'pending', description: 'Migrating to /api/users/approval' },
    { id: 10, name: 'Frontend Cleanup', status: 'pending', description: 'Removing direct Supabase calls' },
];

export default function MigrationProgress() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            // Using the new Admin API
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError('Failed to load stats from Backend. Is the server running?');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const completedCount = MIGRATION_STEPS.filter(s => s.status === 'completed').length;
    const progressPercentage = (completedCount / MIGRATION_STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-background p-8" dir="rtl">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Server className="h-8 w-8 text-primary" />
                            סטטוס מיגרציה ל-Python Backend
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            מעקב בזמן אמת אחר העברת השירותים מ-Supabase Edge Functions לשרת Python FastAPI
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        חזרה לדשבורד
                    </Button>
                </div>

                {/* Overall Progress */}
                <Card>
                    <CardHeader>
                        <CardTitle>התקדמות כללית</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span>{completedCount} מתוך {MIGRATION_STEPS.length} שירותים הועברו</span>
                                <span>{Math.round(progressPercentage)}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-4" />
                        </div>
                    </CardContent>
                </Card>

                {/* Real-time Stats from Backend */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">סך הכל בקשות</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {isLoading ? '...' : stats?.total_requests ?? '-'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">ממתין לספק</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-500">
                                {isLoading ? '...' : stats?.pending_vendor ?? '-'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">ממתין לאישור</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-500">
                                {isLoading ? '...' : stats?.waiting_approval ?? '-'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">אושר</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">
                                {isLoading ? '...' : stats?.approved ?? '-'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Setup Error Alert */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-3">
                        <Clock className="h-5 w-5" />
                        <span>{error}</span>
                        <Button variant="link" onClick={fetchStats} className="mr-auto text-destructive underline">נסה שוב</Button>
                    </div>
                )}

                {/* Detailed Steps */}
                <Card>
                    <CardHeader>
                        <CardTitle>פירוט שירותים</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {MIGRATION_STEPS.map((step) => (
                                <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`
                      h-10 w-10 rounded-full flex items-center justify-center
                      ${step.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                step.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
                    `}>
                                            {step.status === 'completed' ? <CheckCircle className="h-6 w-6" /> :
                                                step.status === 'in_progress' ? <RefreshCw className="h-5 w-5 animate-spin" /> :
                                                    <Circle className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{step.name}</h3>
                                            <p className="text-sm text-muted-foreground">{step.description}</p>
                                        </div>
                                    </div>
                                    <Badge variant={
                                        step.status === 'completed' ? 'default' :
                                            step.status === 'in_progress' ? 'secondary' : 'outline'
                                    } className={step.status === 'completed' ? 'bg-green-500' : ''}>
                                        {step.status === 'completed' ? 'הושלם' :
                                            step.status === 'in_progress' ? 'בתהליך' : 'ממתין'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
