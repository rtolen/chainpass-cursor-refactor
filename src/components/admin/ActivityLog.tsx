import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, ShieldOff, Search, Calendar, User, Activity, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ActivityLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_user_id: string | null;
  target_user_email: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
}

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<Map<string, AdminProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const { toast } = useToast();

  useEffect(() => {
    loadActivityLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_logs',
        },
        (payload) => {
          console.log('New activity log:', payload);
          setLogs((prev) => [payload.new as ActivityLog, ...prev]);
          toast({
            title: 'New Activity',
            description: `Action: ${(payload.new as ActivityLog).action_type}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActivityLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      setLogs(logsData || []);

      // Load admin profiles
      const adminIds = Array.from(new Set(logsData?.map(log => log.admin_user_id) || []));
      if (adminIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', adminIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map();
        profiles?.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
        setAdminProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('grant')) return <Shield className="h-4 w-4" />;
    if (actionType.includes('revoke')) return <ShieldOff className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionVariant = (actionType: string): "default" | "destructive" | "outline" => {
    if (actionType.includes('grant')) return 'default';
    if (actionType.includes('revoke')) return 'destructive';
    return 'outline';
  };

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    const logDate = new Date(log.created_at);
    
    // Apply search filter
    const matchesSearch = 
      log.action_type.toLowerCase().includes(searchLower) ||
      log.target_user_email?.toLowerCase().includes(searchLower) ||
      adminProfiles.get(log.admin_user_id)?.email?.toLowerCase().includes(searchLower) ||
      adminProfiles.get(log.admin_user_id)?.full_name?.toLowerCase().includes(searchLower);
    
    // Apply date range filter
    const matchesDateFrom = !dateFrom || logDate >= dateFrom;
    const matchesDateTo = !dateTo || logDate <= new Date(dateTo.setHours(23, 59, 59, 999));
    
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      toast({
        title: 'No Data',
        description: 'No activity logs to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Date', 'Action', 'Admin', 'Admin Email', 'Target User', 'IP Address'];
    const csvData = filteredLogs.map(log => {
      const admin = adminProfiles.get(log.admin_user_id);
      return [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.action_type,
        admin?.full_name || 'N/A',
        admin?.email || 'N/A',
        log.target_user_email || 'N/A',
        log.ip_address || 'N/A',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `Exported ${filteredLogs.length} activity logs to CSV`,
    });
  };

  const exportToPDF = () => {
    if (filteredLogs.length === 0) {
      toast({
        title: 'No Data',
        description: 'No activity logs to export',
        variant: 'destructive',
      });
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('ChainPass Admin Activity Log', 14, 22);
    
    // Add date range info
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP HH:mm:ss')}`, 14, 30);
    if (dateFrom || dateTo) {
      const dateRangeText = `Date Range: ${dateFrom ? format(dateFrom, 'PPP') : 'All'} - ${dateTo ? format(dateTo, 'PPP') : 'All'}`;
      doc.text(dateRangeText, 14, 36);
    }
    
    // Prepare table data
    const tableData = filteredLogs.map(log => {
      const admin = adminProfiles.get(log.admin_user_id);
      return [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm'),
        log.action_type,
        admin?.full_name || 'N/A',
        admin?.email || 'N/A',
        log.target_user_email || 'N/A',
        log.ip_address || 'N/A',
      ];
    });

    // Add table
    autoTable(doc, {
      startY: dateFrom || dateTo ? 42 : 36,
      head: [['Date', 'Action', 'Admin', 'Admin Email', 'Target User', 'IP Address']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40 },
    });

    // Save the PDF
    doc.save(`activity-logs-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
      title: 'Export Successful',
      description: `Exported ${filteredLogs.length} activity logs to PDF`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, admin, or target user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Calendar className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PPP') : 'From Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Calendar className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PPP') : 'To Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button onClick={exportToPDF} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
        {filteredLogs.length > 0 && (
          <span className="text-sm text-muted-foreground self-center ml-2">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'} found
          </span>
        )}
      </div>

      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const admin = adminProfiles.get(log.admin_user_id);
          
          return (
            <Card key={log.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionVariant(log.action_type)} className="gap-1">
                        {getActionIcon(log.action_type)}
                        {log.action_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Admin:</span>{' '}
                        <span className="text-muted-foreground">
                          {admin?.full_name || admin?.email || log.admin_user_id}
                        </span>
                      </div>
                    </div>

                    {log.target_user_email && (
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Target:</span>{' '}
                          <span className="text-muted-foreground">{log.target_user_email}</span>
                        </div>
                      </div>
                    )}

                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium hover:text-primary">
                          View Details
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}

                    {log.ip_address && (
                      <div className="text-xs text-muted-foreground">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredLogs.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {searchTerm ? 'No matching activity logs found' : 'No activity logs yet'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
