'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  LogOut,
  RefreshCw,
  BarChart3,
  FileDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  totalPageViews: number;
  uniqueVisitors: number;
  formatBreakdown: {
    docx: number;
    pdf: number;
    gdocs: number;
  };
  dailyConversions?: { date: string; count: number }[];
}

interface RecentConversion {
  id: number;
  job_id: string;
  formats: string;
  success: boolean;
  processing_time_ms: number;
  created_at: string;
}

interface RecentPageView {
  id: number;
  path: string;
  browser: string;
  os: string;
  device_type: string;
  created_at: string;
}

type TimePeriod = '1d' | '7d' | '30d' | 'all';

const COLORS = ['#93278f', '#F7931E', '#29ABE2'];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [recentPageViews, setRecentPageViews] = useState<RecentPageView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const router = useRouter();

  const fetchData = async (period: TimePeriod = timePeriod) => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsRes, conversionsRes, pageViewsRes] = await Promise.all([
        fetch(`/api/admin/metrics/stats?period=${period}`),
        fetch(`/api/admin/metrics/conversions?period=${period}`),
        fetch(`/api/admin/metrics/page-views?period=${period}`),
      ]);

      if (!statsRes.ok || !conversionsRes.ok || !pageViewsRes.ok) {
        if (statsRes.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const [statsData, conversionsData, pageViewsData] = await Promise.all([
        statsRes.json(),
        conversionsRes.json(),
        pageViewsRes.json(),
      ]);

      setStats(statsData);
      setRecentConversions(conversionsData.conversions || []);
      setRecentPageViews(pageViewsData.pageViews || []);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    fetchData(period);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const successRate = stats
    ? stats.totalConversions > 0
      ? ((stats.successfulConversions / stats.totalConversions) * 100).toFixed(1)
      : '0'
    : '0';

  // Format breakdown data for pie chart
  const pieData = stats?.formatBreakdown
    ? [
        { name: 'Word', value: stats.formatBreakdown.docx },
        { name: 'PDF', value: stats.formatBreakdown.pdf },
        { name: 'Google Docs', value: stats.formatBreakdown.gdocs },
      ].filter((d) => d.value > 0)
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbf7f1] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#00A99D]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf7f1]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-[#00A99D] mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-[#33475b]">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Usage analytics and metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData()}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Time Period Filter */}
        <div className="mb-6 flex gap-2">
          {[
            { value: '1d', label: 'Today' },
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: 'all', label: 'All time' },
          ].map((option) => (
            <Button
              key={option.value}
              variant={timePeriod === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimePeriodChange(option.value as TimePeriod)}
              className={timePeriod === option.value ? 'bg-[#00A99D] hover:bg-[#00A99D]/90' : ''}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Conversions
              </CardTitle>
              <FileDown className="h-5 w-5 text-[#00A99D]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#33475b]">
                {stats?.totalConversions || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#33475b]">{successRate}%</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.successfulConversions || 0} successful,{' '}
                {stats?.failedConversions || 0} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Page Views
              </CardTitle>
              <Eye className="h-5 w-5 text-[#29ABE2]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#33475b]">
                {stats?.totalPageViews || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Unique Visitors
              </CardTitle>
              <FileText className="h-5 w-5 text-[#93278f]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#33475b]">
                {stats?.uniqueVisitors || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Conversions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Conversions Over Time</CardTitle>
              <CardDescription>Daily conversion activity</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.dailyConversions && stats.dailyConversions.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.dailyConversions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#00A99D"
                      strokeWidth={2}
                      dot={{ fill: '#00A99D' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No conversion data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Format Breakdown</CardTitle>
              <CardDescription>Conversions by output format</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No format data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="conversions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="conversions">Recent Conversions</TabsTrigger>
            <TabsTrigger value="pageviews">Recent Page Views</TabsTrigger>
          </TabsList>

          <TabsContent value="conversions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Conversions</CardTitle>
                <CardDescription>Last 20 conversion requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Formats</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentConversions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No conversions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentConversions.map((conv) => (
                        <TableRow key={conv.id}>
                          <TableCell className="font-mono text-xs">
                            {conv.job_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex gap-1">
                              {conv.formats.split(',').map((fmt) => (
                                <span
                                  key={fmt}
                                  className="px-2 py-0.5 text-xs rounded bg-gray-100"
                                >
                                  {fmt.trim().toUpperCase()}
                                </span>
                              ))}
                            </span>
                          </TableCell>
                          <TableCell>
                            {conv.success ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Success
                              </span>
                            ) : (
                              <span className="flex items-center text-red-600">
                                <XCircle className="h-4 w-4 mr-1" />
                                Failed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {conv.processing_time_ms ? `${conv.processing_time_ms}ms` : '-'}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(conv.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pageviews">
            <Card>
              <CardHeader>
                <CardTitle>Recent Page Views</CardTitle>
                <CardDescription>Last 20 page views</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPageViews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          No page views yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPageViews.map((view) => (
                        <TableRow key={view.id}>
                          <TableCell className="font-medium">{view.path}</TableCell>
                          <TableCell>{view.browser || 'Unknown'}</TableCell>
                          <TableCell className="capitalize">
                            {view.device_type || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(view.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-[#00A99D] hover:text-[#00A99D]/80 transition-colors"
          >
            ← Back to Converter
          </a>
        </div>
      </main>
    </div>
  );
}
