import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Input, Select, Rate, Tag, Pagination, Button, Space, Spin, Empty, Radio, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import PersonForm from '../components/PersonForm';

export default function Persons() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tags, setTags] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagLogic, setTagLogic] = useState('or');
  const [minIntimacy, setMinIntimacy] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  useEffect(() => {
    request.get('/tags').then(setTags).catch(() => {});
  }, []);

  const fetchPersons = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, pageSize,
        sortBy, sortOrder: 'desc',
        tagLogic,
        ...(keyword ? { keyword } : {}),
        ...(selectedTags.length ? { tags: selectedTags.join(',') } : {}),
        ...(minIntimacy ? { intimacy: minIntimacy } : {})
      };
      const data = await request.get('/persons', { params });
      setList(data.list || []);
      setTotal(data.total || 0);
    } catch (e) {} finally { setLoading(false); }
  }, [page, pageSize, keyword, selectedTags, tagLogic, minIntimacy, sortBy]);

  useEffect(() => { fetchPersons(); }, [fetchPersons]);

  // debounce keyword
  const [kwTimer, setKwTimer] = useState(null);
  const onKeywordChange = (val) => {
    if (kwTimer) clearTimeout(kwTimer);
    const t = setTimeout(() => { setKeyword(val); setPage(1); }, 300);
    setKwTimer(t);
  };

  const resetFilters = () => {
    setKeyword(''); setSelectedTags([]); setTagLogic('or'); setMinIntimacy(0); setSortBy('created_at'); setPage(1);
  };

  const handleDelete = async (id) => {
    await request.delete('/persons/' + id);
    message.success('删除成功');
    fetchPersons();
  };

  const avatarColor = (name) => {
    const colors = ['#5B6CFF','#F472B6','#60A5FA','#34D399','#F59E0B','#EF4444','#A78BFA','#14B8A6','#06B6D4','#8B5CF6'];
    const code = (name || '?').charCodeAt(0) || 0;
    return colors[code % colors.length];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '未联系';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 30) return diff + '天前';
    if (diff < 365) return Math.floor(diff/30) + '个月前';
    return Math.floor(diff/365) + '年前';
  };

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input prefix={<SearchOutlined />} placeholder="搜索姓名/公司/职位/资源" allowClear onChange={e => onKeywordChange(e.target.value)} />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select mode="multiple" placeholder="标签筛选" allowClear style={{ width: '100%' }} value={selectedTags} onChange={v => { setSelectedTags(v); setPage(1); }}>
              {tags.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Radio.Group value={tagLogic} onChange={e => { setTagLogic(e.target.value); setPage(1); }} size="small">
              <Radio.Button value="or">任一</Radio.Button>
              <Radio.Button value="and">全部</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <span style={{ fontSize: 12, color: '#999' }}>亲密度≥</span>
            <Rate count={5} value={minIntimacy} onChange={v => { setMinIntimacy(v); setPage(1); }} style={{ fontSize: 14 }} />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Select value={sortBy} onChange={v => { setSortBy(v); }} size="small" style={{ width: '100%' }}>
              <Select.Option value="created_at">最新创建</Select.Option>
              <Select.Option value="intimacy">亲密度</Select.Option>
              <Select.Option value="last_interacted_at">最近联系</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={resetFilters}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPerson(null); setFormOpen(true); }}>新增</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {list.length === 0 ? (
          <Empty style={{ marginTop: 60 }} description="暂无数据" />
        ) : (
          <Row gutter={[16, 16]}>
            {list.map(p => (
              <Col xs={24} sm={12} md={8} lg={6} key={p.id}>
                <Card
                  hoverable
                  size="small"
                  style={{ height: '100%' }}
                  actions={[
                    <EyeOutlined key="view" onClick={() => navigate('/persons/' + p.id)} />,
                    <EditOutlined key="edit" onClick={() => { setEditingPerson(p); setFormOpen(true); }} />,
                    <Popconfirm key="del" title="确认删除？" onConfirm={() => handleDelete(p.id)}>
                      <DeleteOutlined style={{ color: '#ff4d4f' }} />
                    </Popconfirm>
                  ]}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(p.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                      {(p.name || '?').charAt(0)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[p.company, p.position].filter(Boolean).join(' · ') || '未填写'}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Rate count={5} value={p.intimacy} disabled style={{ fontSize: 12 }} />
                  </div>
                  <div style={{ marginBottom: 8, minHeight: 22, overflow: 'hidden' }}>
                    {(p.tags || []).slice(0, 3).map(t => <Tag key={t.id} color={t.color} style={{ marginBottom: 2 }}>{t.name}</Tag>)}
                    {(p.tags || []).length > 3 && <Tag>+{p.tags.length - 3}</Tag>}
                  </div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>最近联系：{formatDate(p.last_interacted_at)}</div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {total > 0 && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Pagination current={page} total={total} pageSize={pageSize} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} showSizeChanger showTotal={t => '共 ' + t + ' 人'} pageSizeOptions={[10, 20, 50]} />
        </div>
      )}

      <PersonForm open={formOpen} person={editingPerson} tags={tags} onClose={() => setFormOpen(false)} onSuccess={fetchPersons} />
    </div>
  );
}
