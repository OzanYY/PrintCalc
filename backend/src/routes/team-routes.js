const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const TeamController = require('../controllers/TeamController');
const TeamModel = require('../models/TeamModel');
const { authMiddleware, requireAuth, requireActivated } = require('../middleware/auth-middleware');
const { requireTeamMember, requireTeamAdmin, requireTeamOwner } = require('../middleware/team-middleware');

const teamAvatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(teamAvatarDir)) fs.mkdirSync(teamAvatarDir, { recursive: true });

const teamAvatarUpload = multer({
    storage: multer.diskStorage({
        destination: teamAvatarDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `team_avatar_${req.params.id}_${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
    },
});

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireActivated);

// ─── Коллекция ───────────────────────────────────────────────────────────────
router.get ('/', TeamController.getMyTeams);
router.post('/', TeamController.createTeam);

// ─── Единичный ресурс ────────────────────────────────────────────────────────
router.get   ('/:id', requireTeamMember, TeamController.getTeam);
router.patch ('/:id', requireTeamAdmin,  TeamController.updateTeam);
router.delete('/:id', requireTeamOwner,  TeamController.deleteTeam);

// ─── Участники ───────────────────────────────────────────────────────────────
router.get   ('/:id/members',          requireTeamMember, TeamController.getMembers);
router.patch ('/:id/members/:userId',  requireTeamAdmin,  TeamController.updateMemberRole);
router.delete('/:id/members/:userId',  requireTeamMember, TeamController.removeMember);
router.patch ('/:id/settings/me',      requireTeamMember, TeamController.updateMySettings);

// ─── Поиск пользователей ─────────────────────────────────────────────────────
router.get('/:id/users/search', requireTeamAdmin, TeamController.searchUsers);

// ─── Приглашения ─────────────────────────────────────────────────────────────
router.post  ('/:id/invite',                 requireTeamAdmin, TeamController.invite);
router.get   ('/:id/invitations',            requireTeamAdmin, TeamController.getTeamInvitations);
router.delete('/:id/invitations/:invId',     requireTeamAdmin, TeamController.cancelInvitation);

// ─── Ресурсы команды ─────────────────────────────────────────────────────────
router.get   ('/:id/resources/printers',        requireTeamMember, TeamController.getTeamPrinters);
router.get   ('/:id/resources/materials',       requireTeamMember, TeamController.getTeamMaterials);
router.get   ('/:id/resources/my',              requireTeamMember, TeamController.getMyShared);
router.post  ('/:id/resources',                 requireTeamMember, TeamController.shareResource);
router.delete('/:id/resources/:type/:resourceId', requireTeamMember, TeamController.unshareResource);

// ─── Заказы команды ──────────────────────────────────────────────────────────
router.get('/:id/orders', requireTeamMember, TeamController.getTeamOrders);

// ─── Статистика ──────────────────────────────────────────────────────────────
router.get('/:id/stats',         requireTeamMember, TeamController.getTeamStats);
router.get('/:id/stats/members', requireTeamMember, TeamController.getMemberStats);

// ─── Аватар команды ──────────────────────────────────────────────────────────
router.post('/:id/avatar', requireTeamAdmin, teamAvatarUpload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }
    try {
        const current = await TeamModel.findById(req.params.id);
        if (current?.avatar) {
            try {
                const oldFile = path.join(teamAvatarDir, path.basename(current.avatar));
                if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            } catch { /* ignore */ }
        }
        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
        const updated = await TeamModel.updateAvatar(req.params.id, avatarUrl);
        res.json({ data: updated });
    } catch (error) {
        console.error('Upload team avatar error:', error);
        res.status(500).json({ error: 'Failed to upload team avatar' });
    }
});

module.exports = router;
