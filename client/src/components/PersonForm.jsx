import { useEffect, useState } from 'react';
import { Drawer, Form, Input, Select, Rate, Button, Space, DatePicker } from 'antd';
import dayjs from 'dayjs';
import request from '../utils/request';

const { TextArea } = Input;

export default function PersonForm({ open, person, tags, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!person;

  useEffect(() => {
    if (open) {
      if (person) {
        form.setFieldsValue({
          ...person,
          birthday: person.birthday ? dayjs(person.birthday) : null,
          tags: person.tags ? person.tags.map(t => t.id) : []
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ intimacy: 3 });
      }
    }
  }, [open, person]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload = {
        ...values,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null,
        tags: values.tags || []
      };
      if (isEdit) {
        await request.put('/persons/' + person.id, payload);
      } else {
        await request.post('/persons', payload);
      }
      onSuccess();
      onClose();
    } catch (e) {
      // validation or API error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={isEdit ? '编辑人物' : '新增人物'}
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="必填" />
        </Form.Item>
        <Form.Item name="tags" label="标签">
          <Select mode="multiple" placeholder="选择标签" allowClear>
            {tags.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="intimacy" label="亲密度">
          <Rate count={5} />
        </Form.Item>
        <Form.Item name="phone" label="电话">
          <Input placeholder="手机号" />
        </Form.Item>
        <Form.Item name="wechat" label="微信">
          <Input placeholder="微信号" />
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input placeholder="电子邮箱" />
        </Form.Item>
        <Form.Item name="birthday" label="生日">
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="city" label="城市">
          <Input placeholder="所在城市" />
        </Form.Item>
        <Form.Item name="company" label="公司">
          <Input placeholder="所在公司" />
        </Form.Item>
        <Form.Item name="position" label="职位">
          <Input placeholder="职务" />
        </Form.Item>
        <Form.Item name="resource_desc" label="资源描述">
          <TextArea rows={2} placeholder="TA能提供什么资源/能力" />
        </Form.Item>
        <Form.Item name="need_desc" label="需求描述">
          <TextArea rows={2} placeholder="TA可能需要什么" />
        </Form.Item>
        <Form.Item name="private_note" label="私域备注">
          <TextArea rows={2} placeholder="忌口、家庭情况等" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
