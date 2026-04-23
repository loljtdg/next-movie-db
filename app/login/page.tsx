"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, message, Spin } from "antd";
import { UserOutlined, LockOutlined, LoadingOutlined } from "@ant-design/icons";
import axios from "axios";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);

    try {
      await axios.post("/api/login", {
        username: values.username.trim(),
        password: values.password.trim(),
      });
      
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/";
      router.replace(redirectTo);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "登录失败";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    message.error("请输入用户名和密码");
  };

  return (
    <Card
      className="w-full max-w-md shadow-2xl"
      style={{
        backgroundColor: "rgba(63, 63, 63, 0.6)",
        border: "none",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserOutlined style={{ fontSize: 20 }} />
        </div>
        <h1 className="text-2xl font-bold text-white">欢迎回来</h1>
        <p className="text-gray-400 text-sm mt-1">请登录您的账户</p>
      </div>

      <Form
        name="login"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: "请输入用户名" }]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="用户名"
            size="large"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="密码"
            size="large"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={loading ? <LoadingOutlined /> : undefined}
            style={{
              background: "linear-gradient(to right, #8b5cf6, #ec4899)",
              border: "none",
              height: "44px",
              fontSize: "16px",
            }}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
