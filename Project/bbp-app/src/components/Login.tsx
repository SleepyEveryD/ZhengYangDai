import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BikeIcon, MapIcon } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // 简单邮箱校验
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Invalid email format");
      return;
    }

    // ✅ mock 登录成功
    console.log("Login success:", {
      email,
      password,
    });

    navigate("/map");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Invalid email format");
      return;
    }

    // ✅ mock 注册成功
    console.log("Register success:", {
      name,
      email,
      password,
    });

    navigate("/map");
  };

  const handleGuestAccess = () => {
    navigate("/map");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <BikeIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-green-600 mb-2 text-2xl font-semibold">
            Cycling Road Assistant
          </h1>
          <p className="text-gray-600">
            Smart Route Planning · Real-time Road Monitoring
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Login to record rides and contribute road conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700">
                    Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Join us to improve cycling environment together
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700">
                    Register
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Guest */}
        <div className="mt-6">
          <Button variant="outline" className="w-full h-12" onClick={handleGuestAccess}>
            <MapIcon className="w-5 h-5 mr-2" />
            Guest Mode (View Routes Only)
          </Button>
        </div>
      </div>
    </div>
  );
}
