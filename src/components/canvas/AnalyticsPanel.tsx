import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Table } from 'lucide-react';
import { analyticsAPI } from '@/lib/api/analytics';
import { meetingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

interface AnalyticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    isOwner: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPanel({ isOpen, onClose, roomId, isOwner }: AnalyticsPanelProps) {
    const { user } = useAuth();
    const { guestUser } = useGuest();
    const userId = user?._id || guestUser?.guestId;

    const [activeTab, setActiveTab] = useState<'summary' | 'my-contribution' | 'history' | 'compare'>('summary');
    const [summaryData, setSummaryData] = useState<any>(null);
    const [myStats, setMyStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);

    // Compare State
    const [myMeetings, setMyMeetings] = useState<any[]>([]);
    const [compareMeetingId, setCompareMeetingId] = useState<string>('');
    const [compareSummary, setCompareSummary] = useState<any>(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !roomId) return;
        fetchData();
    }, [isOpen, roomId, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'summary' && isOwner) {
                const data = await analyticsAPI.getSummary(roomId);
                setSummaryData(data);
            } else if (activeTab === 'my-contribution' && userId) {
                const data = await analyticsAPI.getUserReport(roomId, userId);
                setMyStats(data);
            } else if (activeTab === 'history' && isOwner) {
                const data = await analyticsAPI.getHistory(roomId);
                setHistory(data);
            } else if (activeTab === 'compare' && isOwner) {
                // Fetch current room summary if missing
                if (!summaryData) {
                    const data = await analyticsAPI.getSummary(roomId);
                    setSummaryData(data);
                }
                // Fetch meetings list
                if (myMeetings.length === 0) {
                    const meetings = await meetingsAPI.getAll();
                    setMyMeetings(meetings.filter((m: any) => `room-${m._id}` !== roomId));
                }
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompareSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetId = e.target.value;
        setCompareMeetingId(targetId);
        if (!targetId) {
            setCompareSummary(null);
            return;
        }
        setLoading(true);
        try {
            const data = await analyticsAPI.getSummary(`room-${targetId}`);
            setCompareSummary(data);
        } catch (error) {
            console.error('Error fetching compare data:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Session Analytics Report', 14, 22);

        doc.setFontSize(12);
        if (summaryData) {
            doc.text(`Total Edits: ${summaryData.totalEdits}`, 14, 32);
            doc.text(`Total Viewers: ${summaryData.totalViewers}`, 14, 40);

            const partData = Object.entries(summaryData.userContributions).map(([name, stats]: any) => [
                name, stats.editCount, stats.viewCount
            ]);
            autoTable(doc, {
                startY: 50,
                head: [['User/Guest', 'Edits', 'Views']],
                body: partData,
            });
        }

        if (history.length > 0) {
            const histData = history.map(h => [
                h.userName || 'Anonymous',
                h.action,
                h.details?.type || 'N/A',
                format(new Date(h.timestamp), 'PPpp')
            ]);
            autoTable(doc, {
                startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 50,
                head: [['User', 'Action', 'Type', 'Time']],
                body: histData,
            });
        }

        doc.save(`analytics-report-${roomId}.pdf`);
    };

    const exportCSV = () => {
        if (activeTab === 'summary' && summaryData) {
            const csvData = Object.entries(summaryData.userContributions).map(([name, stats]: any) => ({
                User: name,
                Edits: stats.editCount,
                Views: stats.viewCount,
            }));
            const csv = Papa.unparse(csvData);
            downloadFile(csv, 'text/csv', `participation-${roomId}.csv`);
        } else if (activeTab === 'history') {
            const csvData = history.map(h => ({
                User: h.userName || 'Anonymous',
                Action: h.action,
                Details: JSON.stringify(h.details || {}),
                Time: format(new Date(h.timestamp), 'PPpp')
            }));
            const csv = Papa.unparse(csvData);
            downloadFile(csv, 'text/csv', `history-${roomId}.csv`);
        } else if (activeTab === 'my-contribution' && myStats) {
            const csvData = [{
                User: user?.name || 'Guest',
                Edits: myStats.editCount,
                SessionTimeMinutes: myStats.sessionTimeMinutes
            }];
            const csv = Papa.unparse(csvData);
            downloadFile(csv, 'text/csv', `my-contribution-${roomId}.csv`);
        }
    };

    const downloadFile = (content: string, type: string, filename: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatTimelineData = () => {
        if (!summaryData?.activityTimeline) return [];
        return Object.entries(summaryData.activityTimeline).map(([date, stats]: any) => ({
            date,
            edits: stats.edits,
            views: stats.views
        }));
    };

    const formatPieData = () => {
        if (!summaryData?.userContributions) return [];
        return Object.entries(summaryData.userContributions).map(([name, stats]: any) => ({
            name,
            value: stats.editCount
        })).filter(d => d.value > 0);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-800">Analytics & Reports</h2>
                        <div className="flex gap-2">
                            <button onClick={exportPDF} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600" title="Export PDF">
                                <FileText className="w-4 h-4" />
                            </button>
                            <button onClick={exportCSV} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600" title="Export CSV">
                                <Table className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex border-b border-gray-100">
                        {isOwner && (
                            <>
                                <button
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('summary')}
                                >
                                    Summary
                                </button>
                                <button
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('history')}
                                >
                                    History
                                </button>
                                <button
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'compare' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('compare')}
                                >
                                    Compare
                                </button>
                            </>
                        )}
                        <button
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'my-contribution' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('my-contribution')}
                        >
                            My Contribution
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 hide-scrollbar bg-gray-50/30">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">

                                {/* 1. Summary Tab */}
                                {activeTab === 'summary' && isOwner && summaryData && (
                                    <div className="space-y-6 animate-in fade-in">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                <p className="text-sm text-gray-500 font-medium">Total Edits</p>
                                                <p className="text-3xl font-bold text-gray-800 mt-1">{summaryData.totalEdits}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                <p className="text-sm text-gray-500 font-medium">Total Viewers</p>
                                                <p className="text-3xl font-bold text-gray-800 mt-1">{summaryData.totalViewers}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Timeline</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={formatTimelineData()}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                        <Legend iconType="circle" />
                                                        <Line type="monotone" dataKey="edits" stroke="#8884d8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                        <Line type="monotone" dataKey="views" stroke="#82ca9d" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Participation Distribution</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={formatPieData()}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {formatPieData().map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. My Contribution Tab */}
                                {activeTab === 'my-contribution' && myStats && (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Your Total Edits</p>
                                            <p className="text-5xl font-bold tracking-tight text-primary mt-4 mb-2">{myStats.editCount}</p>
                                            <p className="text-xs text-gray-400">Contributions in this session</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Session Time</p>
                                            <p className="text-5xl font-bold tracking-tight text-emerald-500 mt-4 mb-2">{myStats.sessionTimeMinutes}</p>
                                            <p className="text-xs text-gray-400">Minutes spent working</p>
                                        </div>
                                    </div>
                                )}

                                {/* 3. Edit History Tab */}
                                {activeTab === 'history' && isOwner && (
                                    <div className="space-y-3 animate-in fade-in">
                                        {history.length > 0 ? history.map((h, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-1">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-medium text-sm text-gray-800">{h.userName || 'Anonymous'}</span>
                                                    <span className="text-xs text-gray-400">{format(new Date(h.timestamp), 'h:mm a')}</span>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    <span className="font-semibold text-primary capitalize">{h.action}</span>
                                                    {h.details?.type && ` - ${h.details.type}`}
                                                </p>
                                            </div>
                                        )) : (
                                            <div className="text-center text-gray-500 py-10">No history available yet.</div>
                                        )}
                                    </div>
                                )}

                                {/* 4. Compare Tab */}
                                {activeTab === 'compare' && isOwner && (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select a session to compare</label>
                                            <select
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm p-2 bg-gray-50"
                                                value={compareMeetingId}
                                                onChange={handleCompareSelect}
                                            >
                                                <option value="">-- Choose Session --</option>
                                                {myMeetings.map(m => (
                                                    <option key={m._id} value={m._id}>{m.title}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {compareSummary && summaryData && (
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                                                <h3 className="text-sm font-semibold text-gray-700">Comparison Results</h3>

                                                <div className="grid grid-cols-3 gap-2 text-center items-center">
                                                    <div className="text-xs text-gray-500 font-medium">Metric</div>
                                                    <div className="text-xs font-bold text-primary truncate">Current Session</div>
                                                    <div className="text-xs font-bold text-emerald-600 truncate">Selected Session</div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-center items-center py-2 border-b border-gray-50">
                                                    <div className="text-sm font-medium text-gray-600">Total Edits</div>
                                                    <div className="text-lg font-bold text-gray-800">{summaryData.totalEdits}</div>
                                                    <div className="text-lg font-bold text-gray-800">{compareSummary.totalEdits}</div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-center items-center py-2">
                                                    <div className="text-sm font-medium text-gray-600">Total Viewers</div>
                                                    <div className="text-lg font-bold text-gray-800">{summaryData.totalViewers}</div>
                                                    <div className="text-lg font-bold text-gray-800">{compareSummary.totalViewers}</div>
                                                </div>

                                                <div className="mt-6 h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={[
                                                                { name: 'Edits', Current: summaryData.totalEdits, Compared: compareSummary.totalEdits },
                                                                { name: 'Viewers', Current: summaryData.totalViewers, Compared: compareSummary.totalViewers }
                                                            ]}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                                            <YAxis tickLine={false} axisLine={false} />
                                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                                            <Legend />
                                                            <Bar dataKey="Current" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                                            <Bar dataKey="Compared" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
