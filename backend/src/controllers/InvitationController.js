const TeamInvitationModel = require('../models/TeamInvitationModel');
const TeamMemberModel     = require('../models/TeamMemberModel');
const TeamModel           = require('../models/TeamModel');
const NotificationModel   = require('../models/NotificationModel');
const UserModel           = require('../models/UserModel');
const SSEService          = require('../services/SSEService');

async function notifyAndPush(userId, type, data) {
    const notification = await NotificationModel.create(userId, type, data);
    SSEService.push(userId, notification);
}

class InvitationController {

    // GET /api/invitations/my — мои входящие приглашения
    static async getMy(req, res) {
        try {
            const invitations = await TeamInvitationModel.findPendingForUser(req.user.id);
            res.json({ data: invitations });
        } catch (err) {
            console.error('getMy invitations error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST /api/invitations/:id/accept
    static async accept(req, res) {
        try {
            const inv = await TeamInvitationModel.findById(req.params.id);

            if (!inv) {
                return res.status(404).json({ error: 'Приглашение не найдено' });
            }
            if (String(inv.invitee_id) !== String(req.user.id)) {
                return res.status(403).json({ error: 'Это приглашение не для вас' });
            }
            if (inv.status !== 'pending') {
                return res.status(400).json({ error: 'Приглашение уже обработано' });
            }
            if (new Date(inv.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Срок действия приглашения истёк' });
            }

            const alreadyMember = await TeamMemberModel.isMember(inv.team_id, req.user.id);
            if (alreadyMember) {
                await TeamInvitationModel.updateStatus(inv.id, 'accepted');
                return res.status(409).json({ error: 'Вы уже состоите в этой команде' });
            }

            await TeamInvitationModel.updateStatus(inv.id, 'accepted');
            await TeamMemberModel.add(inv.team_id, req.user.id, 'member');

            // Уведомляем пригласившего
            const user = await UserModel.findById(req.user.id);
            await notifyAndPush(inv.inviter_id, 'invitation_accepted', {
                team_id:   Number(inv.team_id),
                team_name: inv.team_name,
                user_name: user?.username,
                user_avatar: user?.avatar,
            });

            // Уведомляем всех участников команды (кроме нового и пригласившего)
            const members = await TeamMemberModel.getMembers(inv.team_id);
            const otherIds = members
                .map(m => m.user_id)
                .filter(id => id !== req.user.id && id !== inv.inviter_id);

            for (const uid of otherIds) {
                await notifyAndPush(uid, 'member_joined', {
                    team_id:    Number(inv.team_id),
                    team_name:  inv.team_name,
                    user_name:  user?.username,
                    user_avatar: user?.avatar,
                });
            }

            const team = await TeamModel.findById(inv.team_id);
            res.json({ message: `Вы вступили в команду «${inv.team_name}»`, data: team });
        } catch (err) {
            console.error('accept invitation error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST /api/invitations/:id/decline
    static async decline(req, res) {
        try {
            const inv = await TeamInvitationModel.findById(req.params.id);

            if (!inv) {
                return res.status(404).json({ error: 'Приглашение не найдено' });
            }
            if (String(inv.invitee_id) !== String(req.user.id)) {
                return res.status(403).json({ error: 'Это приглашение не для вас' });
            }
            if (inv.status !== 'pending') {
                return res.status(400).json({ error: 'Приглашение уже обработано' });
            }

            await TeamInvitationModel.updateStatus(inv.id, 'declined');

            const user = await UserModel.findById(req.user.id);
            await notifyAndPush(inv.inviter_id, 'invitation_declined', {
                team_id:   Number(inv.team_id),
                team_name: inv.team_name,
                user_name: user?.username,
            });

            res.json({ message: 'Приглашение отклонено' });
        } catch (err) {
            console.error('decline invitation error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = InvitationController;
