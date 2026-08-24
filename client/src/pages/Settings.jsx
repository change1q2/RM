import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Form, Input, Button, Space, Tag, List, Popconfirm, message, Empty, Modal, ColorPicker } from 'antd';
import { LockOutlined, TagsOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import request from '../utils/request';

const { Text } = Typography;

const PRESET_COLORS = ['#5B6CFF', '#F472B6', '#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#A78BFA', '#14B8A6', '#06B6D4', '#8B5CF6', '#EC4899', '#F97316'];

export default function Settings() {
  const [pwdForm] = Form.useForm();
  const [pwdLoading, setPwdLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagForm] = Form.useForm();
  const [tagLoading, setTagLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);

  const fetchTags = () => {
    request.get('/tags').then(setTags).catch(() => {});
  };

  useEffect(() => { fetchTags(); }, []);

  const handleChangePassword = async () => {
    try {
      const values = await pwdForm.validateFields();
      if (values.new_password !== values.confirm_password) {
        return message.error('两次输入的新密码不一致');
      }
      setPwdLoading(true);
      await request.post('/auth/change-password', { old_password: values.old_password, new_password: values.new_password });
      message.success('密码修改成功');
      pwdForm.resetFields();
    } catch (e) {} finally { setPwdLoading(false); }
  };

  const openTagModal = (tag) => {
    if (tag) {
      setEditingTag(tag);
      tagForm.setFieldsValue({ name: tag.name, color: tag.color });
    } else {
      setEditingTag(null);
      tagForm.resetFields();
      tagForm.setFieldsValue({ color: PRESET_COLORS[0] });
    }
    setTagModalOpen(true);
  };

  const handleSaveTag = async () => {
    try {
      const values = await tagForm.validateFields();
      setTagLoading(true);
      const color = typeof values.color === 'string' ? values.color : (values.color?.toHexString?.() || PRESET_COLORS[0]);
      if (editingTag) {
        await request.put('/tags/' + editingTag.id, { name: values.name, color });
        message.success('标签已更新');
      } else {
        await request.post('/tags', { name: values.name, color });
        message.success('标签已创建');
      }
      setTagModalOpen(false);
      fetchTags();
    } catch (e) {} finally { setTagLoading(false); }
  };

  const handleDeleteTag = async (id) => {
    await request.delete('/tags/' + id);
    message.success('标签已删除');
    fetchTags();
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={<><LockOutlined /> 修改密码</>}>
            <Form form={pwdForm} layout="vertical">
              <Form.Item name="old_password" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
                <Input.Password placeholder="请输入原密码" />
              </Form.Item>
              <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码长度至少6位' }]}>
                <Input.Password placeholder="至少6位" />
              </Form.Item>
              <Form.Item name="confirm_password" label="确认新密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
                <Input.Password placeholder="再次输入新密码" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" loading={pwdLoading} onClick={handleChangePassword}>确认修改</Button>
                  <Button onClick={() => pwdForm.resetFields()}>重置</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title={<><TagsOutlined style={{ color: '#5B6CFF' }} /> 标签管理 ({tags.length})</>}
            extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openTagModal(null)}>新增标签</Button>}
          >
            {tags.length === 0 ? (
              <Empty description="暂无标签" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                dataSource={tags}
                renderItem={tag => (
                  <List.Item key={tag.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                      <Tag color={tag.color} style={{ margin: 0, fontSize: 13 }}>{tag.name}</Tag>
                      <Space size="small">
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openTagModal(tag)} />
                        <Popconfirm title={'删除标签「' + tag.name + '」？关联的人物将移除该标签'} onConfirm={() => handleDeleteTag(tag.id)} okText="删除" cancelText="取消">
                          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingTag ? '编辑标签' : '新增标签'}
        open={tagModalOpen}
        onOk={handleSaveTag}
        onCancel={() => setTagModalOpen(false)}
        confirmLoading={tagLoading}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={tagForm} layout="vertical">
          <Form.Item name="name" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="如：客户、朋友、合作伙伴" />
          </Form.Item>
          <Form.Item name="color" label="标签颜色" rules={[{ required: true, message: '请选择颜色' }]}>
            <ColorPicker presetColors={PRESET_COLORS} showText format="hex" />
          </Form.Item>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>预设颜色：</Text>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => tagForm.setFieldValue('color', c)}
                  style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 0 0 1px #eee' }}
                />
              ))}
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
