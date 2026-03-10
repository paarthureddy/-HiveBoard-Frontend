import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    X, Users, Clock, Zap, BarChart2, Trophy, GitCompare,
    Loader2, TrendingUp, Star, Activity, MessageSquare,
} from 'lucide-react';

interface AnalyticsDashboardProps {
    meetingId: string;
    meetingTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

// ── Colour palette ──────────────────────────────────────────────────────────
const PIE_COLORS = ['#5F4A8B', '#FF8C00', '#4CAF50', '#E91E63', '#2196F3'];
const BRAND = { purple: 'rgb(95,74,139)', gold: 'rgb(255,212,29)', orange: 'rgb(255,162,64)' };

// ── Small reusable stat card ─────────────────────────────────────────────────
const StatCard = ({
    icon: Icon, label, value, sub, color = BRAND.purple,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
}) => (
    <div
        className="rounded-2xl p-4 flex flex-col gap-1 border"
        style={{ backgroundColor: `${color}12`, borderColor: `${color}30` }}
    >
        <div className="flex items-center gap-2 text-xs font-medium opacity-70" style={{ color }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-xs opacity-60" style={{ color }}>{sub}</p>}
    </div>
);

// ── Custom donut label in centre ─────────────────────────────────────────────
const DonutLabel = ({ cx, cy, total }: { cx: number; cy: number; total: number }) => (
    <>
        <text x={cx} y={cy - 6} textAnchor="middle" fill={BRAND.purple} fontSize={22} fontWeight={700}>
            {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={BRAND.purple} fontSize={11} opacity={0.6}>
            participants
        </text>
    </>
);

// ── Main component ───────────────────────────────────────────────────────────
const AnalyticsDashboard = ({ meetingId, meetingTitle, isOpen, onClose }: AnalyticsDashboardProps) => {
    const [metrics, setMetrics] = useState<any>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsError, setMetricsError] = useState('');

    // Compare state
    const [compareResult, setCompareResult] = useState<any>(null);
    const [compareLoading, setCompareLoading] = useState(false);
    const [compareError, setCompareError] = useState('');
    const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
    const [view, setView] = useState<'metrics' | 'compare'>('metrics');

    // Fetch metrics whenever modal opens
    useEffect(() => {
        if (!isOpen || !meetingId) return;
        setMetrics(null);
        setMetricsError('');
        setCompareResult(null);
        setSelectedSessions([]);
        setView('metrics');
        fetchMetrics();
    }, [isOpen, meetingId]);

    const fetchMetrics = async () => {
        setMetricsLoading(true);
        try {
            const data = await analyticsAPI.getMetrics(meetingId);
            setMetrics(data);
        } catch (e: any) {
            setMetricsError(e?.response?.data?.message || 'Failed to load metrics');
        } finally {
            setMetricsLoading(false);
        }
    };

    const handleCompare = async () => {
        if (selectedSessions.length < 2) return;
        setCompareLoading(true);
        setCompareError('');
        try {
            const data = await analyticsAPI.compareSessions(selectedSessions);
            setCompareResult(data);
            setView('compare');
        } catch (e: any) {
            setCompareError(e?.response?.data?.message || 'Failed to compare sessions');
        } finally {
            setCompareLoading(false);
        }
    };

    const toggleSession = (id: string) => {
        setSelectedSessions(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : prev.length < 10 ? [...prev, id] : prev
        );
    };

    // Build pie data from metrics
    const pieData = metrics
        ? [
            { name: 'Editors', value: metrics.editorCount ?? 0 },
            { name: 'Viewers', value: metrics.viewerCount ?? 0 },
        ].filter(d => d.value > 0)
        : [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-4 md:inset-8 lg:inset-12 bg-[rgb(245,244,235)] rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border-2"
                        style={{ borderColor: BRAND.purple + '40' }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4 border-b"
                            style={{ backgroundColor: `${BRAND.purple}cc`, borderColor: `${BRAND.purple}40` }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: BRAND.gold + '30' }}>
                                    <BarChart2 className="w-5 h-5" style={{ color: BRAND.gold }} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-white leading-tight">Analytics Dashboard</h2>
                                    <p className="text-xs text-white/60 truncate max-w-xs">{meetingTitle}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Tab switcher */}
                                <div className="flex rounded-xl overflow-hidden border border-white/20">
                                    <button
                                        onClick={() => setView('metrics')}
                                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'metrics'
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/60 hover:text-white'}`}
                                    >
                                        <Activity className="w-3.5 h-3.5 inline mr-1" />Metrics
                                    </button>
                                    {compareResult && (
                                        <button
                                            onClick={() => setView('compare')}
                                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'compare'
                                                ? 'bg-white/20 text-white'
                                                : 'text-white/60 hover:text-white'}`}
                                        >
                                            <GitCompare className="w-3.5 h-3.5 inline mr-1" />Compare
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">

                            {/* ── METRICS VIEW ── */}
                            {view === 'metrics' && (
                                <>
                                    {metricsLoading && (
                                        <div className="flex items-center justify-center h-64">
                                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND.purple }} />
                                        </div>
                                    )}

                                    {metricsError && (
                                        <div className="flex items-center justify-center h-64 text-red-500 text-sm">
                                            {metricsError}
                                        </div>
                                    )}

                                    {metrics && !metricsLoading && (
                                        <div className="space-y-6">
                                            {/* KPI Cards */}
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                <StatCard
                                                    icon={Users}
                                                    label="Total Participants"
                                                    value={metrics.totalParticipants ?? '—'}
                                                    color={BRAND.purple}
                                                />
                                                <StatCard
                                                    icon={TrendingUp}
                                                    label="Participation Rate"
                                                    value={`${metrics.participationRate ?? 0}%`}
                                                    color={BRAND.orange}
                                                />
                                                <StatCard
                                                    icon={Zap}
                                                    label="Total Edits"
                                                    value={metrics.totalEdits ?? 0}
                                                    color="#4CAF50"
                                                />
                                                <StatCard
                                                    icon={Clock}
                                                    label="Avg Session"
                                                    value={`${metrics.avgSessionDurationMinutes ?? 0} min`}
                                                    color="#2196F3"
                                                />
                                                <StatCard
                                                    icon={Activity}
                                                    label="Peak Hour"
                                                    value={metrics.peakActivityHour != null
                                                        ? `${metrics.peakActivityHour}:00`
                                                        : '—'}
                                                    color="#E91E63"
                                                />
                                                <StatCard
                                                    icon={Users}
                                                    label="Editors / Viewers"
                                                    value={`${metrics.editorCount ?? 0} / ${metrics.viewerCount ?? 0}`}
                                                    color={BRAND.purple}
                                                />
                                            </div>

                                            {/* Donut chart + Leaderboard */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                                {/* Donut chart */}
                                                <div
                                                    className="rounded-2xl p-5 border"
                                                    style={{ backgroundColor: `${BRAND.purple}08`, borderColor: `${BRAND.purple}20` }}
                                                >
                                                    <h3 className="font-semibold text-sm mb-4" style={{ color: BRAND.purple }}>
                                                        Editor vs Viewer Distribution
                                                    </h3>
                                                    {pieData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={220}>
                                                            <PieChart>
                                                                <Pie
                                                                    data={pieData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={65}
                                                                    outerRadius={90}
                                                                    paddingAngle={3}
                                                                    dataKey="value"
                                                                    labelLine={false}
                                                                >
                                                                    {pieData.map((_, i) => (
                                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                                    ))}
                                                                    {/* Centre label */}
                                                                    <DonutLabel
                                                                        cx={0}
                                                                        cy={0}
                                                                        total={metrics.totalParticipants ?? 0}
                                                                    />
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        borderRadius: '12px',
                                                                        border: `1px solid ${BRAND.purple}30`,
                                                                        background: 'rgb(245,244,235)',
                                                                    }}
                                                                />
                                                                <Legend
                                                                    iconType="circle"
                                                                    iconSize={8}
                                                                    wrapperStyle={{ fontSize: '12px' }}
                                                                />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="h-[220px] flex items-center justify-center text-sm opacity-50"
                                                            style={{ color: BRAND.purple }}>
                                                            No participant data yet
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Leaderboard */}
                                                <div
                                                    className="rounded-2xl p-5 border"
                                                    style={{ backgroundColor: `${BRAND.orange}08`, borderColor: `${BRAND.orange}25` }}
                                                >
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="font-semibold text-sm" style={{ color: BRAND.purple }}>
                                                            🏅 Participant Leaderboard
                                                        </h3>
                                                        {selectedSessions.length >= 2 && (
                                                            <Button
                                                                size="sm"
                                                                onClick={handleCompare}
                                                                disabled={compareLoading}
                                                                className="h-7 text-xs gap-1"
                                                                style={{ backgroundColor: BRAND.purple, color: 'white' }}
                                                            >
                                                                {compareLoading
                                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                    : <GitCompare className="w-3 h-3" />}
                                                                Compare ({selectedSessions.length})
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {compareError && (
                                                        <p className="text-xs text-red-500 mb-2">{compareError}</p>
                                                    )}

                                                    {metrics.leaderboard && metrics.leaderboard.length > 0 ? (
                                                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                                            {metrics.leaderboard.map((entry: any, idx: number) => (
                                                                <motion.div
                                                                    key={entry.sessionId || entry.name || idx}
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: idx * 0.04 }}
                                                                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${selectedSessions.includes(entry.sessionId)
                                                                            ? 'border-[rgb(95,74,139)] bg-[rgb(95,74,139)]/10'
                                                                            : 'border-transparent hover:border-[rgb(95,74,139)]/30 hover:bg-[rgb(95,74,139)]/5'
                                                                        }`}
                                                                    onClick={() => entry.sessionId && toggleSession(entry.sessionId)}
                                                                >
                                                                    {/* Rank badge */}
                                                                    <div
                                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                                        style={{
                                                                            backgroundColor: idx === 0
                                                                                ? BRAND.gold
                                                                                : idx === 1
                                                                                    ? '#C0C0C0'
                                                                                    : idx === 2
                                                                                        ? '#CD7F32'
                                                                                        : `${BRAND.purple}20`,
                                                                            color: idx < 3 ? '#333' : BRAND.purple,
                                                                        }}
                                                                    >
                                                                        {idx + 1}
                                                                    </div>

                                                                    {/* Checkbox indicator */}
                                                                    {entry.sessionId && (
                                                                        <div
                                                                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selectedSessions.includes(entry.sessionId)
                                                                                    ? 'border-[rgb(95,74,139)] bg-[rgb(95,74,139)]'
                                                                                    : 'border-gray-300'
                                                                                }`}
                                                                        >
                                                                            {selectedSessions.includes(entry.sessionId) && (
                                                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium truncate" style={{ color: BRAND.purple }}>
                                                                            {entry.name || entry.userName || 'Unknown'}
                                                                        </p>
                                                                        <p className="text-xs opacity-60 truncate" style={{ color: BRAND.purple }}>
                                                                            {entry.role || '—'} · {entry.durationMinutes ?? 0} min
                                                                        </p>
                                                                    </div>

                                                                    {/* Score */}
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <Star className="w-3 h-3" style={{ color: BRAND.gold }} />
                                                                        <span className="text-sm font-bold" style={{ color: BRAND.purple }}>
                                                                            {entry.participationScore ?? 0}
                                                                        </span>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-[200px] flex items-center justify-center text-sm opacity-50"
                                                            style={{ color: BRAND.purple }}>
                                                            No leaderboard data yet
                                                        </div>
                                                    )}

                                                    {metrics.leaderboard && metrics.leaderboard.length > 0 && (
                                                        <p className="text-[10px] mt-3 opacity-50 text-center" style={{ color: BRAND.purple }}>
                                                            Select 2–10 sessions then click Compare
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ── COMPARE VIEW ── */}
                            {view === 'compare' && compareResult && (
                                <div className="space-y-5">
                                    {/* Summary banner */}
                                    <div
                                        className="rounded-2xl p-4 flex flex-wrap items-center gap-4 border"
                                        style={{ backgroundColor: `${BRAND.gold}18`, borderColor: `${BRAND.gold}40` }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Trophy className="w-5 h-5" style={{ color: BRAND.gold }} />
                                            <div>
                                                <p className="text-xs opacity-60" style={{ color: BRAND.purple }}>Winner Session</p>
                                                <p className="font-bold text-sm" style={{ color: BRAND.purple }}>
                                                    {compareResult.summary?.winner ?? '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {compareResult.summary?.scoreDifference != null && (
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <p className="text-xs opacity-60" style={{ color: BRAND.purple }}>Score Difference</p>
                                                    <p className="font-bold text-sm text-green-600">
                                                        +{compareResult.summary.scoreDifference} pts
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setView('metrics')}
                                            className="ml-auto text-xs underline opacity-60 hover:opacity-100 transition-opacity"
                                            style={{ color: BRAND.purple }}
                                        >
                                            ← Back to Metrics
                                        </button>
                                    </div>

                                    {/* Comparison table */}
                                    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: `${BRAND.purple}20` }}>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr style={{ backgroundColor: `${BRAND.purple}cc` }}>
                                                    {['Participant', 'Session', 'Role', 'Duration', 'Edits', 'Messages', 'Score'].map(h => (
                                                        <th
                                                            key={h}
                                                            className="px-4 py-3 text-left text-xs font-semibold text-white/80 whitespace-nowrap"
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(compareResult.sessions ?? []).flatMap((session: any, sIdx: number) =>
                                                    (session.participants ?? []).map((p: any, pIdx: number) => {
                                                        const isWinner = compareResult.summary?.winner === session.sessionId
                                                            || compareResult.summary?.winner === session.title;
                                                        return (
                                                            <motion.tr
                                                                key={`${sIdx}-${pIdx}`}
                                                                initial={{ opacity: 0, y: 6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: (sIdx * 10 + pIdx) * 0.02 }}
                                                                className="border-t transition-colors hover:bg-[rgb(95,74,139)]/5"
                                                                style={{
                                                                    borderColor: `${BRAND.purple}15`,
                                                                    backgroundColor: isWinner
                                                                        ? `${BRAND.gold}12`
                                                                        : undefined,
                                                                }}
                                                            >
                                                                <td className="px-4 py-2.5 font-medium" style={{ color: BRAND.purple }}>
                                                                    {p.name || p.userName || '—'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-xs max-w-[140px] truncate" style={{ color: BRAND.purple }}>
                                                                    <span className="flex items-center gap-1.5">
                                                                        {isWinner && (
                                                                            <span title="Winner session" className="text-base leading-none">🏆</span>
                                                                        )}
                                                                        <span className="truncate opacity-70">
                                                                            {session.title || session.sessionId || `Session ${sIdx + 1}`}
                                                                        </span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <span
                                                                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                                                        style={{
                                                                            backgroundColor: p.role === 'owner' || p.role === 'editor'
                                                                                ? `${BRAND.orange}25`
                                                                                : `${BRAND.purple}15`,
                                                                            color: p.role === 'owner' || p.role === 'editor'
                                                                                ? BRAND.orange
                                                                                : BRAND.purple,
                                                                        }}
                                                                    >
                                                                        {p.role || '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-xs" style={{ color: BRAND.purple }}>
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3 opacity-50" />
                                                                        {p.durationMinutes ?? 0} min
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-xs" style={{ color: BRAND.purple }}>
                                                                    <span className="flex items-center gap-1">
                                                                        <Zap className="w-3 h-3 opacity-50" />
                                                                        {p.edits ?? 0}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-xs" style={{ color: BRAND.purple }}>
                                                                    <span className="flex items-center gap-1">
                                                                        <MessageSquare className="w-3 h-3 opacity-50" />
                                                                        {p.messages ?? 0}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <span
                                                                        className="flex items-center gap-1 font-bold text-sm"
                                                                        style={{ color: isWinner ? BRAND.orange : BRAND.purple }}
                                                                    >
                                                                        <Star className="w-3 h-3" style={{ color: BRAND.gold }} />
                                                                        {p.participationScore ?? 0}
                                                                    </span>
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>

                                        {(!compareResult.sessions || compareResult.sessions.length === 0) && (
                                            <div className="py-16 text-center text-sm opacity-50" style={{ color: BRAND.purple }}>
                                                No comparison data available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AnalyticsDashboard;
