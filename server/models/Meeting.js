import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a meeting title'],
        trim: true,
        default: 'Untitled Meeting',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    canvasData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    thumbnail: {
        type: String,
        default: '',
    },
    inviteToken: {
        type: String,
        unique: true,
        sparse: true,
    },
    inviteEnabled: {
        type: Boolean,
        default: false,
    },
    allowGuests: {
        type: Boolean,
        default: true,
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        role: {
            type: String,
            enum: ['owner', 'editor', 'viewer'],
            default: 'viewer',
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt timestamp before saving
meetingSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
