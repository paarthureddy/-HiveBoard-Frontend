import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '@/types/room';
import { Users, Crown, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

interface ParticipantsListProps {
    participants: Participant[];
    currentUserId?: string;
    currentGuestId?: string;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
    participants,
    currentUserId,
    currentGuestId,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (id: string) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-yellow-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-teal-500',
        ];
        const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const isCurrentUser = (participant: Participant) => {
        return (
            (currentUserId && participant.userId === currentUserId) ||
            (currentGuestId && participant.guestId === currentGuestId)
        );
    };

    return (
        <div className="fixed right-4 top-20 z-40 w-64">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-border rounded-xl shadow-elevated overflow-hidden"
            >
                {/* Header */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">
                            Participants ({participants.length})
                        </span>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        ▼
                    </motion.div>
                </button>

                {/* Participants List */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="p-2 max-h-96 overflow-y-auto">
                                {participants.map((participant) => (
                                    <motion.div
                                        key={participant.socketId}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`flex items-center gap-3 p-2 rounded-lg mb-1 ${isCurrentUser(participant)
                                                ? 'bg-primary/10 border border-primary/20'
                                                : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(
                                                    participant.userId || participant.guestId || participant.socketId
                                                )}`}
                                            >
                                                {getInitials(participant.name)}
                                            </div>
                                            {/* Online indicator */}
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                                        </div>

                                        {/* Name and role */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-medium truncate">
                                                    {participant.name}
                                                    {isCurrentUser(participant) && (
                                                        <span className="text-xs text-muted-foreground ml-1">(You)</span>
                                                    )}
                                                </span>
                                                {participant.isOwner && (
                                                    <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                {participant.userId ? (
                                                    <UserCircle className="w-3 h-3" />
                                                ) : (
                                                    <span className="text-xs">Guest</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {participants.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No participants yet
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ParticipantsList;
