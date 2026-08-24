const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db');

function buildGraph(centerId, depth) {
  const visited = new Set([centerId]);
  let currentLevel = [centerId];

  for (let d = 0; d < depth; d++) {
    if (currentLevel.length === 0) break;
    const ph = currentLevel.map(() => '?').join(',');
    const rels = query(
      'SELECT person_a_id, person_b_id FROM relationships WHERE person_a_id IN (' + ph + ') OR person_b_id IN (' + ph + ')',
      [...currentLevel, ...currentLevel]
    );
    const nextLevel = [];
    for (const r of rels) {
      if (!visited.has(r.person_a_id)) { visited.add(r.person_a_id); nextLevel.push(r.person_a_id); }
      if (!visited.has(r.person_b_id)) { visited.add(r.person_b_id); nextLevel.push(r.person_b_id); }
    }
    currentLevel = nextLevel;
  }

  const allIds = [...visited];
  if (allIds.length === 0) return { nodes: [], links: [] };
  const ph = allIds.map(() => '?').join(',');

  const persons = query('SELECT * FROM persons WHERE id IN (' + ph + ')', allIds);
  const tagRows = query(
    'SELECT pt.person_id, t.id as tag_id, t.name as tag_name, t.color as tag_color FROM person_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.person_id IN (' + ph + ')',
    allIds
  );
  const tagsMap = {};
  for (const row of tagRows) {
    if (!tagsMap[row.person_id]) tagsMap[row.person_id] = [];
    tagsMap[row.person_id].push({ id: row.tag_id, name: row.tag_name, color: row.tag_color });
  }

  const nodes = persons.map(p => ({
    id: p.id,
    name: p.name,
    company: p.company,
    position: p.position,
    intimacy: p.intimacy,
    avatar_url: p.avatar_url,
    tags: tagsMap[p.id] || [],
    is_center: p.id === centerId
  }));

  const allRels = query(
    'SELECT person_a_id, person_b_id, relation_type, strength, introduced_by FROM relationships WHERE person_a_id IN (' + ph + ') AND person_b_id IN (' + ph + ')', [...allIds, ...allIds]
  );
  const links = allRels.map(r => ({
    source: r.person_a_id,
    target: r.person_b_id,
    relation_type: r.relation_type,
    strength: r.strength,
    introduced_by: r.introduced_by
  }));

  return { nodes, links };
}

router.get('/random', (req, res) => {
  const row = queryOne(
    'SELECT p.id, p.name FROM persons p WHERE EXISTS (SELECT 1 FROM relationships r WHERE r.person_a_id = p.id OR r.person_b_id = p.id) ORDER BY RANDOM() LIMIT 1'
  );
  if (!row) return res.status(404).json({ error: '暂无有关系的人物数据' });
  res.json(row);
});

router.get('/:centerId', (req, res) => {
  const centerId = parseInt(req.params.centerId);
  const depth = Math.min(2, parseInt(req.query.depth) || 2);
  const center = queryOne('SELECT id FROM persons WHERE id = ?', [centerId]);
  if (!center) return res.status(404).json({ error: '人物不存在' });
  const data = buildGraph(centerId, depth);
  res.json(data);
});

module.exports = router;

