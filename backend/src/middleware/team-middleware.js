const TeamMemberModel = require('../models/TeamMemberModel');

async function requireTeamMember(req, res, next) {
    try {
        const teamId = req.params.teamId ?? req.params.id;
        const isMember = await TeamMemberModel.isMember(teamId, req.user.id);
        if (!isMember) {
            return res.status(403).json({ error: 'Вы не являетесь участником этой команды' });
        }
        req.teamRole = await TeamMemberModel.getRole(teamId, req.user.id);
        next();
    } catch (err) {
        console.error('requireTeamMember error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function requireTeamAdmin(req, res, next) {
    try {
        const teamId = req.params.teamId ?? req.params.id;
        const role = await TeamMemberModel.getRole(teamId, req.user.id);
        if (!role || (role !== 'owner' && role !== 'admin')) {
            return res.status(403).json({ error: 'Недостаточно прав. Требуется роль admin или owner' });
        }
        req.teamRole = role;
        next();
    } catch (err) {
        console.error('requireTeamAdmin error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function requireTeamOwner(req, res, next) {
    try {
        const teamId = req.params.teamId ?? req.params.id;
        const role = await TeamMemberModel.getRole(teamId, req.user.id);
        if (role !== 'owner') {
            return res.status(403).json({ error: 'Только владелец команды может выполнить это действие' });
        }
        req.teamRole = role;
        next();
    } catch (err) {
        console.error('requireTeamOwner error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { requireTeamMember, requireTeamAdmin, requireTeamOwner };
