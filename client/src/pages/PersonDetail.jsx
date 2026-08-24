import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Typography, Tag, Rate, Button, Space, Spin, Empty,
  Descriptions, Timeline, Modal, Form, Input, Select, DatePicker, Popconfirm,
  Checkbox, Divider, message, Avatar
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  PhoneOutlined, MessageOutlined, MailOutlined, EnvironmentOutlined,
  GiftOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';
import PersonForm from '../components/PersonForm';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const RELATION_TYPES = ['同学', '同事', '前同事', '朋友', '亲戚', '客户', '合作伙伴', '引荐', '夫妻', '邻居', '师生', '同乡'];
const INTERACTION_METHODS = ['微信', '电话', '饭局', '见面', '邮件', '社群', '其他'];

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

const methodColor = (method) => {
  const map = { '微信': '#07C160', '电话': '#5B6CFF', '饭局': '#F59E0B', '见面': '#A78BFA', '邮件': '#60A5FA', '社群': '#EF4444', '其他': '#999' };
  return map[method] || '#999';
};

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [allPersons, setAllPersons] = useState([]);
  const [tags, setTags] = useState([]);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    request.get('/tags').then(setTags).catch(() => {});
  }, []);

  const [relModalOpen, setRelModalOpen] = useState(false);
  const [relForm] = Form.useForm();
  const [relLoading, setRelLoading] = useState(false);

  const [intModalOpen, setIntModalOpen] = useState(false);
  const [intForm] = Form.useForm();
  const [intLoading, setIntLoading] = useState(false);
  const [editingInt, setEditingInt] = useState(null);
  const [intTodos, setIntTodos] = useState([]);

  const fetchPerson = useCallback(async () => {
    setLoading(true);
    try {
      const [p, rels, ints] = await Promise.all([
        request.get('/persons/' + id),
        request.get('/relationships/person/' + id),
        request.get('/interactions/person/' + id)
      ]);
      setPerson(p);
      setRelationships(rels || []);
      setInteractions(ints || []);
    } catch (e) {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchPerson(); }, [fetchPerson]);

  const openRelModal = async () => {
    if (allPersons.length === 0) {
      try {
        const data = await request.get('/persons', { params: { pageSize: 9999, sortBy: 'intimacy' } });
        setAllPersons((data.list || []).filter(p => String(p.id) !== String(id)));
      } catch (e) {}
    }
    relForm.resetFields();
    relForm.setFieldsValue({ relation_type: '朋友', strength: 3 });
    setRelModalOpen(true);
  };

  const handleAddRelationship = async () => {
    try {
      const values = await relForm.validateFields();
      setRelLoading(true);
      await request.post('/relationships', {
        person_a_id: parseInt(id),
        person_b_id: values.person_b_id,
        relation_type: values.relation_type,
        strength: values.strength || 3,
        introduced_by: values.introduced_by || null
      });
      message.success('关系已建立');
      setRelModalOpen(false);
      fetchPerson();
    } catch (e) {} finally { setRelLoading(false); }
  };

  const handleDeleteRelationship = async (rid) => {
    await request.delete('/relationships/' + rid);
    message.success('关系已删除');
    fetchPerson();
  };

  const openIntModal = (record) => {
    if (record) {
      setEditingInt(record);
      intForm.setFieldsValue({
        interaction_date: dayjs(record.interaction_date),
        method: record.method,
        content: record.content
      });
      setIntTodos((record.todos || []).map(t => ({ content: t.content, is_completed: t.is_completed, id: t.id })));
    } else {
      setEditingInt(null);
      intForm.resetFields();
      intForm.setFieldsValue({ interaction_date: dayjs(), method: '微信' });
      setIntTodos([]);
    }
    setIntModalOpen(true);
  };

  const addIntTodo = () => setIntTodos([...intTodos, { content: '', is_completed: false }]);
  const removeIntTodo = (idx) => setIntTodos(intTodos.filter((_, i) => i !== idx));
  const updateIntTodo = (idx, val) => setIntTodos(intTodos.map((t, i) => i === idx ? { ...t, content: val } : t));

  const handleSaveInteraction = async () => {
    try {
      const values = await intForm.validateFields();
      setIntLoading(true);
      const payload = {
        person_id: parseInt(id),
        interaction_date: values.interaction_date.format('YYYY-MM-DD'),
        method: values.method,
        content: values.content || null,
        todos: intTodos.filter(t => t.content && t.content.trim())
      };
      if (editingInt) {
        await request.put('/interactions/' + editingInt.id, payload);
        message.success('互动记录已更新');
      } else {
        await request.post('/interactions', payload);
        message.success('互动记录已添加');
      }
      setIntModalOpen(false);
      fetchPerson();
    } catch (e) {} finally { setIntLoading(false); }
  };

  const handleDeleteInteraction = async (iid) => {
    await request.delete('/interactions/' + iid);
    message.success('互动记录已删除');
    fetchPerson();
  };

  const toggleTodo = async (interaction, todo) => {
    try {
      await request.patch('/interactions/' + interaction.id + '/todos/' + todo.id + '/toggle');
      fetchPerson();
    } catch (e) {}
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>;
  }

  if (!person) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="人物不存在" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/persons')}>返回列表</Button>
        </div>
      </div>
    );
  }

  const stats = person.stats || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/persons')}>返回</Button>
          <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>编辑</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <Avatar size={64} style={{ background: avatarColor(person.name), fontSize: 28, fontWeight: 700, flexShrink: 0 }}>
                {(person.name || '?').charAt(0)}
              </Avatar>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Title level={4} style={{ margin: 0, wordBreak: 'break-all' }}>{person.name}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{[person.company, person.position].filter(Boolean).join(' · ') || '未填写公司与职位'}</Text>
                <div style={{ marginTop: 4 }}>
                  <Rate count={5} value={person.intimacy} disabled style={{ fontSize: 14 }} />
                </div>
              </div>
            </div>

            {(person.tags || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {(person.tags || []).map(t => <Tag key={t.id} color={t.color} style={{ marginBottom: 4 }}>{t.name}</Tag>)}
              </div>
            )}

            <Descriptions column={1} size="small" labelStyle={{ width: 72, color: '#999' }}>
              {person.phone && <Descriptions.Item label={<><PhoneOutlined /> 电话</>}>{person.phone}</Descriptions.Item>}
              {person.wechat && <Descriptions.Item label={<><MessageOutlined /> 微信</>}>{person.wechat}</Descriptions.Item>}
              {person.email && <Descriptions.Item label={<><MailOutlined /> 邮箱</>}>{person.email}</Descriptions.Item>}
              {person.birthday && <Descriptions.Item label={<><GiftOutlined /> 生日</>}>{person.birthday}</Descriptions.Item>}
              {person.city && <Descriptions.Item label={<><EnvironmentOutlined /> 城市</>}>{person.city}</Descriptions.Item>}
            </Descriptions>

            <Divider style={{ margin: '12px 0' }} />

            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#5B6CFF' }}>{stats.interaction_count || 0}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>互动次数</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#34D399' }}>{stats.relationship_count || 0}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>关系数</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', marginTop: 6 }}>{formatDate(person.last_interaction_date)}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>最近联系</Text>
                </div>
              </Col>
            </Row>
          </Card>

          {(person.resource_desc || person.need_desc || person.private_note) && (
            <Card size="small" title="资源与备注" style={{ marginTop: 16 }}>
              {person.resource_desc && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>资源描述</Text>
                  <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{person.resource_desc}</Paragraph>
                </div>
              )}
              {person.need_desc && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>需求描述</Text>
                  <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{person.need_desc}</Paragraph>
                </div>
              )}
              {person.private_note && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>私域备注</Text>
                  <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{person.private_note}</Paragraph>
                </div>
              )}
            </Card>
          )}
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={<><TeamOutlined /> 关系网络 ({relationships.length})</>}
            extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openRelModal}>添加关系</Button>}
            style={{ marginBottom: 16 }}
          >
            {relationships.length === 0 ? (
              <Empty description="暂无关系记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Row gutter={[12, 12]}>
                {relationships.map(r => (
                  <Col xs={24} sm={12} key={r.id}>
                    <Card size="small" hoverable style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar style={{ background: avatarColor(r.other_name), flexShrink: 0 }}>
                          {(r.other_name || '?').charAt(0)}
                        </Avatar>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text strong style={{ cursor: 'pointer' }} onClick={() => navigate('/persons/' + r.other_id)}>{r.other_name}</Text>
                            <Tag color="blue" style={{ margin: 0 }}>{r.relation_type}</Tag>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{[r.other_company, r.other_position].filter(Boolean).join(' · ') || '—'}</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate count={5} value={r.strength} disabled style={{ fontSize: 11 }} />
                          </div>
                          {r.introducer_name && (
                            <div><Text type="secondary" style={{ fontSize: 11 }}>引荐人：{r.introducer_name}</Text></div>
                          )}
                        </div>
                      </div>
                      <Popconfirm title="删除该关系？" onConfirm={() => handleDeleteRelationship(r.id)} okText="删除" cancelText="取消">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ position: 'absolute', top: 8, right: 8 }} />
                      </Popconfirm>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

          <Card
            title={<><ClockCircleOutlined /> 互动记录 ({interactions.length})</>}
            extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openIntModal(null)}>添加记录</Button>}
          >
            {interactions.length === 0 ? (
              <Empty description="暂无互动记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Timeline
                items={interactions.map(item => ({
                  key: item.id,
                  dot: <CheckCircleOutlined style={{ color: methodColor(item.method), fontSize: 16 }} />,
                  children: (
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <Space wrap>
                          <Text strong>{dayjs(item.interaction_date).format('YYYY-MM-DD')}</Text>
                          <Tag color={methodColor(item.method)}>{item.method}</Tag>
                        </Space>
                        <Space>
                          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openIntModal(item)} />
                          <Popconfirm title="删除该记录？" onConfirm={() => handleDeleteInteraction(item.id)} okText="删除" cancelText="取消">
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                      {item.content && (
                        <Paragraph style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', color: '#333' }}>{item.content}</Paragraph>
                      )}
                      {item.todos && item.todos.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>待办：</Text>
                          <div style={{ marginTop: 2 }}>
                            {item.todos.map(todo => (
                              <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                                <Checkbox checked={todo.is_completed} onChange={() => toggleTodo(item, todo)} />
                                <Text delete={todo.is_completed} style={{ color: todo.is_completed ? '#bbb' : '#333', fontSize: 13 }}>{todo.content}</Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      <PersonForm open={formOpen} person={person} tags={tags} onClose={() => setFormOpen(false)} onSuccess={fetchPerson} />

      <Modal
        title="添加关系"
        open={relModalOpen}
        onOk={handleAddRelationship}
        onCancel={() => setRelModalOpen(false)}
        confirmLoading={relLoading}
        okText="建立关系"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={relForm} layout="vertical">
          <Form.Item name="person_b_id" label="对方" rules={[{ required: true, message: '请选择对方' }]}>
            <Select showSearch placeholder="搜索并选择人物" optionFilterProp="label" filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}>
              {allPersons.map(p => (
                <Select.Option key={p.id} value={p.id} label={p.name + (p.company ? ' · ' + p.company : '')}>
                  <Space>
                    <span>{p.name}</span>
                    {p.company && <span style={{ color: '#999', fontSize: 12 }}>· {p.company}</span>}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="relation_type" label="关系类型" rules={[{ required: true, message: '请选择关系类型' }]}>
            <Select showSearch allowClear placeholder="选择关系类型">
              {RELATION_TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="strength" label="关系强度">
            <Rate count={5} />
          </Form.Item>
          <Form.Item name="introduced_by" label="引荐人（可选）">
            <Select showSearch allowClear placeholder="选择引荐人（没有则不选）" optionFilterProp="label" filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}>
              {allPersons.map(p => (
                <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>提示：引荐人表示「{person.name}是由谁介绍认识的」。可在关系网络中追溯人脉来源。</Text>
        </Form>
      </Modal>

      <Modal
        title={editingInt ? '编辑互动记录' : '添加互动记录'}
        open={intModalOpen}
        onOk={handleSaveInteraction}
        onCancel={() => setIntModalOpen(false)}
        confirmLoading={intLoading}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form form={intForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="interaction_date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label="方式" rules={[{ required: true, message: '请选择方式' }]}>
                <Select>
                  {INTERACTION_METHODS.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label="沟通内容">
            <TextArea rows={4} placeholder="聊了什么？关键信息、承诺、下一步等" />
          </Form.Item>
          <Divider style={{ margin: '8px 0' }}>待办事项（可选）</Divider>
          {intTodos.map((t, idx) => (
            <Row key={idx} gutter={8} style={{ marginBottom: 8 }} align="middle">
              <Col flex="auto">
                <Input
                  placeholder={'待办 ' + (idx + 1)}
                  value={t.content}
                  onChange={e => updateIntTodo(idx, e.target.value)}
                />
              </Col>
              <Col flex="none">
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeIntTodo(idx)} />
              </Col>
            </Row>
          ))}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addIntTodo}>添加待办</Button>
        </Form>
      </Modal>
    </div>
  );
}
