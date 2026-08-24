const DEFAULT_TAGS = [
  { name: '亲戚', color: '#F472B6', sort_order: 1 },
  { name: '同学', color: '#60A5FA', sort_order: 2 },
  { name: '朋友', color: '#34D399', sort_order: 3 },
  { name: '合作伙伴', color: '#F59E0B', sort_order: 4 },
  { name: '客户', color: '#EF4444', sort_order: 5 },
  { name: '老公亲戚', color: '#A78BFA', sort_order: 6 },
  { name: '老公同事', color: '#14B8A6', sort_order: 7 },
  { name: '媒体圈', color: '#06B6D4', sort_order: 8 },
  { name: '投资圈', color: '#8B5CF6', sort_order: 9 },
  { name: '其他', color: '#9CA3AF', sort_order: 10 }
];

const DEFAULT_CONFIG = [
  { key: 'birthday_advance_days', value: '7,3,1' },
  { key: 'long_no_contact_days', value: '90,180,365' },
  { key: 'app_version', value: '1.0.0' }
];

module.exports = { DEFAULT_TAGS, DEFAULT_CONFIG };
