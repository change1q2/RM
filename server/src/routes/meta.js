const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');

// 全局统计
router.get('/stats', (req, res) => {
  const totalPersons = queryOne('SELECT COUNT(*) as c FROM persons').c;
  const tagDistribution = query(
    'SELECT t.id, t.name, t.color, COUNT(pt.person_id) as count FROM tags t LEFT JOIN person_tags pt ON t.id = pt.tag_id GROUP BY t.id ORDER BY count DESC, t.id'
  );
  const recentInteractions = queryOne(
    "SELECT COUNT(*) as c FROM interactions WHERE interaction_date >= date('now', '-30 days')"
  ).c;
  const totalRelationships = queryOne('SELECT COUNT(*) as c FROM relationships').c;
  res.json({
    total_persons: totalPersons,
    total_relationships: totalRelationships,
    recent_interactions: recentInteractions,
    tag_distribution: tagDistribution
  });
});

// Dashboard 首页数据
router.get('/dashboard', (req, res) => {
  const today = new Date();
  const yyyy = today.getFullYear();

  const allBirthdays = query(
    "SELECT id, name, birthday, city, company, position, intimacy, substr(birthday,6) as md FROM persons WHERE birthday IS NOT NULL AND birthday != '' AND CAST(substr(birthday,1,4) AS INTEGER) < " + yyyy + " ORDER BY md ASC LIMIT 50"
  );

  const nowMd = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const future = new Date(today.getTime() + 30 * 86400000);
  const futureMd = String(future.getMonth() + 1).padStart(2, '0') + '-' + String(future.getDate()).padStart(2, '0');
  const upcomingBirthdays = allBirthdays.filter(p => {
    if (nowMd <= futureMd) return p.md >= nowMd && p.md <= futureMd;
    return p.md >= nowMd || p.md <= futureMd;
  });

  const overdueContacts = query(
    "SELECT p.id, p.name, p.company, p.position, p.intimacy, p.last_interacted_at, p.city FROM persons p WHERE p.last_interacted_at IS NULL OR p.last_interacted_at < datetime('now', '-60 days') ORDER BY p.intimacy DESC, p.last_interacted_at ASC LIMIT 15"
  );

  const recentInteractions = query(
    "SELECT i.id, i.interaction_date, i.method, i.content, i.person_id, p.name, p.company FROM interactions i JOIN persons p ON p.id = i.person_id ORDER BY i.interaction_date DESC, i.created_at DESC LIMIT 10"
  );

  const pendingTodos = query(
    "SELECT t.id, t.content, t.is_completed, t.interaction_id, i.interaction_date, i.person_id, p.name FROM interaction_todos t JOIN interactions i ON i.id = t.interaction_id JOIN persons p ON p.id = i.person_id WHERE t.is_completed = 0 ORDER BY i.interaction_date ASC LIMIT 15"
  );

  res.json({
    upcoming_birthdays: upcomingBirthdays,
    overdue_contacts: overdueContacts,
    recent_interactions: recentInteractions,
    pending_todos: pendingTodos
  });
});

module.exports = router;
